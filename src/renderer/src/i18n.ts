/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhCN from './locales/zh-CN.json'
import enUS from './locales/en-US.json'
import { detectLanguage } from './utils/language'

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'en-US': { translation: enUS }
  },
  lng: detectLanguage(navigator.language ?? ''),
  fallbackLng: 'en-US',
  interpolation: {
    prefix: '{',
    suffix: '}',
    escapeValue: false
  }
})

export default i18n
