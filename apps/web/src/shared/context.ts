import { createContext, useCallback, useContext } from "react";
import { translate, type Language } from "../lib/i18n";

export const LanguageContext = createContext<Language>("English");

export function useCopy() {
  const language = useContext(LanguageContext);
  return useCallback(
    (key: string, values?: Record<string, string | number>) => translate(language, key, values),
    [language],
  );
}
