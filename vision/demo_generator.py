import os
import cv2
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

def create_product_graphic(w, h, color, title, subtitle):
    """Generates an image of a retail product package with distinct color and clear label."""
    img = np.zeros((h, w, 3), dtype=np.uint8)
    img[:] = color

    # Add border / bevel
    cv2.rectangle(img, (0, 0), (w - 1, h - 1), (max(0, color[0] - 40), max(0, color[1] - 40), max(0, color[2] - 40)), 3)
    cv2.rectangle(img, (6, 6), (w - 7, h - 7), (min(255, color[0] + 50), min(255, color[1] + 50), min(255, color[2] + 50)), 2)

    # Label box
    label_h = int(h * 0.45)
    label_y = int(h * 0.28)
    cv2.rectangle(img, (10, label_y), (w - 10, label_y + label_h), (255, 255, 255), -1)
    cv2.rectangle(img, (10, label_y), (w - 10, label_y + label_h), (50, 50, 50), 1)

    # Text
    cv2.putText(img, title, (14, label_y + 26), cv2.FONT_HERSHEY_DUPLEX, 0.52, (20, 20, 20), 2)
    cv2.putText(img, subtitle, (14, label_y + 48), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (80, 80, 80), 1)

    # Nutrition / barcode simulation
    cv2.rectangle(img, (15, h - 25), (w - 15, h - 12), (240, 240, 240), -1)
    for bx in range(20, w - 20, 6):
        cv2.line(img, (bx, h - 24), (bx, h - 13), (0, 0, 0), 2)

    return img

def draw_shelf_beams(shelf_img, shelf_y_coords, title="SHELF SECTION - VISIBLE STOCK MONITORING"):
    for sy in shelf_y_coords:
        # Wooden / metal shelf beam
        cv2.rectangle(shelf_img, (40, sy), (1240, sy + 28), (140, 110, 80), -1)
        cv2.rectangle(shelf_img, (40, sy + 24), (1240, sy + 28), (90, 70, 50), -1)
        # Price tag rail
        cv2.rectangle(shelf_img, (40, sy + 28), (1240, sy + 44), (200, 200, 200), -1)
        cv2.putText(shelf_img, title, (60, sy + 40), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (50, 50, 50), 1)

def generate_sample_shelf_image(output_path):
    """Draws a retail shelf with snacks, chips, lime soda, and cereals."""
    w, h = 1280, 720
    shelf_img = np.full((h, w, 3), (235, 235, 230), dtype=np.uint8)

    draw_shelf_beams(shelf_img, [320, 620], "AISLE 1 - SNACKS & CONFECTIONERY")

    # Top Shelf (y: 120 to 320):
    # 4 Crunchy Red Chips ("red chips packet")
    red_color = (40, 40, 215)
    for i in range(4):
        item = create_product_graphic(110, 180, red_color, "RED CHIPS", "Crunchy Salted")
        x = 90 + i * 135
        y = 320 - 180
        shelf_img[y:y+180, x:x+110] = item

    # 2 Sour Cream Blue Chips ("blue chips packet")
    blue_color = (210, 110, 30)
    for i in range(2):
        item = create_product_graphic(110, 180, blue_color, "BLUE CHIPS", "Sour Cream")
        x = 680 + i * 135
        y = 320 - 180
        shelf_img[y:y+180, x:x+110] = item

    # Bottom Shelf (y: 420 to 620):
    # 5 Sparkling Lime Soda ("green soda can")
    green_color = (40, 180, 60)
    for i in range(5):
        item = create_product_graphic(85, 170, green_color, "LIME SODA", "Zero Calorie")
        x = 90 + i * 105
        y = 620 - 170
        shelf_img[y:y+170, x:x+85] = item

    # Empty bay
    cv2.putText(shelf_img, "[OUT OF STOCK BAY: ORGANIC COLA]", (650, 530),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 150), 1)

    # 1 Purple Snack Dip
    purple_color = (180, 40, 160)
    mystery_item = create_product_graphic(100, 160, purple_color, "PURPLE DIP", "Imported")
    shelf_img[620-160:620, 920:1020] = mystery_item

    # 2 Yellow Cereal Boxes
    yellow_color = (40, 200, 220)
    for i in range(2):
        item = create_product_graphic(80, 180, yellow_color, "OAT CEREAL", "Honey Crisp")
        x = 1060 + i * 90
        y = 620 - 180
        shelf_img[y:y+180, x:x+80] = item

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cv2.imwrite(output_path, shelf_img)
    return shelf_img

def generate_sample_beverage_shelf(output_path):
    """Draws a supermarket beverage cooler shelf."""
    w, h = 1280, 720
    shelf_img = np.full((h, w, 3), (225, 235, 240), dtype=np.uint8)

    draw_shelf_beams(shelf_img, [320, 620], "AISLE 2 - BEVERAGES & CHILLED DRINKS")

    # Top Shelf: Sparkling Lime Soda & Citrus Cans (6 units)
    lime_color = (40, 180, 60)
    for i in range(6):
        item = create_product_graphic(80, 170, lime_color, "LIME SODA", "Can 330ml")
        x = 90 + i * 95
        y = 320 - 170
        shelf_img[y:y+170, x:x+80] = item

    # Top Shelf right: Energy Drink Cans (4 units)
    orange_color = (20, 140, 230)
    for i in range(4):
        item = create_product_graphic(80, 170, orange_color, "ENERGY DRINK", "Citrus Boost")
        x = 750 + i * 105
        y = 320 - 170
        shelf_img[y:y+170, x:x+80] = item

    # Bottom Shelf: Organic Cola Bottles (5 units)
    cola_color = (25, 25, 45)
    for i in range(5):
        item = create_product_graphic(85, 185, cola_color, "ORG COLA", "Classic Bottle")
        x = 90 + i * 110
        y = 620 - 185
        shelf_img[y:y+185, x:x+85] = item

    # Bottom Shelf right: Mineral Water Bottles (5 units)
    water_color = (220, 160, 40)
    for i in range(5):
        item = create_product_graphic(80, 185, water_color, "SPRING WATER", "500ml Bottle")
        x = 720 + i * 100
        y = 620 - 185
        shelf_img[y:y+185, x:x+80] = item

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cv2.imwrite(output_path, shelf_img)
    return shelf_img

