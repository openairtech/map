<template>
  <div class="container-fluid p-0">
    <div class="row g-0">
      <div class="col-12">
        <h6>{{ station?.desc }}</h6>
      </div>
    </div>

    <div class="row g-0">
      <div class="col-12">
        <AqiChart v-if="station" :station-id="stationId" />
      </div>
    </div>

    <template v-if="station">
      <div class="row g-0">
        <div class="col-6">{{ t('popup.pm25') }}:</div>
        <div class="col-6"><b>{{ sensorVal('pm25') }} {{ t('popup.units.ugm3') }}</b></div>
      </div>

      <div class="row g-0">
        <div class="col-6">{{ t('popup.pm10') }}:</div>
        <div class="col-6"><b>{{ sensorVal('pm10') }} {{ t('popup.units.ugm3') }}</b></div>
      </div>

      <div class="row g-0 mt-1">
        <div class="col-6">{{ t('popup.temperature') }}:</div>
        <div class="col-6"><b>{{ sensorVal('temperature') }} {{ t('popup.units.celsius') }}</b></div>
      </div>

      <div class="row g-0">
        <div class="col-6">{{ t('popup.humidity') }}:</div>
        <div class="col-6"><b>{{ sensorVal('humidity') }} {{ t('popup.units.percent') }}</b></div>
      </div>

      <div class="row g-0 mt-1">
        <div class="col-12">{{ timestampLabel }}</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { useMapStore } from '@/stores/map'
import { useTimelineStore } from '@/stores/timeline'
import AqiChart from './AqiChart.vue'
import type { LastMeasurement } from '@/types/api'

const props = defineProps<{ stationId: number }>()

const { t } = useI18n()
const mapStore = useMapStore()
const timelineStore = useTimelineStore()

const station = computed(() => mapStore.stations.find(s => s.id === props.stationId) ?? null)
const lm = computed(() => station.value?.last_measurement ?? null)

function sensorVal(key: keyof LastMeasurement): string {
  const m = lm.value
  if (m && key in m) {
    const v = m[key]
    if (typeof v === 'number') return v.toFixed(1)
  }
  return '--'
}

const timestampLabel = computed(() => {
  const m = lm.value
  if (m) {
    if (timelineStore.time) {
      return t('popup.timeAt', { time: dayjs.unix(m.timestamp).format('lll') })
    } else {
      return t('popup.updatedAt', { time: dayjs.unix(m.timestamp).fromNow() })
    }
  }
  const seen = station.value?.seen
  if (seen) {
    const seenTime = dayjs.unix(seen)
    if (!timelineStore.time || dayjs.unix(timelineStore.time).isAfter(seenTime)) {
      return t('popup.noDataSince', { time: seenTime.format('lll') })
    }
  }
  return ''
})
</script>
