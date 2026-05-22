<template>
  <div class="aqi-chart-wrapper">
    <Bar :key="chartKey" :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip
} from 'chart.js'
import dayjs from 'dayjs'
import { useTimelineStore } from '@/stores/timeline'
import { useConfigStore } from '@/stores/config'
import { useMapStore } from '@/stores/map'
import { getMeasurements } from '@/api/openair'
import { useAqiColors } from '@/composables/useAqiColors'
import type { Measurement } from '@/types/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip)

const props = defineProps<{ stationId: number }>()

const timelineStore = useTimelineStore()
const configStore = useConfigStore()
const mapStore = useMapStore()
const { getMarkerColor } = useAqiColors()

const isVisible = computed(() => mapStore.popupOpened && mapStore.selectedStationId === props.stationId)

const chartKey = ref(0)
const measurements = ref<Measurement[]>([])
const lastFetchTime = ref<number | null>(null)

async function fetchMeasurements() {
  const anchor = dayjs.unix(timelineStore.time)

  const ranges = timeRanges.value
  const refUnix = anchor.unix()

  if (lastFetchTime.value !== null) {
    if (Math.abs(refUnix - lastFetchTime.value) < configStore.chartsUpdatePeriod) return
  }

  lastFetchTime.value = refUnix
  const timeTo = refUnix
  const timeFrom = ranges[0].unix()

  try {
    const resp = await getMeasurements(props.stationId, timeFrom, timeTo, ['aqi'])
    measurements.value = resp.measurements || []
  } catch (e) {
    console.error('Failed to fetch measurements:', e)
  }
}

const timeRanges = computed(() => {
  const anchor = dayjs.unix(timelineStore.time)
  const ranges = []
  for (let h = configStore.chartsTimeWindow - 1; h >= 0; h--) {
    ranges.push(anchor.subtract(h, 'hour').startOf('hour'))
  }
  return ranges
})

interface AggregatedMeasurement { aqi: number; timestamp: number }

const aggregated = computed((): (AggregatedMeasurement | null)[] => {
  const result: (AggregatedMeasurement | null)[] = timeRanges.value.map(() => null)
  for (const m of measurements.value) {
    const mt = dayjs.unix(m.timestamp)
    for (let j = timeRanges.value.length - 1; j >= 0; j--) {
      if ((timeRanges.value[j] as ReturnType<typeof dayjs>).isSameOrBefore(mt)) {
        if (!result[j] || result[j]!.aqi < m.aqi) {
          result[j] = { aqi: m.aqi, timestamp: m.timestamp }
        }
        break
      }
    }
  }
  return result
})

const chartData = computed(() => ({
  labels: timeRanges.value.map(t => t.format('HH')),
  datasets: [{
    label: 'AQI',
    data: aggregated.value.map(m => m?.aqi ?? null),
    backgroundColor: aggregated.value.map(m => m ? getMarkerColor(m.aqi) : 'rgba(0,0,0,0.05)'),
    borderWidth: 1
  }]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: {
      display: true,
      text: 'AQI',
      font: { size: 10 },
      padding: { top: 2, bottom: 2 }
    },
    tooltip: {
      callbacks: {
        title: (items: { dataIndex: number }[]) => {
          const agg = aggregated.value[items[0].dataIndex]
          if (agg) return dayjs.unix(agg.timestamp).format('lll')
          return timeRanges.value[items[0].dataIndex]?.format('HH:mm') ?? ''
        }
      }
    }
  },
  scales: {
    y: { beginAtZero: true, ticks: { maxTicksLimit: 5 } }
  },
  onClick: (_evt: unknown, elements: { index: number }[]) => {
    if (elements.length > 0) {
      const m = aggregated.value[elements[0].index]
      if (m) timelineStore.setTime(m.timestamp)
    }
  }
}

watch(isVisible, (visible) => {
  if (visible) {
    chartKey.value++
    fetchMeasurements()
  }
})
watch(() => timelineStore.time, () => { if (isVisible.value) fetchMeasurements() })
</script>

<style scoped>
.aqi-chart-wrapper {
  position: relative;
  width: 250px;
  height: 100px;
}
</style>
