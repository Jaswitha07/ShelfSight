import os
import cv2
import threading
import torch
import numpy as np
from PIL import Image
from pathlib import Path

class ClipReferenceMatcher:
    def __init__(self, config=None, on_loaded=None):
        self.config = config or {}
        self.on_loaded = on_loaded
        self.enabled = self.config.get("use_reference_matching", True)
        self.clip_threshold = float(self.config.get("clip_threshold", 0.60))
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = None
        self.preprocess = None
        self.tokenizer = None
        self.reference_cache = {}  # { productId: normalized_tensor_embedding }
        self.is_ready = False
        self.is_loading = False

        if self.enabled:
            self._load_clip()

    def _load_clip(self):
        try:
            import open_clip
            print("[CLIP] Loading cached open_clip ViT-B-32...")
            model, _, preprocess = open_clip.create_model_and_transforms(
                'ViT-B-32',
                pretrained='laion2b_s34b_b79k',
                device=self.device
            )
            self.model = model
            self.preprocess = preprocess
            self.tokenizer = open_clip.get_tokenizer('ViT-B-32')
            self.model.eval()
            self.is_ready = True
            print("[CLIP] open_clip ViT-B-32 loaded successfully.")

            if self.on_loaded:
                self.on_loaded(self.model, self.tokenizer)
        except Exception as e:
            print(f"[CLIP WARN] Could not initialize open_clip ({e}). Stage 1 YOLO-World active.")
            self.is_ready = False

    def cache_product_reference(self, product_id, image_path):
        if not self.is_ready or not self.enabled:
            return

        try:
            if not os.path.exists(image_path):
                return
            img = Image.open(image_path).convert('RGB')
            img_tensor = self.preprocess(img).unsqueeze(0).to(self.device)
            with torch.no_grad():
                embedding = self.model.encode_image(img_tensor)
                embedding /= embedding.norm(dim=-1, keepdim=True)
            self.reference_cache[product_id] = embedding
            print(f"[CLIP] Cached reference embedding for product {product_id}")
        except Exception as e:
            print(f"[CLIP WARN] Failed to cache reference for {product_id}: {e}")

    def match_crop(self, crop_bgr, candidate_product_ids=None):
        if not self.is_ready or not self.enabled or not self.reference_cache:
            return None, 0.0

        try:
            crop_rgb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(crop_rgb)
            tensor = self.preprocess(pil_img).unsqueeze(0).to(self.device)

            with torch.no_grad():
                crop_embedding = self.model.encode_image(tensor)
                crop_embedding /= crop_embedding.norm(dim=-1, keepdim=True)

            best_id = None
            max_sim = 0.0

            targets = candidate_product_ids if candidate_product_ids else self.reference_cache.keys()

            for pid in targets:
                if pid in self.reference_cache:
                    ref_emb = self.reference_cache[pid]
                    similarity = float(torch.matmul(crop_embedding, ref_emb.T).item())
                    if similarity > max_sim:
                        max_sim = similarity
                        best_id = pid

            if max_sim >= self.clip_threshold:
                return best_id, max_sim
            return None, max_sim
        except Exception as e:
            print(f"[CLIP WARN] Error during crop matching: {e}")
            return None, 0.0
