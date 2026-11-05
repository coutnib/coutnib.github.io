"""
The try-on "socket".

Every image-generation backend is a Provider with a `generate(req, cfg) -> bytes`
method. Built-ins: an offline paper-doll preview, OpenAI, Google Gemini, Replicate
(IDM-VTON), fal.ai (FASHN) and a generic HTTP endpoint. Drop your own Provider
subclass into the top-level `plugins/` folder and it appears in Settings.
"""
import base64
import importlib.util
import io
import os
import time
import traceback
from dataclasses import dataclass, field

import requests
from PIL import Image

from . import imaging
from .storage import ROOT


@dataclass
class Garment:
    category: str          # top | bottom | dress | outerwear | shoes | hat | accessory
    name: str
    color_name: str
    image: Image.Image     # RGBA cutout


@dataclass
class TryOnRequest:
    person: Image.Image                       # photo of the user (RGB)
    garments: list = field(default_factory=list)
    instructions: str = ""
    board: Image.Image = None                 # collage of the whole outfit
    bg_model: str = "isnet-general-use"

    def prompt(self, first_image_index=1):
        lines = [f"image {i + first_image_index + 1}: {g.category} - {g.name or g.color_name}"
                 for i, g in enumerate(self.garments)]
        p = (f"Virtual try-on. Image {first_image_index} is a photo of a person. The other images are "
             f"clothing items ({'; '.join(lines)}). Generate a photorealistic full-body photo of the SAME "
             "person wearing ALL of these items together as one outfit, replacing their current clothes. "
             "Preserve the person's face, identity, hair, skin tone, body shape, pose, framing and background. "
             "Reproduce every garment faithfully: exact colors, patterns, prints, textures, logos and "
             "silhouette, with a natural fit, realistic fabric folds and consistent lighting.")
        if self.instructions.strip():
            p += " Additional direction: " + self.instructions.strip()
        return p


def to_bytes(img, fmt="PNG", max_side=1536, quality=92):
    im = img.copy()
    im.thumbnail((max_side, max_side), Image.LANCZOS)
    if fmt == "JPEG":
        im = imaging.flatten(im)
    buf = io.BytesIO()
    im.save(buf, fmt, quality=quality) if fmt == "JPEG" else im.save(buf, fmt)
    return buf.getvalue()


def data_uri(img, fmt="JPEG", max_side=1536):
    mime = "image/jpeg" if fmt == "JPEG" else "image/png"
    return f"data:{mime};base64," + base64.b64encode(to_bytes(img, fmt, max_side)).decode()


def fetch(url, timeout=120):
    if url.startswith("data:"):
        return base64.b64decode(url.split(",", 1)[1])
    r = requests.get(url, timeout=timeout)
    r.raise_for_status()
    return r.content


def check(r):
    if r.status_code >= 400:
        raise RuntimeError(f"HTTP {r.status_code} from {r.url.split('?')[0]}: {r.text[:600]}")
    return r


def chain_order(garments):
    """Single-garment try-on models: one pass per garment, in dressing order."""
    order = ["dress", "bottom", "top", "outerwear"]
    usable = sorted([g for g in garments if g.category in order], key=lambda g: order.index(g.category))
    skipped = [g for g in garments if g.category not in order]
    return usable, skipped


class Provider:
    id = ""
    name = ""
    description = ""
    fields = []   # dicts: key, label, type(text|password|select), default, options, env, help

    def config(self, settings):
        cfg = {f["key"]: f.get("default", "") for f in self.fields}
        cfg.update({k: v for k, v in (settings.get("providers", {}).get(self.id) or {}).items() if v not in (None, "")})
        for f in self.fields:   # fall back to environment variables for keys
            if not cfg.get(f["key"]) and f.get("env"):
                cfg[f["key"]] = next((os.environ[e] for e in f["env"] if os.environ.get(e)), "")
        return cfg

    def missing(self, cfg):
        return [f["label"] for f in self.fields if f.get("required") and not cfg.get(f["key"])]

    def generate(self, req: TryOnRequest, cfg: dict) -> bytes:
        raise NotImplementedError


REGISTRY = {}
PLUGIN_ERRORS = []


def register(cls):
    REGISTRY[cls.id] = cls()
    return cls


