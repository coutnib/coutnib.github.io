"""Closet Computer - FastAPI server. Run with:  python -m app  (or ./run.sh)"""
import io
import json
import shutil
import threading
import zipfile
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from typing import Optional

from pydantic import BaseModel

from . import imaging, providers
from .storage import (CATEGORIES, DATA, MEDIA, ROOT, execute, load_settings, now, query, query_one,
                      save_settings)

app = FastAPI(title="Closet Computer")
jobs = ThreadPoolExecutor(max_workers=2)
SLOTS = ["hat", "outerwear", "top", "bottom", "dress", "shoes", "accessory"]


def item_dir(i):
    return MEDIA / "items" / str(i)


def item_json(r):
    v = r["updated_at"].replace(":", "").replace("-", "").replace("+", "")
    base = f"/media/items/{r['id']}"
    return {**r, "favorite": bool(r["favorite"]), "bg_removed": bool(r["bg_removed"]),
            "tags": [t for t in r["tags"].split(",") if t],
            "image": f"{base}/cutout.png?v={v}", "thumb": f"{base}/thumb.webp?v={v}",
            "original": f"{base}/original.jpg?v={v}"}


def get_item(i):
    r = query_one("SELECT * FROM items WHERE id=?", (i,))
    if not r:
        raise HTTPException(404, "Item not found")
    return r


# ---------------------------------------------------------------- processing
def process_item(item_id, original, mask, bg_removed):
    d = item_dir(item_id)
    d.mkdir(parents=True, exist_ok=True)
    imaging.flatten(original).save(d / "original.jpg", quality=92)
    mask.save(d / "mask.png")
    cut = imaging.make_cutout(original, mask)
    cut.save(d / "cutout.png", optimize=True)
    imaging.thumbnail(cut).save(d / "thumb.webp", quality=88)
    color, cname, fam = imaging.dominant_color(cut)
    execute("UPDATE items SET color=?, color_name=?, color_family=?, bg_removed=?, updated_at=? WHERE id=?",
            (color, cname, fam, int(bg_removed), now(), item_id))
    return cname


@app.on_event("startup")
def warm_up():
    model = load_settings()["bg_model"]
    threading.Thread(target=lambda: _safe(imaging.get_session, model), daemon=True).start()


def _safe(fn, *a):
    try:
        fn(*a)
    except Exception:
        pass


@app.get("/api/status")
def status():
    counts = {c: 0 for c in CATEGORIES}
    for r in query("SELECT category, COUNT(*) n FROM items GROUP BY category"):
        counts[r["category"]] = r["n"]
    s = load_settings()
    return {"bg": imaging.status, "counts": counts,
            "outfits": query_one("SELECT COUNT(*) n FROM outfits")["n"],
            "people": query_one("SELECT COUNT(*) n FROM people")["n"],
            "provider": s["provider"], "categories": CATEGORIES, "data_dir": str(DATA)}


# ---------------------------------------------------------------- items
@app.get("/api/items")
def list_items(category: str = "", q: str = "", favorite: bool = False):
    sql, args = "SELECT * FROM items WHERE 1=1", []
    if category:
        sql += " AND category=?"
        args.append(category)
    if favorite:
        sql += " AND favorite=1"
    if q:
        sql += " AND (name LIKE ? OR tags LIKE ? OR color_name LIKE ? OR notes LIKE ?)"
        args += [f"%{q}%"] * 4
    return [item_json(r) for r in query(sql + " ORDER BY id DESC", args)]


@app.post("/api/items")
def add_item(file: UploadFile = File(...), category: str = Form("top"), name: str = Form(""),
             remove_bg: bool = Form(True)):
    if category not in CATEGORIES:
        raise HTTPException(400, "Unknown category")
    try:
        img = imaging.open_image(file.file.read())
    except Exception:
        raise HTTPException(400, "That file doesn't look like an image")
    alpha = imaging.existing_alpha(img)
    original = img.convert("RGB")
    if alpha is not None:
        mask, removed = alpha, True
    elif remove_bg:
        mask, removed = imaging.predict_mask(original, load_settings()["bg_model"]), True
    else:
        mask, removed = Image.new("L", original.size, 255), False
    t = now()
    item_id = execute("INSERT INTO items (name, category, created_at, updated_at) VALUES (?,?,?,?)",
                      (name.strip(), category, t, t))
    try:
        cname = process_item(item_id, original, mask, removed)
    except Exception:
        execute("DELETE FROM items WHERE id=?", (item_id,))
        shutil.rmtree(item_dir(item_id), ignore_errors=True)
        raise
    if not name.strip():
        execute("UPDATE items SET name=? WHERE id=?", (f"{cname} {CATEGORIES[category].lower()}", item_id))
    return item_json(get_item(item_id))


