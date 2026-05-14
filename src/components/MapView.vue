<template>
  <div id="map" ref="mapContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { createApp } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.locatecontrol'
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.css'
import '@/vendor/leaflet-beautify-marker-icon.css'
import '@/vendor/leaflet-beautify-marker-icon.js'
import '@/vendor/leaflet.restoreview.js'

import { useMapStore } from '@/stores/map'
import { useTimelineStore } from '@/stores/timeline'
import { useConfigStore } from '@/stores/config'
import { useTimer } from '@/composables/useTimer'
import { useAqiColors } from '@/composables/useAqiColors'
import { getStations } from '@/api/openair'
import { pinia } from '@/plugins'
import i18n from '@/i18n'
import StationPopup from './StationPopup.vue'
import type { Station } from '@/types/api'

const mapContainer = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null

const mapStore = useMapStore()
const timelineStore = useTimelineStore()
const configStore = useConfigStore()
const { cancel, schedule } = useTimer()
const { getMarkerColor, getMarkerTextColor } = useAqiColors()

type StationMarker = L.Marker & {
  station?: Station
  _popupContainer?: HTMLElement
  _popupApp?: ReturnType<typeof createApp>
}

// Track Leaflet markers by station id
const markers: Record<string, StationMarker> = {}

// --- Popup management ---

function openStationPopup(marker: StationMarker) {
  const station = marker.station
  if (!station) return

  mapStore.selectStation(station.id)

  // Mount Vue app into the pre-bound container on first open
  if (!marker._popupApp && marker._popupContainer) {
    const app = createApp(StationPopup, { stationId: station.id })
    app.use(pinia)
    app.use(i18n)
    app.mount(marker._popupContainer)
    marker._popupApp = app
  }

  marker.openPopup()
}

function closeStationPopup(marker: StationMarker) {
  marker.closePopup()
}

function unmountPopupApp(marker: StationMarker) {
  if (marker._popupApp) {
    marker._popupApp.unmount()
    marker._popupApp = undefined
  }
}

// --- Map update ---

async function updateMap() {
  if (!map) return
  cancel('update_map')

  try {
    const resp = await getStations(map.getBounds(), timelineStore.time, mapStore.showAllStations)
    if (!resp?.stations) return
    mapStore.setStations(resp.stations)
    redrawMarkers(resp.stations)
    // Periodic refresh only in realtime mode
    if (timelineStore.isRealtime) {
      schedule('update_map', updateMap, configStore.mapRefreshPeriod)
    }
  } catch (e) {
    console.error('Failed to fetch stations:', e)
    if (timelineStore.isRealtime) {
      schedule('update_map', updateMap, configStore.mapRefreshPeriod)
    }
  }
}

function scheduleMapUpdate(delayMs: number) {
  cancel('update_map')
  schedule('update_map', updateMap, delayMs)
}

function redrawMarkers(stations: Station[]) {
  // Remove stale markers
  const stationIds = new Set(stations.map(s => String(s.id)))
  for (const id of Object.keys(markers)) {
    if (!stationIds.has(id)) {
      map?.removeLayer(markers[id])
      unmountPopupApp(markers[id])
      delete markers[id]
    }
  }

  // Add or update markers
  for (const station of stations) {
    const lm = station.last_measurement
    let iconOptions: L.BeautifyIcon.IconOptions

    if (lm) {
      const aqi = Math.round(lm.aqi)
      iconOptions = {
        iconSize: [40, 40],
        iconAnchor: [20, 25],
        innerIconAnchor: [-1, 7],
        isAlphaNumericIcon: true,
        text: aqi,
        iconShape: 'marker',
        borderColor: 'lightgray',
        backgroundColor: getMarkerColor(aqi),
        textColor: getMarkerTextColor(aqi)
      }
    } else {
      iconOptions = {
        iconSize: [40, 40],
        iconAnchor: [20, 25],
        innerIconAnchor: [-2, 10],
        icon: 'question-circle',
        isAlphaNumericIcon: false,
        iconShape: 'marker',
        borderColor: 'darkgray',
        backgroundColor: 'lightgray',
        textColor: 'white'
      }
    }

    const icon = L.BeautifyIcon.icon(iconOptions)

    const sid = String(station.id)
    let marker = markers[sid] as StationMarker | undefined
    if (!marker) {
      marker = new L.Marker(new L.LatLng(station.lat, station.long), { icon }) as StationMarker
      markers[sid] = marker
      map?.addLayer(marker)

      // Pre-bind an empty popup container so Leaflet is aware of it.
      // Then immediately remove Leaflet's internal click-to-toggle handler
      // (added by bindPopup) so only our custom click handler controls the popup.
      const container = L.DomUtil.create('div')
      marker._popupContainer = container
      marker.bindPopup(container, { maxWidth: 280, minWidth: 260 })
      marker.off('click')

      marker.on('mouseover', (e) => {
        const m = e.target as StationMarker
        if (!mapStore.popupPinned) openStationPopup(m)
      })
      marker.on('click', (e) => {
        const m = e.target as StationMarker
        if (mapStore.popupOpened) {
          if (mapStore.popupPinned) {
            closeStationPopup(m)
            mapStore.popupPinned = false
          } else {
            mapStore.popupPinned = true
          }
        } else {
          openStationPopup(m)
          mapStore.popupPinned = true
        }
      })
      marker.on('mouseout', (e) => {
        const m = e.target as StationMarker
        if (!mapStore.popupPinned) closeStationPopup(m)
      })
    } else {
      marker.setIcon(icon)
    }

    marker.station = station
  }
}

