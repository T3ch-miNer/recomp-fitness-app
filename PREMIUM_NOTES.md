# Recomp 2.2 — Premium redesign

New: `premium.css` (loaded last; re-skins everything), redesigned icon, ring-based Home, smooth weight chart,
rest-timer ring, water level, witty microcopy. Data model and behaviour are untouched.

- Colours / spacing / radii: tokens at the top of `premium.css` (light + dark).
- Fonts: Bricolage Grotesque + Inter via Google Fonts (cached by the service worker after first load; falls back to system fonts).
- Copy: search app.js for `greeting()`, `dayQuip()`, and the `notify(...)` strings.
