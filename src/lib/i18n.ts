import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../../public/locales/en/common.json';
import hi from '../../public/locales/hi/common.json';
import mr from '../../public/locales/mr/common.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en },
      hi: { common: hi },
      mr: { common: mr },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

