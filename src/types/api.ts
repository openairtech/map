export interface LastMeasurement {
  aqi: number
  pm25?: number
  pm10?: number
  temperature?: number
  humidity?: number
  timestamp: number
}

export interface Station {
  id: number
  lat: number
  long: number
  desc: string
  seen?: number
  last_measurement?: LastMeasurement
}

export interface Measurement {
  timestamp: number
  aqi: number
  pm25?: number
  pm10?: number
  temperature?: number
  humidity?: number
}

export interface StationsResponse {
  stations: Station[]
}

export interface MeasurementsResponse {
  measurements: Measurement[]
}
