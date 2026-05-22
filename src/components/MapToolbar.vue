<template>
  <div id="map-toolbar">
    <a class="toolbar-btn" href="#" :title="t('theme.toggle')" @click.prevent="themeStore.toggle()">
      <i :class="themeIcon"></i>
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '@/stores/theme'

const { t } = useI18n()
const themeStore = useThemeStore()

const themeIcon = computed(() =>
  themeStore.isDark ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill'
)
</script>
