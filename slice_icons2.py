import os
from PIL import Image

image_path = 'C:/Users/Sazu akheni dot com/Documents/image layer/ai-layer-extractor/frontend/public/instructions.png'
out_dir = 'C:/Users/Sazu akheni dot com/Documents/image layer/ai-layer-extractor/frontend/public/icons'
os.makedirs(out_dir, exist_ok=True)

img = Image.open(image_path)
width, height = img.size

cols = 5
rows = 4
margin_top = 65
margin_left = 15
margin_right = 15
margin_bottom = 15

grid_w = width - margin_left - margin_right
grid_h = height - margin_top - margin_bottom

cell_w = grid_w / cols
cell_h = grid_h / rows

count = 0
for r in range(rows):
    for c in range(cols):
        if count >= 19:
            break
        
        x1 = margin_left + c * cell_w
        y1 = margin_top + r * cell_h
        x2 = x1 + cell_w
        y2 = y1 + cell_h
        
        pad_x = 2
        pad_y = 2
        box = (int(x1+pad_x), int(y1+pad_y), int(x2-pad_x), int(y2-pad_y))
        
        cropped = img.crop(box)
        cropped.save(os.path.join(out_dir, f'inst_{count}.png'))
        count += 1

print(f"Successfully generated {count} icons for 5 columns.")
