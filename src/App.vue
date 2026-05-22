<template>
  <MapView />
  <MapToolbar />
  <AqiLegend />
  <TimelineController />
</template>

<script setup lang="ts">
import { watch } from 'vue'
import MapView from './components/MapView.vue'
import MapToolbar from './components/MapToolbar.vue'
import AqiLegend from './components/AqiLegend.vue'
import TimelineController from './components/TimelineController.vue'
import { usePermalink } from './composables/usePermalink'
import { useTimelineStore } from './stores/timeline'
import { useThemeStore } from './stores/theme'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './assets/css/main.css'

const { parseHash } = usePermalink()
const timelineStore = useTimelineStore()

// Initialize timeline from permalink synchronously in setup() — before any child
// component mounts — so @vueform/slider gets the correct start position on first render.
const permalink = parseHash()
if (permalink) timelineStore.setTime(permalink.time || null)

// Initialize theme and keep data-bs-theme on <html> in sync.
// immediate: true sets the attribute before any child mounts, preventing a flash.
const themeStore = useThemeStore()
themeStore.init()
watch(
  () => themeStore.isDark,
  (dark) => document.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light'),
  { immediate: true }
)
</script>
