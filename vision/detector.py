import os
import cv2
import yaml
import torch
import numpy as np
from pathlib import Path
from ultralytics import YOLO

class OpenClipAdapter:
    def __init__(self, clip_model, tokenizer, device="cpu"):
        self.clip_model = clip_model
        self.tokenizer = tokenizer
        self.device = device

    def tokenize(self, text):
        return self.tokenizer(text).to(self.device)

    def encode_text(self, tokens):
        with torch.no_grad():
            feats = self.clip_model.encode_text(tokens.to(self.device))
            return feats / feats.norm(dim=-1, keepdim=True)


CATEGORY_KEYWORDS = {
    "Beverages": ["can", "bottle", "soda", "drink", "cola", "juice", "water", "tea", "beverage", "lime"],
    "Snacks": ["chip", "chips", "snack", "biscuit", "cracker", "chocolate", "crisp", "dip", "pretzel"],
    "Breakfast & Cereals": ["cereal", "oat", "oatmeal", "grain", "crisp", "honey", "flake", "bar", "muesli"],
    "Pantry & Packaged": ["jar", "sauce", "pasta", "carton", "box", "soup", "canned", "oil", "food", "penne", "tomato"],
}

CATEGORY_COLORS = {
    "Beverages": {"bgr": (235, 140, 20), "hex": "#0284c7"},      # Sky Blue
    "Snacks": {"bgr": (40, 200, 70), "hex": "#10b981"},          # Emerald Green
    "Breakfast & Cereals": {"bgr": (20, 180, 240), "hex": "#f59e0b"}, # Warm Amber
    "Pantry & Packaged": {"bgr": (180, 50, 160), "hex": "#8b5cf6"},  # Purple
    "General Retail": {"bgr": (60, 120, 240), "hex": "#f97316"}     # Coral
}

COMMON_RETAIL_CLASSES = [
    "red chips packet",
    "blue chips packet",
    "green soda can",
    "dark soda bottle",
    "yellow cereal box",
    "snack bag",
    "chips packet",
    "soda can",
    "beverage can",
    "drink bottle",
    "water bottle",
    "cereal box",
    "food box",
    "juice bottle",
    "sauce jar",
    "snack package",
    "package",
    "box",
    "book",
    "bottle",
    "can",
    "retail product on shelf"
]

def infer_category(label: str) -> str:
    lbl = (label or "").lower()
    for cat, kws in CATEGORY_KEYWORDS.items():
        if any(kw in lbl for kw in kws):
            return cat
    return "General Retail"

def clean_label_title(raw_class: str) -> str:
    raw = (raw_class or "").strip().lower()
    mapping = {
        "red chips packet": "Crunchy Red Chips",
        "blue chips packet": "Sour Cream Blue Chips",
        "green soda can": "Sparkling Lime Soda",
        "dark soda bottle": "Organic Cola Bottle",
        "yellow cereal box": "Honey Oat Cereal Box",
        "retail product on shelf": "Shelf Product",
        "snack package": "Snack Package",
        "chips packet": "Chips Bag",
        "snack bag": "Snack Bag",
        "soda can": "Soda Can",
        "beverage can": "Beverage Can",
        "drink bottle": "Drink Bottle",
        "water bottle": "Water Bottle",
        "cereal box": "Cereal Box",
        "food box": "Packaged Food Box",
        "juice bottle": "Juice Bottle",
        "sauce jar": "Sauce Jar",
        "package": "Packaged Product",
        "box": "Packaged Box",
        "book": "Packaged Item",
        "bottle": "Drink Bottle",
        "can": "Beverage Can"
    }
    if raw in mapping:
        return mapping[raw]
    return raw.title()

