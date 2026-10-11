-- ShelfSight Database Schema
-- Supabase and PostgreSQL compatible

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'store_manager',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Shelves table
CREATE TABLE IF NOT EXISTS shelves (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Cameras table
CREATE TABLE IF NOT EXISTS cameras (
    camera_id VARCHAR(64) PRIMARY KEY,
    camera_name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    stream_url VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'offline',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    min_visible_stock INTEGER NOT NULL DEFAULT 3,
    shelf_id VARCHAR(64) REFERENCES shelves(id) ON DELETE SET NULL,
    reference_image VARCHAR(500),
    detection_prompt VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Inventory snapshots table (stores per-product observation at each run)
CREATE TABLE IF NOT EXISTS inventory_snapshots (
    snapshot_id VARCHAR(64) PRIMARY KEY,
    camera_id VARCHAR(64) REFERENCES cameras(camera_id) ON DELETE SET NULL,
    shelf_id VARCHAR(64) REFERENCES shelves(id) ON DELETE SET NULL,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
    detected_count INTEGER NOT NULL,
    min_visible_stock INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'OUT_OF_STOCK', 'LOW_STOCK', 'NORMAL'
    confidence REAL DEFAULT 0.0,
    image_url VARCHAR(500),
    source_type VARCHAR(50) DEFAULT 'image', -- 'image', 'video', 'live'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Detections table (individual bounding boxes per analysis run)
CREATE TABLE IF NOT EXISTS detections (
    detection_id VARCHAR(64) PRIMARY KEY,
    snapshot_id VARCHAR(64) REFERENCES inventory_snapshots(snapshot_id) ON DELETE CASCADE,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
    label VARCHAR(150) NOT NULL,
    confidence REAL NOT NULL,
    box_x1 REAL NOT NULL,
    box_y1 REAL NOT NULL,
    box_x2 REAL NOT NULL,
    box_y2 REAL NOT NULL,
    track_id INTEGER,
    is_recognized BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    alert_id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'OUT_OF_STOCK', 'LOW_STOCK', 'CAMERA_OFFLINE'
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
    camera_id VARCHAR(64) REFERENCES cameras(camera_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'new', -- 'new', 'read', 'resolved'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_shelf ON products(shelf_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

CREATE INDEX IF NOT EXISTS idx_snapshots_product ON inventory_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created ON inventory_snapshots(created_at);
CREATE INDEX IF NOT EXISTS idx_snapshots_camera ON inventory_snapshots(camera_id);

CREATE INDEX IF NOT EXISTS idx_detections_snapshot ON detections(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_detections_product ON detections(product_id);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_product ON alerts(product_id);
