import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ru from './locales/ru.json'

const browserLocale = navigator.language || 'ru'
const locale = browserLocale.startsWith('ru') ? 'ru' : 'en'

const i18n = createI18n({
  legacy: false,
  locale,
  fallbackLocale: 'ru',
  messages: { en, ru }
})

export default i18n
export { locale }
