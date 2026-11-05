"""
Example try-on plugin - copy this file, rename it, and fill in generate().
Any Provider subclass in this folder shows up in Settings automatically (restart the app).

req.person        PIL image of the user
req.garments      list of Garment(category, name, color_name, image=RGBA cutout)
req.board         PIL collage of the whole outfit
req.prompt()      a ready-made try-on prompt
cfg               the values of `fields` the user typed in Settings
Return PNG/JPEG bytes.
"""
from app.providers import Provider, to_bytes


class EchoBoard(Provider):
    id = "example-board"
    name = "Example plugin (returns the outfit board)"
    description = "Template for your own model. Currently just returns the outfit collage."
    fields = [dict(key="endpoint", label="Your model's URL", type="text", default="http://127.0.0.1:8188")]

    def generate(self, req, cfg):
        # e.g. send req.person + req.garments to a local ComfyUI / diffusers / IDM-VTON server here
        return to_bytes(req.board, "PNG")
