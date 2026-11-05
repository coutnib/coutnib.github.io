"""Background removal (ONNX models, runs locally), cutouts, colors and outfit collages."""
import io
import threading

import numpy as np
import requests
from PIL import Image, ImageFilter, ImageOps

from .storage import MODELS

try:  # iPhone HEIC photos, if pillow-heif is installed
    from pillow_heif import register_heif_opener
    register_heif_opener()
except Exception:
    pass

_REL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/"
IMAGENET = ((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
HALF = ((0.5, 0.5, 0.5), (1.0, 1.0, 1.0))
BG_MODELS = {
    "isnet-general-use": dict(url=_REL + "isnet-general-use.onnx", size=1024, norm=HALF,
                              label="Recommended - clean edges (179 MB download)"),
    "u2net": dict(url=_REL + "u2net.onnx", size=320, norm=IMAGENET,
                  label="Classic general model (176 MB)"),
    "u2netp": dict(url=_REL + "u2netp.onnx", size=320, norm=IMAGENET,
                   label="Tiny & fast, rougher edges (5 MB)"),
    "birefnet-general-lite": dict(url=_REL + "BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx",
                                  size=1024, norm=IMAGENET, sigmoid=True,
                                  label="Best quality, slower (224 MB)"),
}

status = {"state": "idle", "model": None, "progress": 0.0, "error": None}
_sessions = {}
_lock = threading.Lock()


def _ensure_model(name):
    path = MODELS / f"{name}.onnx"
    if path.exists() and path.stat().st_size > 100_000:
        return path
    status.update(state="downloading", model=name, progress=0.0, error=None)
    tmp = path.with_suffix(".part")
    with requests.get(BG_MODELS[name]["url"], stream=True, timeout=60) as r:
        r.raise_for_status()
        total, done = int(r.headers.get("content-length") or 0), 0
        with open(tmp, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
                done += len(chunk)
                if total:
                    status["progress"] = done / total
    tmp.replace(path)
    return path


def get_session(name):
    import onnxruntime as ort
    if name not in BG_MODELS:
        name = "isnet-general-use"
    with _lock:
        if name not in _sessions:
            try:
                path = _ensure_model(name)
                status.update(state="loading", model=name)
                _sessions[name] = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
            except Exception as e:
                status.update(state="error", model=name, error=str(e))
                raise
        status.update(state="ready", model=name, progress=1.0, error=None)
        return _sessions[name]


def predict_mask(img, model):
    """Return an 'L' mask (white = keep) the same size as img."""
    info = BG_MODELS.get(model) or BG_MODELS["isnet-general-use"]
    sess = get_session(model)
    s = info["size"]
    a = np.asarray(img.convert("RGB").resize((s, s), Image.LANCZOS)).astype(np.float32)
    a = a / max(float(a.max()), 1e-6)
    mean, std = (np.array(v, np.float32) for v in info["norm"])
    a = ((a - mean) / std).transpose(2, 0, 1)[None].astype(np.float32)
    out = sess.run(None, {sess.get_inputs()[0].name: a})[0][:, 0, :, :]
    if info.get("sigmoid"):
        out = 1.0 / (1.0 + np.exp(-out))
    out = (out - out.min()) / max(float(out.max() - out.min()), 1e-6)
    m = np.squeeze(out)
    # tidy: drop faint haze, make the solid part fully opaque
    m = np.clip((m - 0.06) / 0.88, 0, 1)
    return Image.fromarray((m * 255).astype(np.uint8), "L").resize(img.size, Image.LANCZOS)


# ---------------------------------------------------------------- helpers
def open_image(data, max_side=2048):
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)  # phone photos come in sideways otherwise
    img.load()
    if max(img.size) > max_side:
        img.thumbnail((max_side, max_side), Image.LANCZOS)
    return img


def existing_alpha(img):
    """If the upload is already a cutout (transparent PNG), return its alpha."""
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        alpha = img.convert("RGBA").getchannel("A")
        if alpha.getextrema()[0] < 250:
            return alpha
    return None


def make_cutout(original, mask):
    rgba = original.convert("RGBA")
    rgba.putalpha(mask)
    bbox = mask.point(lambda v: 255 if v > 24 else 0).getbbox()
    if bbox:
        pad = int(max(original.size) * 0.02)
        bbox = (max(bbox[0] - pad, 0), max(bbox[1] - pad, 0),
                min(bbox[2] + pad, original.width), min(bbox[3] + pad, original.height))
        rgba = rgba.crop(bbox)
    return rgba


def thumbnail(img, side=480):
    t = img.copy()
    t.thumbnail((side, side), Image.LANCZOS)
    return t


def flatten(img, bg=(255, 255, 255)):
    if img.mode != "RGBA":
        return img.convert("RGB")
    base = Image.new("RGB", img.size, bg)
    base.paste(img, mask=img.getchannel("A"))
    return base


# ---------------------------------------------------------------- colors
NAMED = [  # (name, rgb, family)
    ("Black", (25, 25, 28), "black"), ("Charcoal", (60, 62, 66), "gray"), ("Gray", (128, 128, 130), "gray"),
    ("Silver", (192, 192, 196), "gray"), ("White", (245, 245, 243), "white"), ("Ivory", (240, 234, 214), "white"),
    ("Cream", (238, 225, 196), "beige"), ("Beige", (215, 196, 160), "beige"), ("Camel", (193, 154, 107), "brown"),
    ("Tan", (170, 130, 90), "brown"), ("Brown", (110, 72, 45), "brown"), ("Chocolate", (70, 45, 30), "brown"),
    ("Navy", (30, 40, 80), "blue"), ("Denim", (70, 100, 140), "blue"), ("Blue", (40, 90, 200), "blue"),
    ("Sky blue", (135, 190, 235), "blue"), ("Teal", (20, 120, 120), "green"), ("Green", (40, 130, 60), "green"),
    ("Olive", (110, 110, 50), "green"), ("Sage", (160, 180, 140), "green"), ("Mint", (170, 225, 195), "green"),
    ("Yellow", (240, 210, 50), "yellow"), ("Mustard", (200, 160, 40), "yellow"), ("Orange", (235, 120, 40), "orange"),
    ("Rust", (170, 75, 35), "orange"), ("Red", (200, 30, 40), "red"), ("Burgundy", (110, 20, 40), "red"),
    ("Pink", (240, 150, 180), "pink"), ("Blush", (235, 195, 190), "pink"), ("Hot pink", (230, 50, 130), "pink"),
    ("Purple", (110, 50, 150), "purple"), ("Lavender", (190, 170, 225), "purple"), ("Plum", (90, 40, 75), "purple"),
]


def dominant_color(cutout):
    small = cutout.convert("RGBA").copy()
    small.thumbnail((96, 96))
    px = np.asarray(small).reshape(-1, 4)
    px = px[px[:, 3] > 200][:, :3]
    if len(px) < 10:
        return "#888888", "Gray", "gray"
    q = Image.fromarray(px.reshape(-1, 1, 3).astype(np.uint8), "RGB").quantize(5)
    pal = q.getpalette()
    count, idx = max(q.getcolors())
    rgb = tuple(pal[idx * 3: idx * 3 + 3])
    name, _, fam = min(NAMED, key=lambda c: sum((a - b) ** 2 * w for a, b, w in zip(rgb, c[1], (2, 4, 3))))
    return "#%02x%02x%02x" % rgb, name, fam


# ---------------------------------------------------------------- collage
def _fit(canvas, img, box, shadow=True):
    W, H = canvas.size
    x0, y0, x1, y1 = int(box[0] * W), int(box[1] * H), int(box[2] * W), int(box[3] * H)
    im = img.convert("RGBA")
    sc = min((x1 - x0) / im.width, (y1 - y0) / im.height)
    im = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.LANCZOS)
    px, py = x0 + (x1 - x0 - im.width) // 2, y0 + (y1 - y0 - im.height) // 2
    if shadow:
        a = im.getchannel("A").point(lambda v: v * 0.22).filter(ImageFilter.GaussianBlur(10))
        sh = Image.new("RGBA", im.size, (60, 30, 50, 0))
        sh.putalpha(a)
        canvas.alpha_composite(sh, (px + 6, py + 10))
    canvas.alpha_composite(im, (px, py))


def outfit_board(slots, size=(900, 1200), bg=(250, 244, 240, 255)):
    """slots: dict slot -> RGBA image, plus 'accessory': [images]."""
    canvas = Image.new("RGBA", size, bg)
    has_outer = "outerwear" in slots
    boxes = {
        "hat": (0.36, 0.02, 0.64, 0.15),
        "outerwear": (0.02, 0.16, 0.42, 0.55),
        "top": (0.30, 0.15, 0.76, 0.47) if has_outer else (0.20, 0.15, 0.76, 0.47),
        "bottom": (0.24, 0.46, 0.72, 0.85),
        "dress": (0.22, 0.15, 0.74, 0.86),
        "shoes": (0.28, 0.86, 0.70, 0.985),
    }
    for slot in ("outerwear", "dress", "bottom", "top", "hat", "shoes"):
        if slot in slots:
            _fit(canvas, slots[slot], boxes[slot])
    acc = slots.get("accessory") or []
    for i, im in enumerate(acc[:5]):
        _fit(canvas, im, (0.77, 0.16 + i * 0.15, 0.98, 0.29 + i * 0.15))
    return canvas


def body_layout(person_mask):
    """Rough body landmarks from a person silhouette, used by the offline preview."""
    m = np.asarray(person_mask) > 127
    rows = np.where(m.any(axis=1))[0]
    if len(rows) < 10:
        h, w = m.shape
        return dict(top=0, height=h, cx=lambda f: w / 2, width=lambda f: w * 0.3)
    top, bot = int(rows[0]), int(rows[-1])
    height = bot - top

    def row_at(f):
        return m[min(int(top + f * height), m.shape[0] - 1)]

    def cx(f):
        xs = np.where(row_at(f))[0]
        return float(xs.mean()) if len(xs) else m.shape[1] / 2

    def width(f):
        xs = np.where(row_at(f))[0]
        return float(xs.max() - xs.min()) if len(xs) > 1 else height * 0.25

    return dict(top=top, height=height, cx=cx, width=width)
