import type { LatLngBounds } from 'leaflet'
import type { StationsResponse, MeasurementsResponse } from '@/types/api'
import { useConfigStore } from '@/stores/config'

async function apiGet<T>(path: string): Promise<T> {
  const config = useConfigStore()
  const response = await fetch(config.apiUrl + path)
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export async function getStations(
  bounds: LatLngBounds,
  time: number | null,
  showAll: boolean
): Promise<StationsResponse> {
  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()
  let path = `/stations?bbox=${sw.lng},${sw.lat},${ne.lng},${ne.lat}`
  if (time !== null) path += `&mfrom=${time}`
  path += '&mlast=3h'
  if (showAll) path += '&sall=true'
  return apiGet<StationsResponse>(path)
}

export async function getMeasurements(
  stationId: number,
  timeFrom: number,
  timeTo: number,
  vars?: string[]
): Promise<MeasurementsResponse> {
  let path = `/measurements?station=${stationId}&from=${timeFrom}&to=${timeTo}`
  if (vars?.length) path += `&v=${vars.join(',')}`
  return apiGet<MeasurementsResponse>(path)
}
