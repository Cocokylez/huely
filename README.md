# 🎨 Huely

Turn a photo into colors you can **paint by hand**.

Huely is a small, privacy-friendly web app. Upload a photo and it gives you:

- **An oil-paint version** of your image — a softer, painterly reference to work from.
- **Your exact palette** — the dominant colors as swatches with copyable **HEX** and **RGB** values, so you can mix or match them with real paint.
- **A paint-by-numbers guide** — the image reduced to flat numbered color zones so you know *where* each color goes.
- **An eyedropper** — tap anywhere on the image to grab that pixel's exact color.
- **Download / print** the guide to keep beside you while you paint.

> Huely is a **reference tool**, not a digital painting app. You do the painting for real, on a real canvas — Huely just shows you the colors and where they go.

## How it works

Everything runs **client-side in your browser** using the Canvas API — your photo never leaves your device, and there's no server or account.

- Oil-paint effect: an intensity-histogram "oil painting" filter.
- Palette: median-cut color quantization.
- Paint-by-numbers: nearest-color mapping + region outlines + connected-component numbering.

## Run locally

It's a static site — no build step, no dependencies. Just open `index.html` in a browser, or serve the folder:

```bash
# any static server works, e.g.
python -m http.server 8000
# then visit http://localhost:8000
```

## Deploy

Static hosting anywhere. This project is set up to deploy on **Vercel**:

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com) → **New Project** → import the repo → **Deploy** (no configuration needed).
3. Every push to the default branch auto-deploys.

## Project structure

```
huely/
├── index.html   # markup
├── styles.css   # minimal warm-paper theme
├── app.js       # image pipeline (oil paint, palette, paint-by-numbers, eyedropper)
└── README.md
```

## License

MIT — do whatever you like.
