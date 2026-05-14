<template>
  <div id="legend" class="container legend fixed-bottom">
    <div v-for="item in legendItems" :key="item.id" class="row">
      <div class="col-md-auto">
        <span
          :id="item.id"
          :class="[item.position, item.color]"
          :ref="(el) => initTooltip(el as HTMLElement | null, item)"
        ></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Tooltip } from 'bootstrap'

const { t } = useI18n()

const legendItems = [
  { id: 'legend-maroon', color: 'maroon', position: 'top',    labelKey: 'legend.hazardous',        breakpoints: '>300' },
  { id: 'legend-purple', color: 'purple', position: 'inner',  labelKey: 'legend.veryUnhealthy',    breakpoints: '201..300' },
  { id: 'legend-red',    color: 'red',    position: 'inner',  labelKey: 'legend.unhealthy',        breakpoints: '151..200' },
  { id: 'legend-orange', color: 'orange', position: 'inner',  labelKey: 'legend.unhealthySensitive', breakpoints: '101..150' },
  { id: 'legend-yellow', color: 'yellow', position: 'inner',  labelKey: 'legend.fair',             breakpoints: '51..100' },
  { id: 'legend-green',  color: 'green',  position: 'bottom', labelKey: 'legend.excellent',        breakpoints: '≤50' }
]

const tooltips: Tooltip[] = []

function initTooltip(el: HTMLElement | null, item: typeof legendItems[0]) {
  if (!el) return
  const tt = new Tooltip(el, {
    delay: { show: 100, hide: 100 },
    placement: 'right',
    html: true,
    trigger: 'hover',
    title: `${t(item.labelKey)}<br><b>AQI: ${item.breakpoints}</b>`
  })
  tooltips.push(tt)
}

onUnmounted(() => {
  tooltips.forEach(tt => tt.dispose())
  tooltips.length = 0
})
</script>
