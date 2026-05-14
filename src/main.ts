import { createApp } from 'vue'
import { pinia } from './plugins'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import 'dayjs/locale/ru'
import 'dayjs/locale/en'

import App from './App.vue'
import i18n, { locale } from './i18n'

dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)
dayjs.extend(isSameOrBefore)
dayjs.locale(locale)

const app = createApp(App)
app.use(pinia)
app.use(i18n)
app.mount('#app')
