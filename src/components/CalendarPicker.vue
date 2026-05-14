<template>
  <div class="datepicker datepicker-inline">
    <div class="datepicker-days">
      <table class="table-condensed">
        <thead>
          <tr>
            <th class="prev" @click="prevMonth">«</th>
            <th colspan="5" class="datepicker-switch">{{ monthLabel }}</th>
            <th class="next" :class="{ disabled: atMaxMonth }" @click="nextMonth">»</th>
          </tr>
          <tr>
            <th v-for="h in dowHeaders" :key="h" class="dow">{{ h }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(week, wi) in weeks" :key="wi">
            <td
              v-for="(day, di) in week"
              :key="di"
              class="day"
              :class="dayClass(day)"
              @click="onDayClick(day)"
            >{{ day.date() }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr><th colspan="7" class="today" @click="emit('select', null)">{{ t('calendar.today') }}</th></tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs, { type Dayjs } from 'dayjs'

const props = defineProps<{ modelValue: Dayjs | null }>()
const emit = defineEmits<{ select: [day: Dayjs | null] }>()
const { t } = useI18n()

const today = dayjs()
const viewMonth = ref((props.modelValue ?? today).startOf('month'))
const atMaxMonth = computed(() => viewMonth.value.isSame(today, 'month'))
const monthLabel = computed(() => viewMonth.value.format('MMMM YYYY'))

// Mon…Sun column headers using current locale
const dowHeaders = computed(() =>
  [1, 2, 3, 4, 5, 6, 0].map(i => dayjs().day(i).format('dd'))
)

// 6-week grid, Mon-first
const weeks = computed((): Dayjs[][] => {
  const start = viewMonth.value.startOf('month')
  const offset = (start.day() + 6) % 7  // Sun=0 → Mon=0 scheme
  const gridStart = start.subtract(offset, 'day')
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => gridStart.add(w * 7 + d, 'day'))
  )
})

function dayClass(day: Dayjs) {
  return {
    old: day.isBefore(viewMonth.value, 'month'),
    new: day.isAfter(viewMonth.value, 'month'),
    today: day.isSame(today, 'day'),
    active: props.modelValue != null && day.isSame(props.modelValue, 'day'),
    disabled: day.isAfter(today, 'day')
  }
}

function onDayClick(day: Dayjs) {
  if (day.isAfter(today, 'day')) return
  // Today → return to realtime; any past day → history mode
  emit('select', day.isSame(today, 'day') ? null : day)
}

function prevMonth() { viewMonth.value = viewMonth.value.subtract(1, 'month') }
function nextMonth() { if (!atMaxMonth.value) viewMonth.value = viewMonth.value.add(1, 'month') }
</script>
