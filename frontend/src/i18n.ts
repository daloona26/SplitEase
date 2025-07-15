import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpApi from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  // Use i18next-http-backend to load translation files from a server/public folder
  .use(HttpApi)
  // Use i18next-browser-languagedetector to detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    // Default language
    fallbackLng: "en",
    // Supported languages
    supportedLngs: ["en", "ar", "hi", "es", "fr", "it"],
    // Enable debug mode for development
    debug: true,
    // Configuration for react-i18next
    react: {
      useSuspense: false, // Set to false to avoid Suspense-related issues
    },
    // Backend configuration
    backend: {
      // Path to your translation files
      loadPath: "/locales/{{lng}}/translation.json",
    },
    // Interpolation settings to allow variables in translations
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;