# ---------------------------------------------------------------- offline preview
@register
class PaperDoll(Provider):
    id = "paperdoll"
    name = "Paper doll (offline preview)"
    description = ("No AI, no key, free. Pins your cutouts onto your photo so you get a rough idea "
                   "instantly. Connect a real model below for photorealistic results.")
    fields = []

    def generate(self, req, cfg):
        person = req.person.convert("RGBA")
        L = imaging.body_layout(imaging.predict_mask(req.person, req.bg_model))
        top, H = L["top"], L["height"]
        canvas = person.copy()
        # slot -> (from, to) as fractions of body height, and width relative to body width there
        spec = {
            "dress": (0.15, 0.80, 0.50, 1.7), "bottom": (0.45, 0.97, 0.62, 1.5),
            "top": (0.15, 0.55, 0.30, 1.9), "outerwear": (0.14, 0.60, 0.30, 2.1),
            "shoes": (0.90, 1.02, 0.96, 1.6), "hat": (-0.04, 0.10, 0.04, 1.5),
        }
        order = ["dress", "bottom", "top", "outerwear", "shoes", "hat"]
        for g in sorted(req.garments, key=lambda g: order.index(g.category) if g.category in order else 99):
            if g.category not in spec:
                continue
            f0, f1, wf, wmul = spec[g.category]
            box_h = (f1 - f0) * H
            box_w = max(L["width"](wf) * wmul, H * 0.12)
            im = g.image.convert("RGBA")
            sc = min(box_w / im.width, box_h / im.height)
            im = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.LANCZOS)
            cx = L["cx"]((f0 + f1) / 2)
            x = int(cx - im.width / 2)
            y = int(top + f0 * H) if g.category != "shoes" else int(top + f1 * H - im.height)
            layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
            layer.paste(im, (x, y), im)
            canvas = Image.alpha_composite(canvas, layer)
        acc = [g for g in req.garments if g.category == "accessory"]
        for i, g in enumerate(acc[:3]):
            im = g.image.convert("RGBA")
            im.thumbnail((int(H * 0.16), int(H * 0.16)))
            x = int(L["cx"](0.5) + L["width"](0.5) * 0.9)
            y = int(top + (0.35 + i * 0.18) * H)
            layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
            layer.paste(im, (min(x, canvas.width - im.width), y), im)
            canvas = Image.alpha_composite(canvas, layer)
        return to_bytes(canvas, "PNG", 2048)


# ---------------------------------------------------------------- OpenAI
@register
class OpenAIImages(Provider):
    id = "openai"
    name = "OpenAI (gpt-image)"
    description = "Sends your photo + every item to OpenAI's image edit endpoint. Handles whole outfits."
    fields = [
        dict(key="api_key", label="API key", type="password", env=["OPENAI_API_KEY"], required=True),
        dict(key="model", label="Model", type="text", default="gpt-image-1",
             help="Any image model your account has, e.g. gpt-image-1, gpt-image-1-mini"),
        dict(key="quality", label="Quality", type="select", default="high", options=["auto", "high", "medium", "low"]),
        dict(key="input_fidelity", label="Face fidelity", type="select", default="high", options=["high", "low", "off"],
             help="'high' keeps your face closer to the photo; set 'off' if your model rejects it"),
        dict(key="base_url", label="Base URL", type="text", default="https://api.openai.com/v1",
             help="Change for Azure or any OpenAI-compatible server"),
    ]

    def generate(self, req, cfg):
        files = [("image[]", ("person.png", to_bytes(req.person, "PNG"), "image/png"))]
        for i, g in enumerate(req.garments[:15]):
            files.append(("image[]", (f"item{i + 1}.png", to_bytes(imaging.flatten(g.image), "PNG", 1024), "image/png")))
        data = {"model": cfg["model"], "prompt": req.prompt(), "size": "1024x1536", "n": "1",
                "quality": cfg.get("quality") or "auto"}
        if cfg.get("input_fidelity") and cfg["input_fidelity"] != "off":
            data["input_fidelity"] = cfg["input_fidelity"]
        r = check(requests.post(cfg["base_url"].rstrip("/") + "/images/edits", data=data, files=files,
                                headers={"Authorization": f"Bearer {cfg['api_key']}"}, timeout=300))
        d = r.json()["data"][0]
        return base64.b64decode(d["b64_json"]) if d.get("b64_json") else fetch(d["url"])