class ItemPatch(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list] = None
    notes: Optional[str] = None
    favorite: Optional[bool] = None


@app.patch("/api/items/{item_id}")
def update_item(item_id: int, p: ItemPatch):
    get_item(item_id)
    fields = p.model_dump(exclude_none=True) if hasattr(p, "model_dump") else p.dict(exclude_none=True)
    if "category" in fields and fields["category"] not in CATEGORIES:
        raise HTTPException(400, "Unknown category")
    if "tags" in fields:
        fields["tags"] = ",".join(t.strip().lower() for t in fields["tags"] if t.strip())
    if "favorite" in fields:
        fields["favorite"] = int(fields["favorite"])
    for k, v in fields.items():
        execute(f"UPDATE items SET {k}=? WHERE id=?", (v, item_id))
    if fields:
        execute("UPDATE items SET updated_at=? WHERE id=?", (now(), item_id))
    return item_json(get_item(item_id))


@app.post("/api/items/{item_id}/reprocess")
def reprocess_item(item_id: int, mode: str = Form("auto"), model: str = Form("")):
    """mode: auto (run a background model) | none (keep the full photo)."""
    get_item(item_id)
    original = Image.open(item_dir(item_id) / "original.jpg").convert("RGB")
    if mode == "none":
        process_item(item_id, original, Image.new("L", original.size, 255), False)
    else:
        process_item(item_id, original, imaging.predict_mask(original, model or load_settings()["bg_model"]), True)
    return item_json(get_item(item_id))


@app.delete("/api/items/{item_id}")
def delete_item(item_id: int):
    affected = [r["outfit_id"] for r in query("SELECT outfit_id FROM outfit_items WHERE item_id=?", (item_id,))]
    execute("DELETE FROM items WHERE id=?", (item_id,))
    shutil.rmtree(item_dir(item_id), ignore_errors=True)
    for o in affected:
        _render_outfit(o)
    return {"ok": True}


# ---------------------------------------------------------------- people (photos of the user)
def person_json(r):
    return {**r, "is_default": bool(r["is_default"]), "image": f"/media/people/{r['id']}.jpg"}


@app.get("/api/people")
def list_people():
    return [person_json(r) for r in query("SELECT * FROM people ORDER BY is_default DESC, id DESC")]


@app.post("/api/people")
def add_person(file: UploadFile = File(...), name: str = Form("Me")):
    try:
        img = imaging.flatten(imaging.open_image(file.file.read()).convert("RGBA"))
    except Exception:
        raise HTTPException(400, "That file doesn't look like an image")
    first = query_one("SELECT COUNT(*) n FROM people")["n"] == 0
    pid = execute("INSERT INTO people (name, is_default, created_at) VALUES (?,?,?)", (name, int(first), now()))
    img.save(MEDIA / "people" / f"{pid}.jpg", quality=92)
    return person_json(query_one("SELECT * FROM people WHERE id=?", (pid,)))


@app.post("/api/people/{pid}/default")
def default_person(pid: int):
    execute("UPDATE people SET is_default = (id = ?)", (pid,))
    return {"ok": True}


@app.delete("/api/people/{pid}")
def delete_person(pid: int):
    execute("DELETE FROM people WHERE id=?", (pid,))
    (MEDIA / "people" / f"{pid}.jpg").unlink(missing_ok=True)
    if not query_one("SELECT id FROM people WHERE is_default=1"):
        execute("UPDATE people SET is_default=1 WHERE id=(SELECT MAX(id) FROM people)")
    return {"ok": True}


# ---------------------------------------------------------------- outfits
class OutfitIn(BaseModel):
    name: str = ""
    items: list  # [{slot, item_id}]


def _outfit_slots(outfit_id):
    return query("SELECT oi.slot, i.* FROM outfit_items oi JOIN items i ON i.id = oi.item_id "
                 "WHERE oi.outfit_id=? ORDER BY oi.rowid", (outfit_id,))


def _board_for(rows):
    slots = {}
    for r in rows:
        im = Image.open(item_dir(r["id"]) / "cutout.png")
        if r["slot"] == "accessory":
            slots.setdefault("accessory", []).append(im)
        else:
            slots[r["slot"]] = im
    return imaging.outfit_board(slots)


def _render_outfit(outfit_id):
    _board_for(_outfit_slots(outfit_id)).convert("RGB").save(MEDIA / "outfits" / f"{outfit_id}.jpg", quality=90)
    execute("UPDATE outfits SET updated_at=? WHERE id=?", (now(), outfit_id))


