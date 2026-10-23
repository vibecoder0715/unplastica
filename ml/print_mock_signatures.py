from PIL import Image
import numpy as np

mock_files = {
    'box_cutlery': 'apps/web/public/assets/habits/box-cutlery.png',
    'recycle_bags': 'apps/web/public/assets/habits/recycle-bags.png',
    'self_bottle_refill': 'apps/web/public/assets/habits/self-bottle-refill.png',
    'greenery_furniture': 'apps/web/public/assets/habits/greenery-furniture.png',
    'handicraft_projects': 'apps/web/public/assets/habits/handicraft-projects.png'
}

def get_hash(im):
    gray = im.convert('L').resize((9, 8))
    arr = np.array(gray, dtype=float)
    dh = ''.join(['1' if b else '0' for b in (arr[:, 1:] > arr[:, :-1]).flatten()])
    gray8 = im.convert('L').resize((8, 8))
    arr8 = np.array(gray8, dtype=float)
    ah = ''.join(['1' if b else '0' for b in (arr8 > arr8.mean()).flatten()])
    return dh, ah

for k, path in mock_files.items():
    dh, ah = get_hash(Image.open(path))
    print(f'  {k}: {{ d: "{dh}", a: "{ah}" }},')
