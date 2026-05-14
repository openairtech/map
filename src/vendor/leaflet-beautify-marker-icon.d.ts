import * as L from 'leaflet'

declare module 'leaflet' {
  namespace BeautifyIcon {
    interface IconOptions {
      iconSize?: [number, number]
      iconAnchor?: [number, number]
      innerIconAnchor?: [number, number]
      isAlphaNumericIcon?: boolean
      text?: number | string
      icon?: string
      iconShape?: string
      borderColor?: string
      backgroundColor?: string
      textColor?: string
    }
    function icon(options: IconOptions): L.Icon
  }

  interface Map {
    restoreView(): boolean
  }
}