// --- Lifecycle ---

onMounted(() => {
  if (!mapContainer.value) return

  // Check ?stations=all query param
  const urlParams = new URLSearchParams(window.location.search)
  mapStore.showAllStations = urlParams.get('stations') === 'all'

  map = L.map(mapContainer.value, { zoomControl: false, attributionControl: false })

  const mapAttrControl = L.control.attribution().addTo(map)
  mapAttrControl.setPrefix('<a href="https://leafletjs.com/">Leaflet</a>')

  L.control.zoom({ position: 'topright' }).addTo(map)

  // @ts-ignore — locatecontrol extends L.control
  L.control.locate({
    position: 'topright',
    showPopup: false,
    locateOptions: { maxZoom: 13 }
  }).addTo(map)

  L.tileLayer(
    'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
    {
      maxZoom: 18,
      tileSize: 512,
      zoomOffset: -1,
      attribution:
        'Sensor data &copy; <a href="https://github.com/openairtech">OpenAir</a>, ' +
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: '3cky/ckb6j1jgm24uo1ip941iiun54',
      accessToken: configStore.mapboxToken
    } as L.TileLayerOptions & { id: string; accessToken: string }
  ).addTo(map)

  // Popup open/close tracking
  map.on('popupopen', () => { mapStore.popupOpened = true })
  map.on('popupclose', () => {
    mapStore.popupOpened = false
    mapStore.popupPinned = false
    mapStore.selectStation(null)
  })

  // Map move triggers map update
  map.on('moveend', () => {
    if (map) mapStore.setView(map.getCenter(), map.getZoom())
    scheduleMapUpdate(0)
  })

  // Try to restore view from localStorage first
  // @ts-ignore — restoreView added by vendor plugin
  const restored = map.restoreView()

  // Permalink takes priority over localStorage
  const hash = window.location.hash.replace(/^#\/?/, '')
  const parts = hash.split(',')
  if (parts.length >= 3) {
    const lat = parseFloat(parts[0])
    const lng = parseFloat(parts[1])
    const zoom = parseInt(parts[2], 10)
    if (!isNaN(lat) && !isNaN(lng) && !isNaN(zoom)) {
      const time = parts.length >= 4 ? parseInt(parts[3], 10) : 0
      timelineStore.setTime(time || null)
      map.setView([lat, lng], zoom)
    } else if (!restored) {
      map.setView(configStore.mapCenter, configStore.mapZoom)
    }
  } else if (!restored) {
    map.setView(configStore.mapCenter, configStore.mapZoom)
  }
})

onUnmounted(() => {
  cancel('update_map')
  if (map) {
    map.remove()
    map = null
  }
})

// Trigger map update when the timeline store changes.
// $onAction is used instead of watch() because it fires reliably for all
// actions — both direct calls (stepForward/Back, jumpToNow) and slider drag
// (onSliderChange). Discrete actions use 0 ms delay; slider drag uses 250 ms
// so rapid movements are debounced into a single API call.
// When a step action internally calls onSliderChange, $onAction fires for both;
// the outer action's after() runs last (0 ms) and overrides the inner 250 ms timer.
timelineStore.$onAction(({ name, after }) => {
  if (name === 'onSliderChange') {
    after(() => scheduleMapUpdate(250))
  } else if (['setTime', 'stepForward', 'stepBackward', 'jumpToNow', 'setDay'].includes(name)) {
    after(() => scheduleMapUpdate(0))
  }
})

// Restore map position on browser back/forward navigation
mapStore.$onAction(({ name, args, after }) => {
  if (name === 'navigateTo') {
    after(() => {
      const [c, z] = args as [{ lat: number; lng: number }, number]
      if (map) map.setView([c.lat, c.lng], z, { animate: false })
    })
  }
})
</script>

<style scoped>
#map {
  width: 100%;
  height: 100%;
}
</style>