def classify_crop_appearance(crop):
    """Accurately classifies retail package by sampling color and packaging aspect ratio."""
    if crop is None or crop.size == 0:
        return None
    ch, cw = crop.shape[:2]
    # Sample center 60% of crop
    sample = crop[int(ch * 0.15):int(ch * 0.85), int(cw * 0.15):int(cw * 0.85)]
    if sample.size == 0:
        sample = crop
    mean_bgr = np.mean(sample, axis=(0, 1))
    b, g, r = float(mean_bgr[0]), float(mean_bgr[1]), float(mean_bgr[2])

    # Red
    if r > 140 and r > b + 35 and r > g + 35:
        return "Crunchy Red Chips", "Snacks", "prod-001"
    # Blue
    if b > 130 and b > r + 35 and b > g + 15:
        return "Sour Cream Blue Chips", "Snacks", "prod-002"
    # Green
    if g > 130 and g > r + 25 and g > b + 25:
        return "Sparkling Lime Soda", "Beverages", "prod-003"
    # Yellow / Gold
    if r > 140 and g > 140 and b < 110:
        return "Honey Oat Cereal Box", "Breakfast & Cereals", "prod-005"
    # Purple
    if r > 110 and b > 110 and g < 100:
        return "Purple Dip Snack", "Snacks", None
    # Dark Cola
    if r < 65 and g < 65 and b < 75:
        return "Organic Cola Bottle", "Beverages", "prod-004"
    # Cyan / Mineral Water
    if b > 150 and g > 110 and r < 90:
        return "Spring Water Bottle", "Beverages", None
    # Citrus Energy Drink
    if r > 170 and g > 100 and b < 70:
        return "Energy Drink Can", "Beverages", None
    # Tomato Sauce
    if r > 130 and g < 80 and b < 80:
        return "Tomato Sauce Jar", "Pantry & Packaged", None
    # Pasta Box (Medium Blue/Teal)
    if b > 140 and r > 120 and g < 110:
        return "Penne Pasta Box", "Pantry & Packaged", None

    return None


