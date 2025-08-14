# Central Snake — Friends-ish PWA

A cozy, coffeehouse-themed Snake game with obstacles, power-ups, and speed boosts. Built with vanilla JS and packaged as a Progressive Web App.

## Features
- Obstacles (sofa blocks) that increase over time.
- Power-ups:
  - **Pivot!**: temporary wall pass-through (wrap).
  - **Smelly Cat**: slows time.
  - **Sarcasm**: doubles points.
- **Speed Boost** item that temporarily accelerates the snake.
- Swipe controls for mobile, keyboard for desktop.
- Offline support via Service Worker; installable via manifest.

## Run locally
1. Unzip.
2. Serve the folder with any static server (PWA requires HTTP for SW). Examples:
   - Python: `python3 -m http.server 8080`
   - Node: `npx serve`
3. Open http://localhost:8080 and play. Use the *Install* button to add it as an app.

## Files
- `index.html` — layout and PWA hooks
- `app.js` — game logic
- `manifest.webmanifest` — PWA manifest
- `service-worker.js` — offline caching
- `assets/icons/*` — app icons

Have fun! ☕🐍
