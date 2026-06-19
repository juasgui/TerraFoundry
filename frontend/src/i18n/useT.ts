import { useAppStore } from '../store/appStore';
import { TRANSLATIONS, interpolate } from './translations';

export function useT() {
  const language = useAppStore((s) => s.language);
  return (key: string, vars?: Record<string, string | number>): string => {
    const val = TRANSLATIONS[language]?.[key] ?? TRANSLATIONS.en[key] ?? key;
    return vars ? interpolate(val, vars) : val;
  };
}
