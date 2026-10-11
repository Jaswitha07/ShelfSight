# ShelfSight: AI-Powered Real-Time Retail Shelf Inventory Monitoring System

> **ShelfSight** is an enterprise-grade retail inventory monitoring platform powered by Ultralytics YOLO-World v2 open-vocabulary computer vision. It autonomously detects shelf stock levels, tallies visible inventory in real time, alerts store operations on stockout transitions, and monitors camera streams without requiring cloud computer-vision APIs.

---

## 📑 Table of Contents
1. [System Overview & Honesty Disclosures](#system-overview--honesty-disclosures)
2. [Key Capabilities](#key-capabilities)
3. [Architecture & Technology Stack](#architecture--technology-stack)
4. [Folder Structure](#folder-structure)
5. [Prerequisites & Environment Setup](#prerequisites--environment-setup)
6. [Environment Variables](#environment-variables)
7. [Database Setup & Seeding](#database-setup--seeding)
8. [Running the Application](#running-the-application)
9. [Demonstration & Simulated Feeds](#demonstration--simulated-feeds)
10. [Testing Image & Video Detection](#testing-image--video-detection)
11. [Live CCTV & RTSP Stream Handling](#live-cctv--rtsp-stream-handling)
12. [Inventory Rules & Alert State Machine](#inventory-rules--alert-state-machine)
13. [Custom Model Fine-Tuning Instructions](#custom-model-fine-tuning-instructions)
14. [Limitations & Future Roadmap](#limitations--future-roadmap)

---

## ⚠️ System Overview & Honesty Disclosures

To ensure operational transparency for retail managers, ShelfSight adheres to the following ground-truth operational principles:

1. **Visible Shelf Stock Only:** ShelfSight monitors physical products within the optical line-of-sight of the camera. It cannot measure rear stock obscured behind facing packages without multi-angle or depth sensors.
2. **Open-Vocabulary Detection Trade-offs:** The built-in YOLO-World v2 model provides zero-shot open-vocabulary detection using natural-language prompt descriptions without training. While versatile, a bespoke fine-tuned model yields higher precision in crowded shelves with identical packaging.
3. **Simultaneous Visible Instances:** Bounding box tallies reflect simultaneous visible items present per camera frame at inspection time, not cumulative customer picks or daily sales velocity.

---

## 🚀 Key Capabilities

- **Zero-Shot Object Detection:** Detects arbitrary retail packaging using natural text prompts (e.g., `"green tea can"`, `"red chips packet"`, `"cereal box"`) with YOLO-World v2.
- **CLIP Feature Verification:** Optional cosine-similarity verification using OpenCLIP ViT-B/32 comparing candidate crops to catalog reference photos.
- **Simultaneous Count Rule Engine:**
  - `detected_count == 0` &rarr; **`OUT_OF_STOCK`** (Critical Alert)
  - `detected_count <= min_visible_stock` &rarr; **`LOW_STOCK`** (Warning Alert)
  - `detected_count > min_visible_stock` &rarr; **`NORMAL`** (Healthy Stock)
- **Transition-Only Alerting:** Alerts are generated strictly when a product's state transitions into `LOW_STOCK` or `OUT_OF_STOCK`, preventing alert fatigue across frames.
- **Live Stream Security & Masking:** RTSP passwords and authentication credentials are encrypted server-side and masked before client transmission (`rtsp://****:****@host:port/stream`).
- **Simulated Demonstration Mode:** Includes synthetic shelf image and video generation using OpenCV/PIL with distinct product graphics and an empty section for offline demonstration.
- **Responsive Retail SaaS UI:** Built with React 18, Vite, Tailwind CSS, Lucide icons, and Recharts, supporting desktop, tablet, and mobile displays with self-scrolling data tables.

---

## 🏛️ Architecture & Technology Stack

```mermaid
graph TD
    Client["Frontend SPA (React 18 + Vite + Tailwind CSS)"] -->|JWT Bearer REST| Backend["Backend API (Express 4 + Node.js)"]
    Backend -->|SQL Queries| DB[("Embedded PGlite / PostgreSQL DB")]
    Backend -->|Multipart Form Data| Vision["Vision AI Service (Python FastAPI)"]
    Vision -->|Weights| YOLO["Ultralytics YOLO-World v2 (yolov8s-worldv2.pt)"]
    Vision -->|Optional Verification| CLIP["OpenCLIP (ViT-B/32)"]
    RTSP["CCTV / RTSP Stream / Simulated MP4"] -->|Frame Feed| Vision
```

### Components
- **Frontend:** React 18, Vite, React Router v6, Tailwind CSS, Recharts, Lucide Icons.
- **Backend:** Express 4 (ES Modules), JWT, BcryptJS, Zod input validation, Multer file upload validation, Helmet, CORS.
- **Database:** Embedded PGlite (PostgreSQL engine in WebAssembly/Node, zero external installation required) with seamless fallback to external PostgreSQL / Supabase.
- **Vision Engine:** Python 3.11+, FastAPI, Ultralytics YOLO-World v2, PyTorch, OpenCV, OpenCLIP.

---

## 📂 Folder Structure

```
ShelfSight/
├── backend/                  # Node.js Express REST API
│   ├── data/                 # Embedded PGlite database storage
│   ├── src/
│   │   ├── config/           # Environment configuration loader
│   │   ├── db/               # Database client (PGlite / PostgreSQL) & seed runner
│   │   ├── middleware/       # JWT auth, error handling, file upload filters, Zod validation
│   │   ├── routes/           # Auth, Products, Shelves, Cameras, Inventory, Alerts, Vision
│   │   ├── services/         # Inventory state machine, Notifier interface, Vision HTTP client
│   │   └── index.js          # Server bootstrap
│   ├── tests/                # Automated gate verification test suite
│   └── uploads/              # Uploaded shelf photos, videos, and annotated media
├── database/
│   ├── schema.sql            # PostgreSQL DDL table schemas, indexes, foreign keys
│   └── seeds.sql             # Demo products, shelves, cameras, and test history
├── frontend/                 # React 18 + Vite Web Application
│   ├── src/
│   │   ├── components/       # Layout, Sidebar, Header, HonestyBanner, Common widgets
│   │   ├── context/          # AuthContext (JWT session management)
│   │   ├── pages/            # Dashboard, LiveMonitoring, ImageAnalysis, VideoAnalysis,
│   │   │                     # Products, Cameras, Inventory, Alerts, Settings, Login, Register
│   │   └── services/         # Axios API clients
│   ├── index.html            # Vite HTML entry point
│   ├── tailwind.config.js    # Tailwind theme & tokens
│   └── vite.config.js        # Reverse proxy config for /api and /uploads
├── vision/                   # Python FastAPI Computer Vision Microservice
│   ├── app.py                # FastAPI endpoints (/health, /detect/image, /detect/video)
│   ├── clip_matcher.py       # OpenCLIP reference image verification
│   ├── config.yaml           # Detection thresholds, NMS IoU, model path
│   ├── demo_generator.py     # Programmatic OpenCV/PIL demo shelf image/video generator
│   ├── detector.py           # YOLO-World v2 inference wrapper
│   └── video_processor.py    # Multi-frame video processor with frame skipping & tracking
├── .env.example              # Environment variable template
├── package.json              # Root project runner scripts
├── run-all.js                # One-command runner for all 3 services
└── yolov8s-worldv2.pt        # Local YOLO-World v2 model weights
```

---

## 🔧 Prerequisites & Environment Setup

### 1. System Requirements
- Node.js v18.0.0 or higher
- Python 3.10 or higher with virtualenv support
- Local weights file: `yolov8s-worldv2.pt` (included in workspace root)

### 2. Python Vision Environment Setup
```bash
# If not already created:
python -m venv vision_venv
# Windows:
.\vision_venv\Scripts\activate
# Install requirements:
pip install -r vision/requirements.txt
```

### 3. Node Dependencies Installation
```bash
# Install backend dependencies:
cd backend && npm install

# Install frontend dependencies:
cd ../frontend && npm install
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` in the root or `backend/` directory:

```env
PORT=5000
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=shelfsight_super_secret_jwt_key_change_in_production_2026
VISION_URL=http://localhost:8000

# Optional external PostgreSQL connection string.
# Leave blank to automatically use zero-config embedded PGlite:
DATABASE_URL=
```

---

## 🗄️ Database Setup & Seeding

ShelfSight uses embedded PGlite by default—requiring zero external database installations or cloud setup!

To initialize tables and populate sample products, cameras, and demo shelf items:

```bash
# From workspace root:
npm run seed

# Or from backend/:
cd backend
npm run seed
```

This provisions:
- Demo store manager account: `manager@shelfsight.store` / `password123`
- Retail shelves across Aisles 1, 2, and 3
- Catalog items with open-vocabulary prompt definitions
- Simulated RTSP cameras and initial baseline inventory snapshots

---

## 🚦 Running the Application

### Option A: Run All Services Simultaneously (Recommended)
From the project root directory:
```bash
npm start
# OR: node run-all.js
```
This spawns:
- Vision Microservice on `http://localhost:8000`
- Backend REST API on `http://localhost:5000`
- Frontend Development Server on `http://localhost:5173`

### Option B: Run Services Individually
```bash
# Terminal 1 - Vision AI Service:
.\vision_venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8000 --app-dir vision

# Terminal 2 - Backend REST API:
cd backend
npm start

# Terminal 3 - Frontend UI:
cd frontend
npm run dev
```

Open your browser to: **`http://localhost:5173`**
Log in with:
- **Email:** `manager@shelfsight.store`
- **Password:** `password123`
*(Or click "Auto-fill Demo Credentials" on the login screen).*

---

## 🎬 Demonstration & Simulated Feeds

To demonstrate the full detection and live monitoring pipeline without physical store cameras:

1. **Generate Demo Shelf Media (Offline Programmatic):**
   ```bash
   .\vision_venv\Scripts\python.exe vision/demo_generator.py
   ```
   This generates:
   - `backend/uploads/demo/sample_shelf.jpg` (Shelf with 4 Crunchy Red Chips, 2 Sour Cream Blue Chips [Low Stock], 5 Sparkling Lime Cans, 4 Cola Bottles, 3 Cereal Boxes, and an empty middle row).
   - `backend/uploads/demo/sample_shelf.mp4` (5-second 100-frame video test clip).
   - Product catalog reference packaging images.

2. **Test In The Browser:**
   - Navigate to **Image Analysis** &rarr; Click **"Load Demo Sample"** &rarr; Click **"Analyze Shelf Image"**.
   - Navigate to **Video Analysis** &rarr; Click **"Load Demo Video"** &rarr; Click **"Process Shelf Video"**.
   - Navigate to **Live Monitoring** &rarr; Select `"Shelf Demo Cam A"` &rarr; Click **"Start Live Feed"** to observe simulated live camera bounding boxes.

---

## 🧪 Testing Image & Video Detection

### Via Web Interface
1. Navigate to **Image Analysis** in the sidebar.
2. Upload any retail shelf photo or use the sample image.
3. Select the associated Camera and Shelf.
4. View the original vs. annotated output side-by-side, along with detected counts, status badges, and bounding box coordinates.

### Via REST API (cURL)
```bash
# 1. Obtain JWT:
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@shelfsight.store","password":"password123"}'

# 2. Upload Shelf Image:
curl -X POST http://localhost:5000/api/vision/image \
  -H "Authorization: Bearer <TOKEN>" \
  -F "image=@backend/uploads/demo/sample_shelf.jpg" \
  -F "shelf_id=shelf-001"
```

---

## 📹 Live CCTV, Physical Webcams & Online Camera Stream Handling

ShelfSight provides dynamic real-time vision inference across physical device cameras, public online streams, and RTSP feeds:

### 1. Physical Device Webcam (Real Hardware Camera)
- Select **"Local Device Webcam"** on the [Live Monitoring](http://localhost:5173/live) page.
- Streams real-time video directly from your laptop or USB webcam via HTML5 `getUserMedia`.
- As you present products (bottles, soda cans, chips bags, cereal boxes) to your webcam, YOLO-World detects items dynamically in real time and updates HUD bounding boxes and stock statuses.

### 2. Online Public Streams & IP Cameras
- Connect to any publicly accessible IP camera, RTSP proxy, or online video stream (MP4, HLS, WebM, MJPEG).
- Pre-configured with public supermarket and retail test feeds:
  - *Online Retail Aisle 1 (Live Public Stream)*
  - *Online Supermarket Shelf (Public CCTV Stream)*
- Click **"Add Custom Stream URL"** to paste any external IP camera URL.

### 3. Dynamic Real-Time YOLO-World Inference Loop
- When live monitoring is active, an automated background loop extracts live frames from the video canvas and passes them to the YOLO-World vision microservice.
- Dynamic bounding boxes, simultaneous counts, and stock transitions (`NORMAL`, `LOW_STOCK`, `OUT_OF_STOCK`) adapt live to whatever appears on camera.
- Configurable inference scan frequency: **Every 1.0s, 2.0s, 3.0s, 5.0s**, or on-demand via the **"Scan Now"** button.

### 4. Security & Fault-Tolerance
- **Stream URL Masking:** When cameras are configured with RTSP URLs containing authentication (e.g., `rtsp://admin:pass123@192.168.1.100:554/live`), credentials are stored securely on the server and returned to the client masked as `rtsp://****:****@192.168.1.100:554/live`.
- **Fault-Tolerant Offline Transition:** If an IP camera becomes unreachable or a stream fails, the camera is gracefully switched to `offline` status, and a `CAMERA_OFFLINE` alert is created without crashing the server.
- **Simulated Stream URL Protocol:** Cameras can also use `simulated://uploads/demo/sample_shelf.mp4` to loop offline demo shelf recordings.

---

## 📊 Inventory Rules & Alert State Machine

```mermaid
stateDiagram-v2
    [*] --> Observation: Camera Frame Scanned
    Observation --> NORMAL: count > min_visible_stock
    Observation --> LOW_STOCK: 0 < count <= min_visible_stock
    Observation --> OUT_OF_STOCK: count == 0

    NORMAL --> LOW_STOCK: Transitions Below Min -> Creates Warning Alert
    LOW_STOCK --> OUT_OF_STOCK: Transitions to Zero -> Creates Critical Alert
    OUT_OF_STOCK --> NORMAL: Restocked -> Resolves Alert
    LOW_STOCK --> LOW_STOCK: Duplicate Scan -> No Duplicate Alert
    OUT_OF_STOCK --> OUT_OF_STOCK: Duplicate Scan -> No Duplicate Alert
```

- Each analysis persists: `product_id`, `detected_count`, `detection_time`, `camera_id`, `shelf_id`, `confidence`, and `status`.
- Alerts support full in-app lifecycle: `new` &rarr; `read` &rarr; `resolved`.

---

## 🛠️ Custom Model Fine-Tuning Instructions

If you wish to replace the zero-shot YOLO-World model with a model custom-trained on your specific product stock:

1. **Collect Photos:** Capture 50–100 photos per product under realistic retail lighting. Include varying angles, partial occlusions, and shelf heights.
2. **Annotation Format:** Label images using standard YOLO format (`class_id x_center y_center width height` normalized between 0 and 1).
3. **Dataset Config (`dataset.yaml`):**
   ```yaml
   path: ./retail_dataset
   train: images/train
   val: images/val
   names:
     0: crunchy_red_chips
     1: sour_cream_blue_chips
     2: lime_soda_can
   ```
4. **Train Model:**
   ```bash
   yolo detect train data=dataset.yaml model=yolov8s.pt epochs=50 imgsz=640 batch=16
   ```
5. **Deploy Trained Weights:**
   Update `vision/config.yaml` or change the model path in **System Settings**:
   ```yaml
   model_path: "runs/detect/train/weights/best.pt"
   ```

---

## 🔮 Limitations & Future Roadmap

### Current Limitations
1. **Front-Facing Occlusion:** Packages behind front-row items cannot be detected when using standard 2D RGB cameras.
2. **Zero-Shot Ambiguity:** Visually indistinguishable brand variants with tiny text labels require high-resolution 4K frames or bespoke fine-tuning.
3. **Bandwidth in Multi-Stream Deployments:** Processing 10+ simultaneous 30 FPS cameras requires hardware video decoding or multi-second frame skip schedules.

### Future Roadmap
- **3D Depth Sensor Integration:** Combine RGB with Time-of-Flight (ToF) cameras to estimate shelf depth and row fullness.
- **Automated Supplier Webhooks:** Trigger automated REST webhooks to ERP/supplier systems (SAP, Oracle Retail) upon verified stockouts.
- **Edge Deployment on Jetson/NPU:** Package vision microservice with TensorRT acceleration for on-device edge computing on NVIDIA Jetson.
