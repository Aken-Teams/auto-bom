import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhCN from './zh-CN.json'
import zhTW from './zh-TW.json'
import en from './en.json'

const saved = localStorage.getItem('lang') || 'zh-CN'

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'zh-TW': { translation: zhTW },
    en: { translation: en },
  },
  lng: saved,
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
})

export default i18n
