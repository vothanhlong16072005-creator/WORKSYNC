import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi.json';
import en from './locales/en.json';

const savedLanguage = localStorage.getItem('app_language') || 'vi';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    lng: savedLanguage,
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false,
    },
  });

export const changeLanguage = (lng: 'vi' | 'en') => {
  localStorage.setItem('app_language', lng);
  i18n.changeLanguage(lng);
};

export default i18n;
