-- ShelfSight Initial / Demo Seeds
-- Sample Shelves
INSERT INTO shelves (id, name, location) VALUES
('shelf-001', 'Aisle 1 - Snack Shelf Top', 'Snack Aisle - Section A'),
('shelf-002', 'Aisle 1 - Beverage Cooler', 'Beverage Section - Door 2'),
('shelf-003', 'Aisle 2 - Breakfast Cereal', 'Cereal Section - Bay 3')
ON CONFLICT (id) DO NOTHING;

-- Sample Cameras (Pre-available shelf cameras ready to check)
INSERT INTO cameras (camera_id, camera_name, location, stream_url, status) VALUES
('cam-001', 'Shelf Cam 1 - Snack & Chips Rack (Aisle 1)', 'Aisle 1 Section A', '/uploads/demo/sample_shelf.mp4', 'online'),
('cam-002', 'Shelf Cam 2 - Beverages Cooler (Aisle 2)', 'Beverage Cooler Bay 2', '/uploads/demo/sample_beverage_shelf.mp4', 'online'),
('cam-003', 'Shelf Cam 3 - Breakfast & Cereals (Aisle 3)', 'Cereal Section Bay 3', '/uploads/demo/sample_grocery_shelf.mp4', 'online'),
('cam-004', 'Shelf Cam 4 - Device Webcam (Physical Shelf)', 'Storefront Local Station', 'webcam://local', 'online'),
('cam-005', 'Shelf Cam 5 - Supermarket Aisle (Live Feed)', 'Main Retail Hall', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'online')
ON CONFLICT (camera_id) DO UPDATE SET
  camera_name = EXCLUDED.camera_name,
  location = EXCLUDED.location,
  stream_url = EXCLUDED.stream_url,
  status = EXCLUDED.status;

-- Sample Products
-- Products with detection_prompt describing visible shelf appearance
INSERT INTO products (id, name, category, sku, min_visible_stock, shelf_id, reference_image, detection_prompt, is_active) VALUES
('prod-001', 'Crunchy Red Chips', 'Snacks', 'SKU-CHIP-RED-01', 4, 'shelf-001', '/uploads/demo/red_chips.png', 'red chips packet', true),
('prod-002', 'Sour Cream Blue Chips', 'Snacks', 'SKU-CHIP-BLU-02', 3, 'shelf-001', '/uploads/demo/blue_chips.png', 'blue chips packet', true),
('prod-003', 'Sparkling Lime Soda Can', 'Beverages', 'SKU-SODA-LME-03', 5, 'shelf-002', '/uploads/demo/lime_soda.png', 'green soda can', true),
('prod-004', 'Organic Cola Bottle', 'Beverages', 'SKU-COLA-ORG-04', 3, 'shelf-002', '/uploads/demo/cola_bottle.png', 'dark soda bottle', true),
('prod-005', 'Honey Oat Cereal Box', 'Breakfast', 'SKU-CER-OAT-05', 3, 'shelf-003', '/uploads/demo/cereal_oat.png', 'yellow cereal box', true)
ON CONFLICT (id) DO NOTHING;

-- Sample Inventory Snapshots
INSERT INTO inventory_snapshots (snapshot_id, camera_id, shelf_id, product_id, detected_count, min_visible_stock, status, confidence, image_url, source_type, created_at) VALUES
('snap-001', 'cam-001', 'shelf-001', 'prod-001', 6, 4, 'NORMAL', 0.92, '/uploads/demo/sample_shelf.jpg', 'image', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('snap-002', 'cam-001', 'shelf-001', 'prod-002', 2, 3, 'LOW_STOCK', 0.88, '/uploads/demo/sample_shelf.jpg', 'image', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('snap-003', 'cam-002', 'shelf-002', 'prod-003', 8, 5, 'NORMAL', 0.95, '/uploads/demo/sample_shelf.jpg', 'simulated', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('snap-004', 'cam-002', 'shelf-002', 'prod-004', 0, 3, 'OUT_OF_STOCK', 0.0, '/uploads/demo/sample_shelf.jpg', 'simulated', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('snap-005', 'cam-003', 'shelf-003', 'prod-005', 4, 3, 'NORMAL', 0.90, '/uploads/demo/sample_shelf.jpg', 'image', CURRENT_TIMESTAMP - INTERVAL '3 hours')
ON CONFLICT (snapshot_id) DO NOTHING;

-- Sample Alerts (transition alerts)
INSERT INTO alerts (alert_id, type, product_id, camera_id, message, status, created_at) VALUES
('alt-001', 'LOW_STOCK', 'prod-002', 'cam-001', 'Sour Cream Blue Chips is LOW on stock (2 visible, threshold is 3)', 'new', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('alt-002', 'OUT_OF_STOCK', 'prod-004', 'cam-002', 'Organic Cola Bottle is OUT OF STOCK on Beverage Cooler (0 visible, threshold is 3)', 'new', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('alt-003', 'CAMERA_OFFLINE', NULL, 'cam-003', 'Camera Cam 03 - Cereal Shelf went offline', 'read', CURRENT_TIMESTAMP - INTERVAL '3 hours')
ON CONFLICT (alert_id) DO NOTHING;