def outfit_json(o):
    rows = _outfit_slots(o["id"])
    cover = None
    if o["cover_tryon_id"]:
        cover = f"/media/tryons/{o['cover_tryon_id']}.png"
    v = o["updated_at"].replace(":", "").replace("-", "").replace("+", "")
    return {**o, "favorite": bool(o["favorite"]), "image": f"/media/outfits/{o['id']}.jpg?v={v}", "cover": cover,
            "items": [{"slot": r.pop("slot"), "item": item_json(r)} for r in rows]}


def _set_outfit_items(outfit_id, items):
    execute("DELETE FROM outfit_items WHERE outfit_id=?", (outfit_id,))
    for it in items:
        if it.get("slot") in SLOTS and query_one("SELECT id FROM items WHERE id=?", (it.get("item_id"),)):
            execute("INSERT OR IGNORE INTO outfit_items (outfit_id, item_id, slot) VALUES (?,?,?)",
                    (outfit_id, it["item_id"], it["slot"]))


@app.get("/api/outfits")
def list_outfits():
    return [outfit_json(o) for o in query("SELECT * FROM outfits ORDER BY id DESC")]


@app.post("/api/outfits")
def create_outfit(o: OutfitIn):
    if not o.items:
        raise HTTPException(400, "Pick at least one item")
    t = now()
    oid = execute("INSERT INTO outfits (name, created_at, updated_at) VALUES (?,?,?)",
                  (o.name.strip() or "Untitled outfit", t, t))
    _set_outfit_items(oid, o.items)
    _render_outfit(oid)
    return outfit_json(query_one("SELECT * FROM outfits WHERE id=?", (oid,)))


@app.put("/api/outfits/{oid}")
def update_outfit(oid: int, o: OutfitIn):
    if not query_one("SELECT id FROM outfits WHERE id=?", (oid,)):
        raise HTTPException(404, "Outfit not found")
    execute("UPDATE outfits SET name=? WHERE id=?", (o.name.strip() or "Untitled outfit", oid))
    _set_outfit_items(oid, o.items)
    _render_outfit(oid)
    return outfit_json(query_one("SELECT * FROM outfits WHERE id=?", (oid,)))


class OutfitPatch(BaseModel):
    name: Optional[str] = None
    favorite: Optional[bool] = None
    cover_tryon_id: Optional[int] = None


@app.patch("/api/outfits/{oid}")
def patch_outfit(oid: int, p: OutfitPatch):
    if p.name is not None:
        execute("UPDATE outfits SET name=? WHERE id=?", (p.name, oid))
    if p.favorite is not None:
        execute("UPDATE outfits SET favorite=? WHERE id=?", (int(p.favorite), oid))
    if p.cover_tryon_id is not None:
        execute("UPDATE outfits SET cover_tryon_id=? WHERE id=?", (p.cover_tryon_id or None, oid))
    return outfit_json(query_one("SELECT * FROM outfits WHERE id=?", (oid,)))


@app.delete("/api/outfits/{oid}")
def delete_outfit(oid: int):
    execute("DELETE FROM outfits WHERE id=?", (oid,))
    (MEDIA / "outfits" / f"{oid}.jpg").unlink(missing_ok=True)
    return {"ok": True}


# ---------------------------------------------------------------- providers + settings
def _mask(v):
    return ("•" * 8 + v[-4:]) if v and len(v) > 8 else ("•" * 8 if v else "")


@app.get("/api/providers")
def list_providers():
    s, out = load_settings(), []
    for p in providers.REGISTRY.values():
        cfg = p.config(s)
        out.append({"id": p.id, "name": p.name, "description": p.description,
                    "missing": p.missing(cfg),
                    "fields": [{**f, "value": _mask(cfg.get(f["key"], "")) if f.get("type") == "password"
                                else cfg.get(f["key"], "")} for f in p.fields]})
    return {"default": s["provider"], "providers": out, "plugin_errors": providers.PLUGIN_ERRORS,
            "bg_models": {k: v["label"] for k, v in imaging.BG_MODELS.items()}, "bg_model": s["bg_model"]}


class SettingsIn(BaseModel):
    provider: Optional[str] = None
    bg_model: Optional[str] = None
    providers: Optional[dict] = None


@app.put("/api/settings")
def put_settings(body: SettingsIn):
    s = load_settings()
    if body.provider in providers.REGISTRY:
        s["provider"] = body.provider
    if body.bg_model in imaging.BG_MODELS:
        s["bg_model"] = body.bg_model
        threading.Thread(target=lambda: _safe(imaging.get_session, body.bg_model), daemon=True).start()
    for pid, vals in (body.providers or {}).items():
        cur = s["providers"].setdefault(pid, {})
        for k, v in (vals or {}).items():
            if isinstance(v, str) and v.startswith("•"):
                continue  # unchanged masked secret
            cur[k] = v
    save_settings(s)
    return list_providers()


