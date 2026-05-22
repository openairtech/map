import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import dayjs, { type Dayjs } from 'dayjs'

export const TIMELINE_STEP = 10 * 60           // 10 minutes in seconds
export const TIMELINE_LENGTH = 24 * 60 * 60 - TIMELINE_STEP  // 23h50m in seconds

export const useTimelineStore = defineStore('timeline', () => {
  const time = ref<number>(dayjs().unix())
  const day = ref<Dayjs | null>(null)           // null = today
  const sliderValue = ref<number>(0)            // range: [-TIMELINE_LENGTH, 0]
  const sliderEndTime = ref<Dayjs | null>(null) // right edge of slider window

  const isRealtime = computed(() => !day.value && sliderValue.value === 0)

  function getRoundedNow(): Dayjs {
    return dayjs.unix(Math.ceil(dayjs().unix() / TIMELINE_STEP) * TIMELINE_STEP)
  }

  // Called when slider value changes — updates time from slider position
  function onSliderChange(val: number) {
    sliderValue.value = val
    if (!day.value && val === 0) {
      time.value = dayjs().unix()
      sliderEndTime.value = null
    } else {
      if (day.value) {
        sliderEndTime.value = day.value.add(TIMELINE_LENGTH, 'second')
      } else if (!sliderEndTime.value) {
        sliderEndTime.value = getRoundedNow()
      }
      time.value = sliderEndTime.value.add(val, 'second').unix()
    }
  }

  // Sets time programmatically (permalink restore, chart click)
  function setTime(unixTime: number | null) {
    if (unixTime === null) {
      time.value = dayjs().unix()
      day.value = null
      sliderValue.value = 0
      sliderEndTime.value = null
      return
    }
    time.value = unixTime
    const t = dayjs.unix(unixTime)
    if (t.isBefore(dayjs().subtract(1, 'day'))) {
      const d = t.startOf('day')
      day.value = d
      sliderEndTime.value = d.add(TIMELINE_LENGTH, 'second')
    } else {
      day.value = null
      sliderEndTime.value = getRoundedNow()
    }
    // Negative offset from end time
    sliderValue.value = t.diff(sliderEndTime.value, 'second')
  }

  function stepForward() {
    const nextVal = sliderValue.value + TIMELINE_STEP
    if (nextVal <= 0) {
      onSliderChange(nextVal)
    } else if (day.value) {
      day.value = day.value.add(1, 'day')
      if (day.value.isBefore(dayjs(), 'day')) {
        // Still in past — go to start of next past day
        sliderEndTime.value = day.value.add(TIMELINE_LENGTH, 'second')
        onSliderChange(-TIMELINE_LENGTH)
      } else {
        // Crossed into today → jump to realtime
        day.value = null
        sliderEndTime.value = null
        onSliderChange(0)
      }
    } else {
      // Already at realtime
      onSliderChange(0)
    }
  }

  function stepBackward() {
    const nextVal = sliderValue.value - TIMELINE_STEP
    if (nextVal >= -TIMELINE_LENGTH) {
      onSliderChange(nextVal)
    } else if (day.value) {
      // Go to end of the previous past day
      day.value = day.value.subtract(1, 'day')
      sliderEndTime.value = day.value.add(TIMELINE_LENGTH, 'second')
      onSliderChange(0)
    } else {
      // Today mode — jump to start of yesterday
      if (!sliderEndTime.value) {
        sliderEndTime.value = getRoundedNow()
      }
      const yesterday = sliderEndTime.value.subtract(1, 'day').startOf('day')
      day.value = yesterday
      sliderEndTime.value = yesterday.add(TIMELINE_LENGTH, 'second')
      onSliderChange(-TIMELINE_LENGTH)
    }
  }

  function jumpToNow() {
    day.value = null
    sliderEndTime.value = null
    onSliderChange(0)
  }

  function setDay(d: Dayjs | null) {
    day.value = d
    if (!d) {
      sliderEndTime.value = null
      onSliderChange(0)
    } else {
      sliderEndTime.value = d.add(TIMELINE_LENGTH, 'second')
      onSliderChange(-TIMELINE_LENGTH)
    }
  }

  function tickRealtime() {
    if (isRealtime.value) time.value = dayjs().unix()
  }

  return {
    time, day, sliderValue, sliderEndTime, isRealtime,
    setTime, stepForward, stepBackward, jumpToNow, setDay, onSliderChange, getRoundedNow, tickRealtime
  }
})
