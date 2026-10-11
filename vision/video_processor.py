import os
import cv2
import numpy as np
from pathlib import Path

class VideoShelfProcessor:
    def __init__(self, detector, clip_matcher=None, config=None):
        self.detector = detector
        self.clip_matcher = clip_matcher
        self.config = config or {}
        self.frame_skip = max(1, int(self.config.get("frame_skip", 3)))
        self.max_video_length_seconds = int(self.config.get("max_video_length_seconds", 120))
        self.resize_width = int(self.config.get("resize_width", 1280))

    def process_video(self, input_video_path, output_video_path, products=None):
        if not os.path.exists(input_video_path):
            raise FileNotFoundError(f"Input video not found: {input_video_path}")

        if products:
            self.detector.update_classes(products)

        cap = cv2.VideoCapture(input_video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Could not open video file: {input_video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        duration = total_frames / fps if fps > 0 else 0

        if duration > self.max_video_length_seconds:
            cap.release()
            raise ValueError(
                f"Video duration ({duration:.1f}s) exceeds maximum allowed {self.max_video_length_seconds}s"
            )

        orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1280)
        orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 720)

        if orig_w > self.resize_width:
            out_w = self.resize_width
            out_h = int(orig_h * (self.resize_width / orig_w))
        else:
            out_w = orig_w
            out_h = orig_h

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_video_path, fourcc, fps / self.frame_skip, (out_w, out_h))

        frame_idx = 0
        processed_count = 0

        # Simultaneous visible instances per frame: product_frame_counts[pid] = [c1, c2, ...]
        product_frame_counts = {p["id"]: [] for p in (products or [])}
        product_max_conf = {p["id"]: 0.0 for p in (products or [])}
        unrecognized_list = []

        print(f"[VIDEO] Processing video {input_video_path}: {total_frames} frames, FPS: {fps:.1f}, skip: {self.frame_skip}")

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % self.frame_skip != 0:
                frame_idx += 1
                continue

            if (out_w, out_h) != (orig_w, orig_h):
                frame = cv2.resize(frame, (out_w, out_h))

            # Detect on current frame using detector
            counts, unrec, annotated_frame, visible_items, all_detections, shelf_summary = self.detector.detect_image(
                frame,
                products=products,
                clip_matcher=self.clip_matcher
            )

            # Record simultaneous visible counts for this specific frame
            for pid, pdata in counts.items():
                c = pdata["count"]
                product_frame_counts[pid].append(c)
                if pdata["confidence"] > product_max_conf[pid]:
                    product_max_conf[pid] = pdata["confidence"]

            # Also track all dynamically seen shelf items across frames
            if not hasattr(self, '_visible_seen_tracker'):
                self._visible_seen_tracker = {}

            for v in visible_items:
                v_name = v["name"]
                if v_name not in self._visible_seen_tracker:
                    self._visible_seen_tracker[v_name] = {
                        "name": v_name,
                        "category": v.get("category", "General Retail"),
                        "max_count": v["count"],
                        "confidence": v["confidence"],
                        "shelf_level": v.get("shelf_level", "Middle Shelf"),
                        "color": v.get("color", "#10b981"),
                        "is_registered": v.get("is_registered", False),
                        "product_id": v.get("product_id")
                    }
                else:
                    self._visible_seen_tracker[v_name]["max_count"] = max(
                        self._visible_seen_tracker[v_name]["max_count"], v["count"]
                    )
                    self._visible_seen_tracker[v_name]["confidence"] = max(
                        self._visible_seen_tracker[v_name]["confidence"], v["confidence"]
                    )

            if unrec and len(unrecognized_list) < 15:
                unrecognized_list.extend(unrec[:3])

            # Header on video
            cv2.rectangle(annotated_frame, (10, 8), (470, 36), (20, 20, 20), -1)
            cv2.putText(annotated_frame, "ShelfSight Live Tracking (Simultaneous Count)", (16, 26),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 240, 160), 1)

            out.write(annotated_frame)
            processed_count += 1
            frame_idx += 1

        cap.release()
        out.release()

        # Compute peak simultaneous visible count per product (NEVER sum across frames)
        final_counts = {}
        for p in (products or []):
            pid = p["id"]
            counts_series = product_frame_counts.get(pid, [])
            stable_count = max(counts_series) if counts_series else 0

            final_counts[pid] = {
                "product_id": pid,
                "name": p.get("name"),
                "sku": p.get("sku"),
                "min_visible_stock": p.get("min_visible_stock", 3),
                "count": stable_count,
                "confidence": product_max_conf.get(pid, 0.85)
            }

        # Convert tracked visible items to list
        final_visible_items = []
        if hasattr(self, '_visible_seen_tracker'):
            for v_name, v_data in self._visible_seen_tracker.items():
                final_visible_items.append({
                    "name": v_name,
                    "category": v_data["category"],
                    "count": v_data["max_count"],
                    "confidence": v_data["confidence"],
                    "shelf_level": v_data["shelf_level"],
                    "color": v_data["color"],
                    "is_registered": v_data["is_registered"],
                    "product_id": v_data["product_id"]
                })
            self._visible_seen_tracker = {}

        stats = {
            "total_frames": total_frames,
            "processed_frames": processed_count,
            "fps": fps,
            "duration_seconds": round(duration, 2),
            "counting_method": "peak_simultaneous_visible_per_shelf_view"
        }

        return final_counts, unrecognized_list, stats, final_visible_items
