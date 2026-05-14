import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { LatLng } from 'leaflet'
import type { Station } from '@/types/api'

export const useMapStore = defineStore('map', () => {
  const stations = ref<Station[]>([])
  const center = ref<LatLng | null>(null)
  const zoom = ref<number>(13)
  const selectedStationId = ref<number | null>(null)
  const popupPinned = ref(false)
  const popupOpened = ref(false)
  const showAllStations = ref(false)

  const selectedStation = computed(() =>
    stations.value.find(s => s.id === selectedStationId.value) ?? null
  )

  function setStations(data: Station[]) { stations.value = data }
  function setView(c: LatLng, z: number) { center.value = c; zoom.value = z }
  function selectStation(id: number | null) { selectedStationId.value = id }
  // Called by popstate to imperatively reposition the Leaflet map via $onAction in MapView
  function navigateTo(c: { lat: number; lng: number }, z: number) { center.value = c as LatLng; zoom.value = z }

  return {
    stations, center, zoom, selectedStationId, selectedStation,
    popupPinned, popupOpened, showAllStations,
    setStations, setView, selectStation, navigateTo
  }
})
