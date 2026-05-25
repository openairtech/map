<template>
  <nav
    id="timeline-controller"
    class="navbar navbar-expand navbar-light mx-auto py-0 ps-2 pe-3 mb-4 fixed-bottom"
  >
    <!-- Logo / Permalink copy -->
    <a id="navbar-brand-link" class="navbar-brand" href="#">
      <div
        id="permalink-copy"
        ref="permalinkRef"
        @mouseenter="onPermalinkMouseenter"
        @mouseleave="onPermalinkMouseleave"
        @click.prevent="copyPermalink"
      >
        <img id="navbar-logo" src="/android-chrome-192x192.png" alt="OpenAir logo" style="width:1.5em;" />
      </div>
    </a>

    <!-- Step controls -->
    <ul class="navbar-nav">
      <li class="nav-item">
        <a id="timeline-step-backward" class="nav-link" href="#" @click.prevent="timelineStore.stepBackward()">
          <i ref="stepBackwardRef" class="bi bi-skip-backward-fill"></i>
        </a>
      </li>
      <li class="nav-item">
        <a id="timeline-step-forward" class="nav-link" href="#" @click.prevent="timelineStore.stepForward()">
          <i ref="stepForwardRef" class="bi bi-skip-forward-fill"></i>
        </a>
      </li>
      <li class="nav-item">
        <a id="timeline-fast-forward" class="nav-link" href="#" @click.prevent="timelineStore.jumpToNow()">
          <i ref="jumpToNowRef" class="bi bi-fast-forward-fill"></i>
        </a>
      </li>
    </ul>

    <!-- Date picker dropup.
         data-bs-toggle is intentionally absent: Bootstrap's data-api click handler
         is at document level and can be swallowed before it arrives there (e.g. by
         noUISlider's internal click handling). The Dropdown instance is created
         programmatically in onMounted and toggled/hidden directly. -->
    <ul class="navbar-nav">
      <li class="nav-item dropup">
        <a
          ref="calendarToggleRef"
          class="nav-link dropdown-toggle"
          href="#"
          @click.prevent="onCalendarToggleClick()"
        >
          <i ref="calendarIconRef" class="bi bi-calendar"></i>
        </a>
        <div ref="calendarMenuRef" class="dropdown-menu p-1">
          <CalendarPicker :model-value="day" @select="onCalendarSelect" />
        </div>
      </li>
    </ul>

    <!-- Timeline slider -->
    <span class="navbar-text w-100 ms-2" :class="{ 'slider-realtime': sliderPos === 0 }">
      <Slider
        :modelValue="sliderPos"
        :min="-TIMELINE_LENGTH"
        :max="0"
        :step="TIMELINE_STEP"
        :tooltips="true"
        :format="formatTooltip"
        @change="onUserSliderChange"
      />
    </span>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Dropdown, Tooltip } from 'bootstrap'
import Slider from '@vueform/slider'
import '@vueform/slider/themes/default.css'
import dayjs from 'dayjs'
import { useTimelineStore, TIMELINE_STEP, TIMELINE_LENGTH } from '@/stores/timeline'
import CalendarPicker from './CalendarPicker.vue'
import type { Dayjs } from 'dayjs'

const { t } = useI18n()
const timelineStore = useTimelineStore()

const { sliderValue: sliderPos, day, sliderEndTime } = storeToRefs(timelineStore)

// --- Calendar dropdown (programmatic Bootstrap Dropdown) ---
const calendarIconRef   = ref<HTMLElement | null>(null)
const calendarToggleRef = ref<HTMLElement | null>(null)
const calendarMenuRef = ref<HTMLElement | null>(null)
let calendarDropdown: Dropdown | null = null

// --- Step button tooltips ---
const stepBackwardRef = ref<HTMLElement | null>(null)
const stepForwardRef  = ref<HTMLElement | null>(null)
const jumpToNowRef    = ref<HTMLElement | null>(null)
let stepBackwardTooltip: Tooltip | null = null
let stepForwardTooltip:  Tooltip | null = null
let jumpToNowTooltip:    Tooltip | null = null
let calendarTooltip:     Tooltip | null = null

function onDocumentClick(e: MouseEvent) {
  const target = e.target as Node
  if (calendarMenuRef.value?.contains(target) || calendarToggleRef.value?.contains(target)) return
  calendarDropdown?.hide()
}

function onDocumentKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') calendarDropdown?.hide()
}

