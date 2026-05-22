/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_MAPBOX_TOKEN: string
  readonly VITE_MAP_CENTER: string
  readonly VITE_MAP_ZOOM: string
  readonly VITE_MAP_REFRESH_PERIOD: string
  readonly VITE_MAP_CHARTS_TIME_WINDOW: string
  readonly VITE_MAP_CHARTS_UPDATE_PERIOD: string
  readonly VITE_MAP_TILE_STYLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