# ---------------------------------------------------------------- try-ons
class TryOnIn(BaseModel):
    person_id: int
    item_ids: list = []
    slots: list = []          # [{slot, item_id}] (preferred: tells us dress vs top etc.)
    outfit_id: Optional[int] = None
    provider: Optional[str] = None
    instructions: str = ""


def tryon_json(t):
    return {**t, "item_ids": json.loads(t["item_ids"]),
            "image": f"/media/tryons/{t['id']}.png" if t["status"] == "done" else None}


def _run_tryon(tid, provider_id, person_id, slot_rows, instructions):
    execute("UPDATE tryons SET status='running' WHERE id=?", (tid,))
    try:
        s = load_settings()
        prov = providers.REGISTRY[provider_id]
        cfg = prov.config(s)
        miss = prov.missing(cfg)
        if miss:
            raise RuntimeError(f"{prov.name} needs: {', '.join(miss)} (open Settings)")
        person = Image.open(MEDIA / "people" / f"{person_id}.jpg").convert("RGB")
        garments = [providers.Garment(r["slot"], r["name"], r["color_name"] or "",
                                      Image.open(item_dir(r["id"]) / "cutout.png").convert("RGBA"))
                    for r in slot_rows]
        req = providers.TryOnRequest(person=person, garments=garments, instructions=instructions,
                                     board=_board_for(slot_rows), bg_model=s["bg_model"])
        png = prov.generate(req, cfg)
        imaging.open_image(png, 4096).save(MEDIA / "tryons" / f"{tid}.png")
        execute("UPDATE tryons SET status='done', finished_at=? WHERE id=?", (now(), tid))
    except Exception as e:
        execute("UPDATE tryons SET status='error', error=?, finished_at=? WHERE id=?", (str(e)[:1500], now(), tid))


@app.post("/api/tryons")
def create_tryon(body: TryOnIn):
    provider_id = body.provider or load_settings()["provider"]
    if provider_id not in providers.REGISTRY:
        raise HTTPException(400, "Unknown provider")
    if not query_one("SELECT id FROM people WHERE id=?", (body.person_id,)):
        raise HTTPException(400, "Add a photo of yourself first (Me tab)")
    pairs = body.slots or [{"slot": None, "item_id": i} for i in body.item_ids]
    if body.outfit_id and not pairs:
        pairs = [{"slot": r["slot"], "item_id": r["id"]} for r in _outfit_slots(body.outfit_id)]
    rows = []
    for p in pairs:
        r = query_one("SELECT * FROM items WHERE id=?", (p["item_id"],))
        if r:
            rows.append({**r, "slot": p.get("slot") if p.get("slot") in SLOTS else r["category"]})
    if not rows:
        raise HTTPException(400, "Pick at least one item")
    tid = execute("INSERT INTO tryons (outfit_id, person_id, item_ids, provider, instructions, created_at) "
                  "VALUES (?,?,?,?,?,?)", (body.outfit_id, body.person_id, json.dumps([r["id"] for r in rows]),
                                           provider_id, body.instructions, now()))
    jobs.submit(_run_tryon, tid, provider_id, body.person_id, rows, body.instructions)
    return tryon_json(query_one("SELECT * FROM tryons WHERE id=?", (tid,)))


@app.get("/api/tryons")
def list_tryons(outfit_id: int = None):
    if outfit_id:
        return [tryon_json(t) for t in query("SELECT * FROM tryons WHERE outfit_id=? ORDER BY id DESC", (outfit_id,))]
    return [tryon_json(t) for t in query("SELECT * FROM tryons ORDER BY id DESC")]


@app.get("/api/tryons/{tid}")
def get_tryon(tid: int):
    t = query_one("SELECT * FROM tryons WHERE id=?", (tid,))
    if not t:
        raise HTTPException(404, "Not found")
    return tryon_json(t)


@app.delete("/api/tryons/{tid}")
def delete_tryon(tid: int):
    execute("DELETE FROM tryons WHERE id=?", (tid,))
    execute("UPDATE outfits SET cover_tryon_id=NULL WHERE cover_tryon_id=?", (tid,))
    (MEDIA / "tryons" / f"{tid}.png").unlink(missing_ok=True)
    return {"ok": True}


# ---------------------------------------------------------------- backup
@app.get("/api/export")
def export_zip():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(DATA / "closet.db", "closet.db")
        for f in MEDIA.rglob("*"):
            if f.is_file():
                z.write(f, "media/" + f.relative_to(MEDIA).as_posix())
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/zip",
                             headers={"Content-Disposition": "attachment; filename=closet-backup.zip"})


# ---------------------------------------------------------------- static
app.mount("/media", StaticFiles(directory=MEDIA), name="media")
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")


@app.get("/")
def index():
    return FileResponse(ROOT / "static" / "index.html")