onMounted(() => {
  if (calendarToggleRef.value) {
    calendarDropdown = new Dropdown(calendarToggleRef.value)
  }
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)

  if (permalinkRef.value) {
    permalinkTooltip = new Tooltip(permalinkRef.value, {
      trigger: 'manual',
      placement: 'top',
      title: t('permalink.copyTooltip')
    })
  }

  const stepMinutes = TIMELINE_STEP / 60
  if (stepBackwardRef.value) {
    stepBackwardTooltip = new Tooltip(stepBackwardRef.value, { trigger: 'hover', placement: 'top', title: t('timeline.stepBackward', { minutes: stepMinutes }) })
  }
  if (stepForwardRef.value) {
    stepForwardTooltip = new Tooltip(stepForwardRef.value, { trigger: 'hover', placement: 'top', title: t('timeline.stepForward', { minutes: stepMinutes }) })
  }
  if (jumpToNowRef.value) {
    jumpToNowTooltip = new Tooltip(jumpToNowRef.value, { trigger: 'hover', placement: 'top', title: t('timeline.jumpToNow') })
  }
  if (calendarIconRef.value) {
    calendarTooltip = new Tooltip(calendarIconRef.value, { trigger: 'hover', placement: 'top', title: t('timeline.calendar') })
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
  calendarDropdown?.dispose()
  calendarDropdown = null
  stepBackwardTooltip?.dispose(); stepBackwardTooltip = null
  stepForwardTooltip?.dispose(); stepForwardTooltip = null
  jumpToNowTooltip?.dispose(); jumpToNowTooltip = null
  calendarTooltip?.dispose(); calendarTooltip = null
  if (permalinkHideTimer) clearTimeout(permalinkHideTimer)
  permalinkTooltip?.dispose()
  permalinkTooltip = null
})

// --- Slider ---
function onUserSliderChange(val: number) {
  timelineStore.onSliderChange(val)
}

function formatTooltip(val: number): string {
  if (!day.value && val === 0) return t('timeline.now')
  const end = sliderEndTime.value ?? timelineStore.getRoundedNow()
  return end.add(val, 'second').format('lll')
}

// --- Calendar picker ---
function onCalendarToggleClick() {
  calendarTooltip?.hide()
  calendarDropdown?.toggle()
}

function onCalendarSelect(d: Dayjs | null) {
  calendarDropdown?.hide()
  timelineStore.setDay(d)
}

// --- Permalink copy ---
const permalinkRef = ref<HTMLElement | null>(null)
let permalinkTooltip: Tooltip | null = null
let permalinkHideTimer: ReturnType<typeof setTimeout> | null = null
let permalinkActive = false

function onPermalinkMouseenter() {
  if (!permalinkActive) permalinkTooltip?.show()
}

function onPermalinkMouseleave() {
  if (!permalinkActive) permalinkTooltip?.hide()
}

async function copyPermalink() {
  try {
    permalinkActive = true  // lock before await so mouseleave can't hide the tooltip
    await navigator.clipboard.writeText(window.location.href)
    // If tooltip is already visible update text in-place to avoid Bootstrap's
    // dispose→recreate cycle inside setContent(), which causes a brief DOM gap.
    const visibleInner = document.querySelector('.tooltip-inner')
    if (visibleInner) {
      visibleInner.textContent = t('permalink.copiedTooltip')
      permalinkTooltip?.update()
    } else {
      permalinkTooltip?.setContent({ '.tooltip-inner': t('permalink.copiedTooltip') })
      permalinkTooltip?.show()
    }
    if (permalinkHideTimer) clearTimeout(permalinkHideTimer)
    permalinkHideTimer = setTimeout(() => {
      permalinkActive = false
      permalinkTooltip?.hide()
      permalinkTooltip?.setContent({ '.tooltip-inner': t('permalink.copyTooltip') })
      permalinkHideTimer = null
    }, 1500)
  } catch {
    permalinkActive = false
  }
}
</script>

<style>
#timeline-controller .nav-link,
#navbar-brand-link {
  caret-color: transparent;
  user-select: none;
}
.slider-handle {
  width: 1em !important;
  height: 1em !important;
  border-radius: 50% !important;
  background: #ffffff !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 1px 2px rgba(0,0,0,.05) !important;
}
.slider-track-active {
  background: #0575e4 !important;
}
.slider-tooltip {
  pointer-events: none !important;
  background: #0575e4 !important;
  border-color: #0575e4 !important;
  white-space: nowrap !important;
  transition: opacity 0.15s;
}
/* At realtime (handle at right edge) the tooltip overflows the nav.
   Delay the fade-out so "Сейчас" stays visible briefly after reaching position 0,
   then disappears. Show again immediately on hover/focus. */
.slider-realtime .slider-tooltip {
  opacity: 0;
  transition: opacity 0.4s ease 1.5s;
}
.slider-realtime .slider-handle:hover .slider-tooltip,
.slider-realtime .slider-target:focus-within .slider-tooltip {
  opacity: 1;
  transition: opacity 0.15s;
}
</style>
