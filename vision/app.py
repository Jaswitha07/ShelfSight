import os
import io
import json
import base64
import cv2
import yaml
import numpy as np
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from detector import ShelfDetector
from clip_matcher import ClipReferenceMatcher
from video_processor import VideoShelfProcessor
from demo_generator import generate_sample_shelf_image, generate_sample_video, generate_reference_images

app = FastAPI(title="ShelfSight Vision AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load configuration
config_file = Path(__file__).parent / "config.yaml"
config = {}
if config_file.exists():
    with open(config_file, "r") as f:
        config = yaml.safe_load(f) or {}

detector = ShelfDetector(config_path="config.yaml")
clip_matcher = ClipReferenceMatcher(config=config, on_loaded=detector.attach_clip)
video_processor = VideoShelfProcessor(detector, clip_matcher=clip_matcher, config=config)

# Pre-cache reference images
demo_dir = Path(__file__).parent.parent / "backend" / "uploads" / "demo"
if demo_dir.exists() and clip_matcher.enabled:
    ref_map = {
        "prod-001": demo_dir / "red_chips.png",
        "prod-002": demo_dir / "blue_chips.png",
        "prod-003": demo_dir / "lime_soda.png",
        "prod-004": demo_dir / "cola_bottle.png",
        "prod-005": demo_dir / "cereal_oat.png"
    }
    for pid, pth in ref_map.items():
        if pth.exists():
            clip_matcher.cache_product_reference(pid, str(pth))

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "detector_ready": detector.is_ready,
        "clip_ready": clip_matcher.is_ready,
        "model_path": detector.model_path,
        "device": detector.device,
        "cached_classes": detector.cached_prompts
    }

@app.get("/config")
def get_config():
    return config

@app.post("/detect/image")
async def detect_image(
    file: UploadFile = File(...),
    products_json: str = Form("[]")
):
    if not detector.is_ready:
        raise HTTPException(
            status_code=503,
            detail=detector.error_message or "Vision detector model is not ready."
        )

    try:
        products = json.loads(products_json)
    except Exception:
        products = []

    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img_bgr is None:
            raise HTTPException(status_code=400, detail="Invalid image file format")

        counts, unrecognized, annotated_bgr, visible_items, all_detections, shelf_summary = detector.detect_image(
            img_bgr,
            products=products,
            clip_matcher=clip_matcher
        )

        # Encode annotated image to Base64 JPEG
        ret, buf = cv2.imencode('.jpg', annotated_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
        annotated_base64 = base64.b64encode(buf).decode('utf-8')

        return {
            "success": True,
            "counts": counts,
            "visible_items": visible_items,
            "all_detections": all_detections,
            "shelf_summary": shelf_summary,
            "unrecognized": unrecognized,
            "annotated_image_base64": annotated_base64,
            "image_width": int(img_bgr.shape[1]),
            "image_height": int(img_bgr.shape[0])
        }
    except Exception as e:
        print(f"[VISION ERROR] /detect/image failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image detection failed: {str(e)}")

@app.post("/detect/video")
async def detect_video(
    file: UploadFile = File(...),
    products_json: str = Form("[]")
):
    if not detector.is_ready:
        raise HTTPException(
            status_code=503,
            detail=detector.error_message or "Vision detector model is not ready."
        )

    try:
        products = json.loads(products_json)
    except Exception:
        products = []

    temp_dir = Path(__file__).parent.parent / "backend" / "uploads"
    temp_dir.mkdir(parents=True, exist_ok=True)

    input_filename = f"temp_in_{file.filename}"
    output_filename = f"annotated_{file.filename}"
    input_path = temp_dir / input_filename
    output_path = temp_dir / output_filename

    try:
        with open(input_path, "wb") as f:
            contents = await file.read()
            f.write(contents)

        counts, unrecognized, stats, visible_items = video_processor.process_video(
            str(input_path),
            str(output_path),
            products=products
        )

        return {
            "success": True,
            "counts": counts,
            "visible_items": visible_items,
            "unrecognized": unrecognized,
            "annotated_video_filename": output_filename,
            "tracking_summary": stats
        }
    except Exception as e:
        print(f"[VISION ERROR] /detect/video failed: {e}")
        raise HTTPException(status_code=500, detail=f"Video detection failed: {str(e)}")
    finally:
        if input_path.exists():
            try:
                os.remove(input_path)
            except Exception:
                pass

@app.post("/generate/demo")
def generate_demo():
    try:
        demo_path = Path(__file__).parent.parent / "backend" / "uploads" / "demo"
        img_p = str(demo_path / "sample_shelf.jpg")
        vid_p = str(demo_path / "sample_shelf.mp4")
        shelf = generate_sample_shelf_image(img_p)
        generate_reference_images(str(demo_path))
        generate_sample_video(shelf, vid_p)
        return {"success": True, "message": "Demo assets regenerated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