def generate_sample_grocery_shelf(output_path):
    """Draws a breakfast cereal and pantry goods shelf."""
    w, h = 1280, 720
    shelf_img = np.full((h, w, 3), (230, 230, 225), dtype=np.uint8)

    draw_shelf_beams(shelf_img, [320, 620], "AISLE 3 - BREAKFAST CEREALS & PANTRY")

    # Top Shelf: Honey Oat Cereal Boxes (4 units)
    yellow_color = (40, 200, 220)
    for i in range(4):
        item = create_product_graphic(110, 190, yellow_color, "OAT CEREAL", "Honey Crisp")
        x = 100 + i * 140
        y = 320 - 190
        shelf_img[y:y+190, x:x+110] = item

    # Top Shelf right: Chocolate Muesli Boxes (3 units)
    brown_color = (40, 70, 130)
    for i in range(3):
        item = create_product_graphic(110, 190, brown_color, "CHOC MUESLI", "Whole Grain")
        x = 750 + i * 140
        y = 320 - 190
        shelf_img[y:y+190, x:x+110] = item

    # Bottom Shelf: Pasta Boxes (4 units)
    blue_box_color = (190, 90, 40)
    for i in range(4):
        item = create_product_graphic(100, 175, blue_box_color, "PENNE PASTA", "500g Box")
        x = 100 + i * 130
        y = 620 - 175
        shelf_img[y:y+175, x:x+100] = item

    # Bottom Shelf right: Tomato Sauce Jars (5 units)
    red_sauce_color = (30, 40, 190)
    for i in range(5):
        item = create_product_graphic(80, 160, red_sauce_color, "TOMATO SAUCE", "Herb & Garlic")
        x = 720 + i * 95
        y = 620 - 160
        shelf_img[y:y+160, x:x+80] = item

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cv2.imwrite(output_path, shelf_img)
    return shelf_img

def generate_reference_images(output_dir):
    """Generates individual reference image icons for registered products."""
    os.makedirs(output_dir, exist_ok=True)
    products = [
        ("red_chips.png", (40, 40, 215), "RED CHIPS", "Crunchy Salted"),
        ("blue_chips.png", (210, 110, 30), "BLUE CHIPS", "Sour Cream"),
        ("lime_soda.png", (40, 180, 60), "LIME SODA", "Zero Calorie"),
        ("cola_bottle.png", (20, 20, 40), "ORG COLA", "Classic Soda"),
        ("cereal_oat.png", (40, 200, 220), "OAT CEREAL", "Honey Crisp")
    ]
    for filename, color, title, sub in products:
        path = os.path.join(output_dir, filename)
        img = create_product_graphic(160, 220, color, title, sub)
        cv2.imwrite(path, img)

def generate_sample_video(base_shelf_image, output_video_path, cam_title="CAM-01 [SNACKS AISLE]", duration_seconds=5, fps=20):
    """Creates a simulated live camera feed video by panning and adding realistic CCTV noise."""
    os.makedirs(os.path.dirname(output_video_path), exist_ok=True)
    h, w = base_shelf_image.shape[:2]
    total_frames = int(duration_seconds * fps)

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (w, h))

    for i in range(total_frames):
        t = i / total_frames
        dx = int(np.sin(t * np.pi * 2) * 8)
        dy = int(np.cos(t * np.pi * 2) * 4)

        M = np.float32([[1, 0, dx], [0, 1, dy]])
        frame = cv2.warpAffine(base_shelf_image, M, (w, h), borderMode=cv2.BORDER_REFLECT)

        # Subtle CCTV timestamp overlay
        cv2.putText(frame, f"{cam_title} LIVE - REC 2026-10 FRAME {i:04d}",
                    (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (40, 40, 40), 2)

        out.write(frame)

    out.release()
    print(f"[DEMO] Generated video at {output_video_path}")

def generate_all_presets():
    demo_dir = Path(__file__).parent.parent / "backend" / "uploads" / "demo"
    os.makedirs(demo_dir, exist_ok=True)

    img_1 = str(demo_dir / "sample_shelf.jpg")
    vid_1 = str(demo_dir / "sample_shelf.mp4")
    shelf1 = generate_sample_shelf_image(img_1)
    generate_sample_video(shelf1, vid_1, "CAM-01 [SNACK AISLE]")

    img_2 = str(demo_dir / "sample_beverage_shelf.jpg")
    vid_2 = str(demo_dir / "sample_beverage_shelf.mp4")
    shelf2 = generate_sample_beverage_shelf(img_2)
    generate_sample_video(shelf2, vid_2, "CAM-02 [BEVERAGE COOLER]")

    img_3 = str(demo_dir / "sample_grocery_shelf.jpg")
    vid_3 = str(demo_dir / "sample_grocery_shelf.mp4")
    shelf3 = generate_sample_grocery_shelf(img_3)
    generate_sample_video(shelf3, vid_3, "CAM-03 [CEREALS & PANTRY]")

    generate_reference_images(str(demo_dir))
    print("[DEMO] All 3 shelf presets generated successfully!")

if __name__ == "__main__":
    generate_all_presets()
