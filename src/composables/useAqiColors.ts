export function useAqiColors() {
  function getMarkerColor(aqi: number): string {
    if (aqi < 51) return 'green'
    if (aqi < 101) return 'yellow'
    if (aqi < 151) return 'orange'
    if (aqi < 201) return 'red'
    if (aqi < 301) return 'purple'
    return 'maroon'
  }

  function getMarkerTextColor(aqi: number): string {
    if (aqi < 51 || aqi >= 151) return 'white'
    return 'black'
  }

  return { getMarkerColor, getMarkerTextColor }
}
