import { defineStore } from 'pinia'

export const useConfigStore = defineStore('config', () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.openair.city/v1'
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || ''
  const mapCenter = JSON.parse(import.meta.env.VITE_MAP_CENTER || '[48.709144,44.506645]') as [number, number]
  const mapZoom = Number(import.meta.env.VITE_MAP_ZOOM || 13)
  const mapRefreshPeriod = Number(import.meta.env.VITE_MAP_REFRESH_PERIOD || 30000)
  const chartsTimeWindow = Number(import.meta.env.VITE_MAP_CHARTS_TIME_WINDOW || 24)
  const chartsUpdatePeriod = Number(import.meta.env.VITE_MAP_CHARTS_UPDATE_PERIOD || 120)

  return { apiUrl, mapboxToken, mapCenter, mapZoom, mapRefreshPeriod, chartsTimeWindow, chartsUpdatePeriod }
})