# ---------------------------------------------------------------- Google Gemini
@register
class Gemini(Provider):
    id = "gemini"
    name = "Google Gemini (Nano Banana)"
    description = "Gemini image models are very good at multi-item try-on. Handles whole outfits."
    fields = [
        dict(key="api_key", label="API key", type="password", env=["GEMINI_API_KEY", "GOOGLE_API_KEY"], required=True,
             help="Get one at aistudio.google.com"),
        dict(key="model", label="Model", type="text", default="gemini-2.5-flash-image",
             help="e.g. gemini-2.5-flash-image or gemini-3-pro-image-preview"),
        dict(key="aspect_ratio", label="Aspect ratio", type="select", default="3:4", options=["3:4", "2:3", "9:16", "1:1"]),
    ]

    def generate(self, req, cfg):
        parts = [{"text": req.prompt()},
                 {"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(to_bytes(req.person, "JPEG")).decode()}}]
        for g in req.garments:
            parts.append({"inline_data": {"mime_type": "image/png",
                                          "data": base64.b64encode(to_bytes(imaging.flatten(g.image), "PNG", 1024)).decode()}})
        body = {"contents": [{"role": "user", "parts": parts}],
                "generationConfig": {"responseModalities": ["TEXT", "IMAGE"],
                                     "imageConfig": {"aspectRatio": cfg.get("aspect_ratio") or "3:4"}}}
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{cfg['model']}:generateContent"
        r = check(requests.post(url, json=body, headers={"x-goog-api-key": cfg["api_key"]}, timeout=300))
        j, texts = r.json(), []
        for cand in j.get("candidates") or []:
            for p in (cand.get("content") or {}).get("parts") or []:
                blob = p.get("inlineData") or p.get("inline_data")
                if blob and blob.get("data"):
                    return base64.b64decode(blob["data"])
                if p.get("text"):
                    texts.append(p["text"])
        reason = (j.get("promptFeedback") or {}).get("blockReason") or " ".join(texts)[:400] or str(j)[:400]
        raise RuntimeError(f"Gemini returned no image: {reason}")


# ---------------------------------------------------------------- Replicate
@register
class Replicate(Provider):
    id = "replicate"
    name = "Replicate (IDM-VTON try-on)"
    description = ("A dedicated virtual try-on model. Applies tops, bottoms, dresses and outerwear one "
                   "at a time; hats, shoes and accessories are skipped. Non-commercial license.")
    fields = [
        dict(key="api_token", label="API token", type="password", env=["REPLICATE_API_TOKEN"], required=True),
        dict(key="model", label="Model", type="text", default="cuuupid/idm-vton"),
        dict(key="steps", label="Steps", type="text", default="30"),
    ]
    API = "https://api.replicate.com/v1"

    def generate(self, req, cfg):
        H = {"Authorization": f"Bearer {cfg['api_token']}"}
        usable, _ = chain_order(req.garments)
        if not usable:
            raise RuntimeError("IDM-VTON needs at least one top, bottom, dress or outerwear item.")
        model = check(requests.get(f"{self.API}/models/{cfg['model']}", headers=H, timeout=60)).json()
        version = model["latest_version"]["id"]

        def upload(img, fmt):
            b = to_bytes(img, fmt, 1024)
            r = check(requests.post(f"{self.API}/files", headers=H, timeout=120,
                                    files={"content": ("img." + fmt.lower(), b, f"image/{fmt.lower()}")}))
            return r.json()["urls"]["get"]

        person = req.person
        cats = {"top": "upper_body", "outerwear": "upper_body", "bottom": "lower_body", "dress": "dresses"}
        for g in usable:
            inp = {"human_img": upload(person, "JPEG"), "garm_img": upload(imaging.flatten(g.image), "JPEG"),
                   "garment_des": g.name or f"{g.color_name} {g.category}", "category": cats[g.category],
                   "steps": int(cfg.get("steps") or 30), "crop": False}
            p = check(requests.post(f"{self.API}/predictions", json={"version": version, "input": inp},
                                    headers={**H, "Prefer": "wait=60"}, timeout=120)).json()
            deadline = time.time() + 600
            while p.get("status") not in ("succeeded", "failed", "canceled"):
                if time.time() > deadline:
                    raise RuntimeError("Replicate timed out")
                time.sleep(3)
                p = check(requests.get(p["urls"]["get"], headers=H, timeout=60)).json()
            if p["status"] != "succeeded":
                raise RuntimeError(f"Replicate prediction {p['status']}: {p.get('error')}")
            out = p["output"][0] if isinstance(p["output"], list) else p["output"]
            person = imaging.open_image(fetch(out)).convert("RGB")
        return to_bytes(person, "PNG", 2048)


# ---------------------------------------------------------------- fal.ai
@register
class Fal(Provider):
    id = "fal"
    name = "fal.ai (FASHN try-on)"
    description = ("FASHN is a commercial-grade virtual try-on model. Applies tops, bottoms, dresses and "
                   "outerwear one pass at a time; hats, shoes and accessories are skipped.")
    fields = [
        dict(key="api_key", label="API key", type="password", env=["FAL_KEY"], required=True),
        dict(key="model", label="Endpoint", type="text", default="fal-ai/fashn/tryon/v1.6"),
        dict(key="mode", label="Mode", type="select", default="balanced", options=["performance", "balanced", "quality"]),
    ]

    def generate(self, req, cfg):
        usable, _ = chain_order(req.garments)
        if not usable:
            raise RuntimeError("FASHN needs at least one top, bottom, dress or outerwear item.")
        cats = {"top": "tops", "outerwear": "tops", "bottom": "bottoms", "dress": "one-pieces"}
        person = req.person
        for g in usable:
            body = {"model_image": data_uri(person, "JPEG"), "garment_image": data_uri(imaging.flatten(g.image), "JPEG", 1024),
                    "category": cats[g.category], "mode": cfg.get("mode") or "balanced",
                    "garment_photo_type": "auto", "num_samples": 1, "output_format": "png"}
            r = check(requests.post(f"https://fal.run/{cfg['model']}", json=body,
                                    headers={"Authorization": f"Key {cfg['api_key']}"}, timeout=300)).json()
            img = (r.get("images") or [r.get("image")])[0]
            person = imaging.open_image(fetch(img["url"] if isinstance(img, dict) else img)).convert("RGB")
        return to_bytes(person, "PNG", 2048)


# ---------------------------------------------------------------- any HTTP endpoint
@register
class CustomHTTP(Provider):
    id = "custom"
    name = "Custom endpoint (your own model)"
    description = ("POSTs JSON {prompt, instructions, person_image, outfit_image, garments:[{category,name,image}]} "
                   "with base64 data-URI images. Reply with an image, or JSON containing image / image_url / "
                   "images[0] / data[0].b64_json. Wrap ComfyUI, a local diffusers script, anything.")
    fields = [
        dict(key="endpoint", label="Endpoint URL", type="text", default="http://127.0.0.1:7860/tryon", required=True),
        dict(key="auth_header", label="Authorization header (optional)", type="password", default=""),
    ]

    def generate(self, req, cfg):
        body = {"prompt": req.prompt(), "instructions": req.instructions,
                "person_image": data_uri(req.person, "JPEG"),
                "outfit_image": data_uri(req.board, "PNG", 1200) if req.board else None,
                "garments": [{"category": g.category, "name": g.name, "color": g.color_name,
                              "image": data_uri(g.image, "PNG", 1024)} for g in req.garments]}
        headers = {"Authorization": cfg["auth_header"]} if cfg.get("auth_header") else {}
        r = check(requests.post(cfg["endpoint"], json=body, headers=headers, timeout=600))
        if r.headers.get("content-type", "").startswith("image/"):
            return r.content
        j = r.json()
        cand = (j.get("image") or j.get("image_url") or j.get("url") or (j.get("images") or [None])[0]
                or ((j.get("data") or [{}])[0].get("b64_json")))
        if isinstance(cand, dict):
            cand = cand.get("url") or cand.get("b64_json")
        if not cand:
            raise RuntimeError(f"Endpoint returned no image: {str(j)[:300]}")
        if cand.startswith(("http://", "https://", "data:")):
            return fetch(cand)
        return base64.b64decode(cand)


# ---------------------------------------------------------------- plugins/
def load_plugins():
    folder = ROOT / "plugins"
    for path in sorted(folder.glob("*.py")) if folder.exists() else []:
        if path.name.startswith("_"):
            continue
        try:
            spec = importlib.util.spec_from_file_location(f"closet_plugin_{path.stem}", path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            for obj in vars(mod).values():
                if isinstance(obj, type) and issubclass(obj, Provider) and obj is not Provider and obj.id \
                        and obj.id not in REGISTRY:
                    REGISTRY[obj.id] = obj()
        except Exception:
            PLUGIN_ERRORS.append(f"{path.name}: {traceback.format_exc(limit=2)}")


load_plugins()
