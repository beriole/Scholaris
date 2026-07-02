import { useI18n } from '../i18n/i18n';

interface Props { className?: string; }

/** Bascule FR / EN — style pilule compacte. */
export default function LanguageToggle({ className = '' }: Props) {
    const { lang, setLang } = useI18n();
    return (
        <div className={`inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-bold ${className}`}>
            <button
                onClick={() => setLang('fr')}
                className={`px-2 py-1 rounded-md transition-all ${lang === 'fr' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                aria-pressed={lang === 'fr'}
            >
                FR
            </button>
            <button
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded-md transition-all ${lang === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                aria-pressed={lang === 'en'}
            >
                EN
            </button>
        </div>
    );
}
