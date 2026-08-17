import os
from PIL import Image

icon_dir = r"c:\Users\hanso\Desktop\文發系\大四上\畢業專題\遊戲\avaka-multiplayer\static\assets\icons"

def remove_white_background(img_path):
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    # threshold for considering a pixel "white"
    threshold = 240
    
    for item in datas:
        # Check RGB values
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            # changing alpha to 0 (transparent)
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(img_path, "PNG")

if __name__ == "__main__":
    for file in os.listdir(icon_dir):
        if file.startswith("px_") and file.endswith(".png"):
            path = os.path.join(icon_dir, file)
            print(f"Processing {file}...")
            remove_white_background(path)
    print("Done!")
