"use client";

import { createContext, useContext, useState } from "react";

type Language = "en" | "hi" | "mr";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

import en from "../../public/locales/en/common.json";
import hi from "../../public/locales/hi/common.json";
import mr from "../../public/locales/mr/common.json";

const translations: Record<Language, Record<string, unknown>> = { en, hi, mr };

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string): string => {
    const keys = key.split(".");
    let value: unknown = translations[language];
    for (const k of keys) {
      if (value == null || typeof value !== "object") return key;
      value = (value as Record<string, unknown>)[k];
      if (value === undefined) return key;
    }
    return value as string;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
