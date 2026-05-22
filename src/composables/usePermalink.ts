import { watch } from 'vue'
import { useMapStore } from '@/stores/map'
import { useTimelineStore } from '@/stores/timeline'

export function usePermalink() {
  const mapStore = useMapStore()
  const timelineStore = useTimelineStore()

  let _skipNextUpdate = false

  function parseHash(): { lat: number; lng: number; zoom: number; time: number | null } | null {
    const hash = window.location.hash.replace(/^#\/?/, '')
    const parts = hash.split(',')
    if (parts.length < 3) return null
    const lat = parseFloat(parts[0])
    const lng = parseFloat(parts[1])
    const zoom = parseInt(parts[2], 10)
    const time = parts.length >= 4 ? parseInt(parts[3], 10) : null
    if (isNaN(lat) || isNaN(lng) || isNaN(zoom)) return null
    return { lat, lng, zoom, time }
  }

  function buildHash(): string {
    const c = mapStore.center
    if (!c) return ''
    let hash = `#${Math.round(c.lat * 1e5) / 1e5},${Math.round(c.lng * 1e5) / 1e5},${mapStore.zoom}z`
    if (!timelineStore.isRealtime) hash += `,${timelineStore.time}t`
    return hash
  }

  function updatePermalink() {
    if (_skipNextUpdate) {
      _skipNextUpdate = false
      return
    }
    const hash = buildHash()
    if (!hash || window.location.hash === hash) return
    const c = mapStore.center
    // Use plain serializable objects — Vue Proxy cannot be structured-cloned by pushState
    const state = {
      center: c ? { lat: c.lat, lng: c.lng } : null,
      zoom: mapStore.zoom,
      time: timelineStore.isRealtime ? null : timelineStore.time
    }
    window.history.pushState(state, '', hash)
  }

  // Watch store state and update URL
  watch([() => mapStore.center, () => mapStore.zoom, () => timelineStore.isRealtime, () => timelineStore.isRealtime ? null : timelineStore.time], updatePermalink)

  // Browser back/forward navigation
  window.addEventListener('popstate', (event) => {
    if (!event.state) return
    _skipNextUpdate = true
    timelineStore.setTime(event.state.time ?? null)
    if (event.state.center && event.state.zoom) {
      mapStore.navigateTo(event.state.center, event.state.zoom)
    }
  })

  return { parseHash, buildHash }
}
