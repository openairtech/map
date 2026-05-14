<template>
  <MapView />
  <AqiLegend />
  <TimelineController />
</template>

<script setup lang="ts">
import MapView from './components/MapView.vue'
import AqiLegend from './components/AqiLegend.vue'
import TimelineController from './components/TimelineController.vue'
import { usePermalink } from './composables/usePermalink'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './assets/css/main.css'

usePermalink()
</script>
