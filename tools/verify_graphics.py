from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = (
    ROOT / "assets" / "characters-v1" / "part-time-pharmacist-walk-v1.png",
    ROOT / "assets" / "characters-v1" / "beginner-pharmacist-walk-v1.png",
    ROOT / "assets" / "objects" / "vitamin-display-v1.png",
    ROOT / "assets" / "items" / "won-token-v1.png",
    ROOT / "assets" / "backgrounds" / "pharmacy-defense-board-v1.png",
)

for path in ASSETS:
    with Image.open(path) as image:
        alpha = image.getchannel("A").getextrema() if "A" in image.getbands() else "opaque"
        print(f"{path.relative_to(ROOT)}: size={image.size}, mode={image.mode}, alpha={alpha}")
