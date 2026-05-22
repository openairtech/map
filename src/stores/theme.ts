import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

type ColorScheme = 'light' | 'dark'
const STORAGE_KEY = 'colorScheme'

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ColorScheme>('light')
  const isDark = computed<boolean>(() => mode.value === 'dark')

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY) as ColorScheme | null
    if (saved === 'light' || saved === 'dark') {
      mode.value = saved
    } else {
      mode.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
  }

  function toggle() {
    mode.value = mode.value === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, mode.value)
  }

  return { mode, isDark, init, toggle }
})
