# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server with HMR
npm run build      # Production build → dist/
npm run typecheck  # vue-tsc type check (no emit)
npm run preview    # Serve the dist/ build locally
make docker        # docker build -t openairtech/map .
make publish       # rsync dist/ to openair.city
```

No test suite exists. Type checking is the primary correctness gate.

## Environment

Copy `.env.example` to `.env` and fill in `VITE_MAPBOX_TOKEN`. All `VITE_*` variables are inlined at build time (Vite convention). The `.env` file is gitignored.

Key variables: `VITE_API_URL`, `VITE_MAPBOX_TOKEN`, `VITE_MAP_CENTER` (JSON array), `VITE_MAP_ZOOM`, `VITE_MAP_REFRESH_PERIOD` (ms), `VITE_MAP_CHARTS_TIME_WINDOW` (hours), `VITE_MAP_CHARTS_UPDATE_PERIOD` (seconds).

## Architecture

**Stack:** Vue 3 (Composition API) + Vite + TypeScript. Pinia for state. vue-i18n 10 (ru/en, browser auto-detect). Bootstrap 5 + Bootstrap Icons. Leaflet 1.9 (raw, not vue-leaflet). Chart.js 4 via vue-chartjs. Day.js (with `localizedFormat`, `relativeTime`, `isSameOrBefore` plugins). `@vueform/slider` for the timeline handle. No Vue Router — the app is single-page and the hash is used exclusively for permalink state.

**Pinia singleton pattern:** `src/plugins.ts` exports the single `pinia` instance. Import it from there (not from `main.ts`) to avoid circular dependencies. Station popups are mounted as separate Vue app instances (`createApp(StationPopup, props).use(pinia).use(i18n)`) so they share the same stores as the main app.

**Three Pinia stores:**
- `stores/config.ts` — read-only `VITE_*` env vars
- `stores/map.ts` — Leaflet map state (stations array, center, zoom, popup open/pinned flags)
- `stores/timeline.ts` — timeline state (`time: number|null` where null = realtime, `day`, `sliderValue`, `sliderEndTime`). Exports `TIMELINE_STEP` (600s) and `TIMELINE_LENGTH` (85800s = 23h50m).

**`$onAction` in MapView:** Map updates use `timelineStore.$onAction` because different actions need different debounce timings: 0 ms for discrete buttons (`setTime`, `stepForward`/`Back`, `jumpToNow`, `setDay`) and 250 ms for `onSliderChange` (slider drag). When a step action internally calls `onSliderChange`, both fire — the outer action's `after()` runs last and its 0 ms timer overrides the inner 250 ms one. `@vueform/slider` updates correctly via the reactive `:modelValue` prop binding; no imperative `.set()` call is needed.

**MapView component** (`src/components/MapView.vue`):
- Manages the Leaflet map imperatively in `onMounted`/`onUnmounted`
- Station markers use `L.BeautifyIcon.icon()` (vendor plugin in `src/vendor/`)
- Popup pinning: marker is pre-bound with `marker.bindPopup(container)` then immediately `marker.off('click')` to remove Leaflet's internal click-to-toggle handler before adding the custom one. This is required — skipping `off('click')` causes the popup to close on every click.
- Popup Vue apps are mounted lazily on first open; `marker._popupContainer` holds the pre-bound DOM element
- Map updates triggered by `timelineStore.$onAction`: 0ms delay for discrete actions (step buttons, `setTime`, `setDay`), 250ms debounce for `onSliderChange` (slider drag)

**Permalink format:** `#lat,lng,zoomz[,timestampt]` — e.g. `#48.70914,44.50664,13z,1746000000t`. Parsed/written by `src/composables/usePermalink.ts`, called at top-level `setup()` in `App.vue` (not in `onMounted`) so the store watcher is registered before `MapView.vue`'s `onMounted` fires and sets the initial map position. Parsers use `/^#\/?/` to handle both `#` and `#/` prefix forms. `pushState` state uses plain `{ lat, lng }` objects — Vue Proxy cannot be structured-cloned.

**Vendor plugins** (`src/vendor/`): `leaflet-beautify-marker-icon.js` and `leaflet.restoreview.js` are not on npm in the versions used. Both have `import L from 'leaflet'` prepended so Vite can process them as ES modules. `leaflet.restoreview.js` adds `map.restoreView()` which reads/writes `localStorage.mapView`.

**Timer utility** (`src/composables/useTimer.ts`): module-level singleton `Map<string, setTimeout>`. Named timers (`cancel(name)` / `schedule(name, fn, ms)`) — calling `schedule` with an existing name cancels the previous one.

**Bootstrap dropdown:** Use `new Dropdown(element)` from `'bootstrap'` programmatically rather than `data-bs-toggle="dropdown"`. The data-api click handler (document-level event delegation) can be swallowed before it arrives — programmatic instantiation is reliable.

## Deployment

`make docker` builds a multi-stage image: `node:22-alpine` compiles the app, `nginx:1.29-alpine` serves `dist/`. The Docker image is published to `openairtech/map` on Docker Hub via GitHub Actions on push to master.
