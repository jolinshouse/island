# Island

A digital party card game for groups of friends. Shake your phone (or tap the card) to reveal a random prompt.

Built as a hi-fi mobile prototype: HTML + CSS + React (via in-browser Babel), wrapped in an iOS device frame for desktop preview.

## Run locally

The prototype loads JSX files via fetch, so it must be served over HTTP — opening `index.html` directly via `file://` won't work.

```bash
cd Island
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy

Static site, no build step. On Vercel: Framework preset = **Other**, Build command = *(empty)*, Output directory = `./`.

## Structure

- `index.html` — entry point
- `styles.css` — global styles + per-level ambience scenes
- `app.jsx` — main app: shake/tap → reveal → deal next
- `card.jsx` — 3D flip card (5:7 aspect, Italianno prompt)
- `ambience.jsx` — three weather scenes (soft / delulu / unhinged)
- `data.js` — prompt pool + per-level config
- `ios-frame.jsx` — iOS device wrapper
- `tweaks-panel.jsx` — dev tweaks shell
- `assets/` — card art + logo
