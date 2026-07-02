import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { EN } from './en';

type Lang = 'fr' | 'en';

interface I18nContextValue {
    lang: Lang;
    setLang: (l: Lang) => void;
    toggle: () => void;
    /** Traduit une chaîne française. Repli sur le français si absent du dictionnaire EN. */
    t: (fr: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('scholaris_lang') as Lang) || 'fr');

    useEffect(() => {
        localStorage.setItem('scholaris_lang', lang);
        document.documentElement.lang = lang;
    }, [lang]);

    const setLang = useCallback((l: Lang) => setLangState(l), []);
    const toggle  = useCallback(() => setLangState(p => (p === 'fr' ? 'en' : 'fr')), []);
    const t = useCallback((fr: string) => (lang === 'en' ? (EN[fr] ?? fr) : fr), [lang]);

    return (
        <I18nContext.Provider value={{ lang, setLang, toggle, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error('useI18n doit être utilisé dans I18nProvider');
    return ctx;
}
