# ✦ Closet Computer

Closet Computer is a digital wardrobe that runs on your own computer, in your browser.

- **Upload clothes** by dropping in photos or taking them with your phone. The background is removed automatically on your machine (no API key or upload needed).
- **Everything is saved and sorted.** Categories are Tops, Bottoms, Dresses, Outerwear, Shoes, Hats and Accessories. You can search by name, color or tag, and mark favorites. Each item is auto-named by its color (for example "Navy top").
- **Dress me:** an outfit builder where you flip through rows of hats, outerwear, tops, bottoms and shoes. Switch to Dress mode, pick accessories, lock the rows you like, and **shuffle** the rest.
- **Lookbook:** save outfits. Each one gets a flat-lay collage image.
- **Try it on me:** upload a photo of yourself and generate what the outfit would look like on you with any image model you plug in.

## Run it

You need Python 3.10–3.13 ([python.org](https://www.python.org/downloads/)).

- **Mac / Linux:** `./run.sh`
- **Windows:** double-click `run.bat`

The first run installs dependencies into `.venv` and downloads the background-removal model (~180 MB, one time only). After that, the app opens at http://127.0.0.1:8765.

**Use it from your phone** to photograph clothes straight into your closet: run `./run.sh --lan` (or `run.bat --lan`) and open the address it prints on your phone. Your phone must be on the same Wi-Fi. Only do this on a network you trust.

## The try-on "socket"

Go to **Settings → Try-on model**, pick a model, and paste its API key:

| Model | What it's like |
|---|---|
| **Paper doll (offline)** | Free, no key. Pins your cutouts onto your photo for a rough preview. |
| **Google Gemini ("Nano Banana")** | Handles whole outfits in one shot, including hats, shoes and accessories. Get a key at aistudio.google.com. |
| **OpenAI gpt-image** | Handles whole outfits. The Base URL can point at Azure or any OpenAI-compatible server. |
| **Replicate – IDM-VTON** | A dedicated try-on model. Applies the top, bottom, dress and outerwear one at a time. Non-commercial license. |
| **fal.ai – FASHN** | A dedicated, commercial-grade try-on model. Applies the top, bottom, dress and outerwear one at a time. |
| **Custom endpoint** | Your own server. The app POSTs JSON (format below) and expects an image back. |

Instead of pasting keys in Settings, you can set them as environment variables: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `REPLICATE_API_TOKEN`, `FAL_KEY`.

**Bring your own model:**

- **Python plugin:** copy `plugins/example_provider.py`, implement `generate(req, cfg)` so it returns image bytes, and restart the app. Your model then appears in Settings.
- **Any language (Custom endpoint):** the app POSTs this to your URL:
  ```json
  {"prompt": "...", "instructions": "...", "person_image": "data:image/jpeg;base64,...",
   "outfit_image": "data:image/png;base64,...",
   "garments": [{"category": "top", "name": "Red top", "color": "Red", "image": "data:image/png;base64,..."}]}
  ```
  Reply with either raw image bytes or JSON containing one of `image`, `image_url`, `images[0]` or `data[0].b64_json`.

## Tips

- **Cutouts:** they come out best when you photograph clothes flat or hanging against a plain, contrasting background. If a cutout is off, open the item, go to **"Cutout not right?"**, and try another model or keep the original photo. A transparent PNG you upload is kept as-is.
- **Photos of you:** for try-on, use a full-body photo with you facing the camera in good light.
- **Your data:** everything lives in `data/` (database, images, settings, API keys). To back it up, use **Settings → Back up my closet**.