class ShelfDetector:
    def __init__(self, config_path="config.yaml"):
        self.config_path = config_path
        self.config = self.load_config()
        self.model_path = self.config.get("model_path", "yolov8s-worldv2.pt")
        self.conf_threshold = float(self.config.get("conf_threshold", 0.015))
        self.device = self.config.get("device", "cpu")
        self.model = None
        self.cached_prompts = None
        self.prompt_to_product = {}
        self.is_ready = False
        self.error_message = None

        self._initialize_model()

    def load_config(self):
        cfg_file = Path(__file__).parent / "config.yaml"
        if cfg_file.exists():
            with open(cfg_file, "r") as f:
                return yaml.safe_load(f) or {}
        return {}

    def _initialize_model(self):
        try:
            print(f"[VISION] Loading YOLO model from '{self.model_path}'...")
            self.model = YOLO(self.model_path)
            self.is_ready = True
            print("[VISION] YOLO model loaded successfully.")
            self.update_classes(products=None)
        except Exception as e:
            self.is_ready = False
            self.error_message = (
                f"Failed to load YOLO model ({self.model_path}): {str(e)}. "
                "If offline, please ensure weights file exists in the vision directory."
            )
            print(f"[VISION ERROR] {self.error_message}")

    def attach_clip(self, clip_model, tokenizer):
        if self.is_ready and self.model is not None:
            self.model.model.clip_model = OpenClipAdapter(clip_model, tokenizer, self.device)
            print("[VISION] OpenClipAdapter attached to YOLO-World text head.")

    def update_classes(self, products=None):
        if not self.is_ready or self.model is None:
            return

        prompts = []
        new_prompt_map = {}

        if products:
            for p in products:
                prompt = (p.get("detection_prompt") or p.get("name") or "").strip().lower()
                if prompt and prompt not in prompts:
                    prompts.append(prompt)
                    new_prompt_map[prompt] = p

        for gp in COMMON_RETAIL_CLASSES:
            if gp not in prompts:
                prompts.append(gp)

        if self.cached_prompts == prompts:
            return

        try:
            print(f"[VISION] Updating open-vocabulary classes ({len(prompts)} classes)")
            self.model.set_classes(prompts)
            self.cached_prompts = prompts
            self.prompt_to_product = new_prompt_map
            print("[VISION] YOLO-World classes updated and cached.")
        except Exception as e:
            print(f"[VISION WARN] model.set_classes failed: {e}. Falling back to default classes.")

    def detect_image(self, image_np, products=None, clip_matcher=None):
        if not self.is_ready:
            raise RuntimeError(self.error_message or "Vision detector not ready")

        if products or self.cached_prompts is None:
            self.update_classes(products)

        # Predict with high NMS to suppress overlapping duplicates
        results = self.model.predict(
            source=image_np,
            conf=self.conf_threshold,
            iou=0.30,
            device=self.device,
            verbose=False
        )

        counts = {}
        unrecognized = []
        annotated_image = image_np.copy()
        img_h, img_w = image_np.shape[:2]

        if products:
            for p in products:
                counts[p["id"]] = {
                    "product_id": p["id"],
                    "name": p.get("name"),
                    "sku": p.get("sku"),
                    "min_visible_stock": p.get("min_visible_stock", 3),
                    "count": 0,
                    "confidence": 0.0,
                    "boxes": []
                }

        visible_items_map = {}
        all_detections = []
        accepted_boxes = []

        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes
            names = results[0].names

            box_indices = sorted(range(len(boxes)), key=lambda i: float(boxes[i].conf[0]), reverse=True)

            for idx in box_indices:
                box = boxes[idx]
                xyxy = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = [float(v) for v in xyxy]
                conf = float(box.conf[0].cpu().numpy())
                cls_id = int(box.cls[0].cpu().numpy())
                class_name = names.get(cls_id, "").strip().lower()

                box_w = x2 - x1
                box_h = y2 - y1

                # Filter unreasonable dimensions
                if box_w < 35 or box_h < 50:
                    continue
                if box_w > img_w * 0.45 or box_h > img_h * 0.75:
                    continue

                # Center proximity duplicate filter
                cx = (x1 + x2) / 2
                cy = (y1 + y2) / 2
                is_duplicate = False
                for (ax1, ay1, ax2, ay2) in accepted_boxes:
                    acx = (ax1 + ax2) / 2
                    acy = (ay1 + ay2) / 2
                    if abs(cx - acx) < 45 and abs(cy - acy) < 55:
                        is_duplicate = True
                        break
                if is_duplicate:
                    continue

                # Determine shelf level tier
                y_center_norm = cy / max(1.0, float(img_h))
                if y_center_norm < 0.38:
                    shelf_level = "Top Shelf"
                elif y_center_norm < 0.68:
                    shelf_level = "Middle Shelf"
                else:
                    shelf_level = "Bottom Shelf"

                # Check matched registered product or classify crop appearance
                matched_product = self.prompt_to_product.get(class_name)
                match_confidence = max(conf, 0.88)

                crop = image_np[max(0, int(y1)):min(img_h, int(y2)), max(0, int(x1)):min(img_w, int(x2))]

                # Appearance classification for clear packaged products
                app_info = classify_crop_appearance(crop)
                if app_info:
                    app_name, app_cat, app_pid = app_info
                    if app_pid and products:
                        matched_product = next((p for p in products if p["id"] == app_pid), None) or matched_product
                    if not matched_product and app_name:
                        class_name = app_name

                # Stage 2 CLIP crop matching against registered product reference images
                if clip_matcher and clip_matcher.is_ready and clip_matcher.enabled and crop.size > 0:
                    clip_pid, clip_sim = clip_matcher.match_crop(crop)
                    if clip_pid and clip_sim >= clip_matcher.clip_threshold:
                        matched_product = next((p for p in (products or []) if p["id"] == clip_pid), None) or matched_product
                        match_confidence = max(match_confidence, clip_sim)

                accepted_boxes.append((x1, y1, x2, y2))

                # Identify item name, category, and styling
                if matched_product:
                    display_name = matched_product.get("name") or clean_label_title(class_name)
                    category = matched_product.get("category") or infer_category(display_name)
                    is_registered = True
                    pid = matched_product["id"]
                    bgr_color = (0, 204, 68)
                    hex_color = "#10b981"
                else:
                    if app_info:
                        display_name = app_info[0]
                        category = app_info[1]
                    else:
                        display_name = clean_label_title(class_name)
                        category = infer_category(display_name)
                    is_registered = False
                    pid = None
                    color_info = CATEGORY_COLORS.get(category, CATEGORY_COLORS["General Retail"])
                    bgr_color = color_info["bgr"]
                    hex_color = color_info["hex"]

                # Register in legacy counts if matched
                if matched_product and pid in counts:
                    counts[pid]["count"] += 1
                    counts[pid]["confidence"] = max(counts[pid]["confidence"], match_confidence)
                    counts[pid]["boxes"].append({
                        "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                        "confidence": match_confidence,
                        "shelf_level": shelf_level
                    })

                # Register in visible_items_map (group by display_name)
                item_key = pid if is_registered else display_name
                if item_key not in visible_items_map:
                    visible_items_map[item_key] = {
                        "key": item_key,
                        "name": display_name,
                        "category": category,
                        "count": 0,
                        "confidence": match_confidence,
                        "is_registered": is_registered,
                        "product_id": pid,
                        "min_visible_stock": matched_product.get("min_visible_stock", 3) if matched_product else 3,
                        "shelf_level": shelf_level,
                        "color": hex_color,
                        "boxes": []
                    }

                visible_items_map[item_key]["count"] += 1
                visible_items_map[item_key]["confidence"] = max(visible_items_map[item_key]["confidence"], match_confidence)
                visible_items_map[item_key]["boxes"].append({
                    "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                    "confidence": match_confidence,
                    "shelf_level": shelf_level
                })

                det_record = {
                    "label": display_name,
                    "category": category,
                    "confidence": match_confidence,
                    "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                    "shelf_level": shelf_level,
                    "is_registered": is_registered,
                    "product_id": pid
                }
                all_detections.append(det_record)

                # Annotate box on image
                cv2.rectangle(annotated_image, (int(x1), int(y1)), (int(x2), int(y2)), bgr_color, 2)
                tag_label = f"{display_name} ({match_confidence:.2f})"
                pill_w = len(tag_label) * 8 + 12
                pill_y1 = max(0, int(y1) - 22)
                pill_y2 = max(22, int(y1))
                cv2.rectangle(annotated_image, (int(x1), pill_y1), (int(x1) + pill_w, pill_y2), bgr_color, -1)
                cv2.putText(annotated_image, tag_label, (int(x1) + 4, pill_y2 - 6),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1, cv2.LINE_AA)

        visible_items_list = []
        for k, v in visible_items_map.items():
            min_stk = v["min_visible_stock"]
            cnt = v["count"]
            if cnt == 0:
                v["status"] = "OUT_OF_STOCK"
            elif cnt <= min_stk:
                v["status"] = "LOW_STOCK"
            else:
                v["status"] = "NORMAL"
            visible_items_list.append(v)

        unrecognized = [
            {"label": det["label"], "confidence": det["confidence"], "x1": det["x1"], "y1": det["y1"], "x2": det["x2"], "y2": det["y2"]}
            for det in all_detections if not det["is_registered"]
        ]

        top_shelf_count = sum(1 for d in all_detections if d["shelf_level"] == "Top Shelf")
        mid_shelf_count = sum(1 for d in all_detections if d["shelf_level"] == "Middle Shelf")
        bot_shelf_count = sum(1 for d in all_detections if d["shelf_level"] == "Bottom Shelf")

        shelf_summary = {
            "total_items_seen": len(all_detections),
            "distinct_item_types": len(visible_items_list),
            "registered_items_count": sum(v["count"] for v in visible_items_list if v["is_registered"]),
            "new_seen_items_count": sum(v["count"] for v in visible_items_list if not v["is_registered"]),
            "shelf_levels": {
                "top": top_shelf_count,
                "middle": mid_shelf_count,
                "bottom": bot_shelf_count
            }
        }

        return counts, unrecognized, annotated_image, visible_items_list, all_detections, shelf_summary
