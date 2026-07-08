import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    GraduationCap, ArrowRight, CheckCircle2, BookOpen, Award, Trophy,
    Building2, Baby, FlaskConical, Library, Dumbbell, Music, Palette,
    MapPin, Phone, Mail, Clock, Star, Sparkles, Quote, ChevronRight,
    ShieldCheck, Globe, HeartHandshake, Menu, School,
} from 'lucide-react';
import { useI18n } from '../i18n/i18n';
import LanguageToggle from '../components/LanguageToggle';

// ── Compteur animé ────────────────────────────────────────────────────────────
function CountUp({ to, suffix = '', duration = 1.6 }: { to: number; suffix?: string; duration?: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, margin: '-60px' });
    const [n, setN] = useState(0);
    useEffect(() => {
        if (!inView) return;
        let raf = 0; const start = performance.now();
        const tick = (now: number) => {
            const p = Math.min(1, (now - start) / (duration * 1000));
            setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [inView, to, duration]);
    return <span ref={ref}>{n}{suffix}</span>;
}

// ── Reveal (apparition au scroll) ─────────────────────────────────────────────
const Reveal = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) => (
    <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-70px' }}
        transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
        className={className}
    >
        {children}
    </motion.div>
);

const Logo = ({ dark = false }: { dark?: boolean }) => (
    <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 p-[2px] shadow-sm">
            <div className="w-full h-full rounded-[10px] bg-emerald-800 flex items-center justify-center">
                <span className="text-amber-300 font-black text-xs tracking-tight">GH</span>
            </div>
        </div>
        <div className="leading-tight">
            <span className={`block font-extrabold text-[15px] tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>Green Hills Academy</span>
            <span className="block text-[9px] uppercase tracking-[0.22em] text-emerald-500 font-bold">Complex · Yaoundé</span>
        </div>
    </div>
);

const NAV = [
    { label: 'Home', href: '#home' },
    { label: 'Programmes', href: '#programmes' },
    { label: 'Why us', href: '#why' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
];

const LandingPage = () => {
    const { t } = useI18n();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 antialiased overflow-x-hidden">

            {/* ── Navbar ─────────────────────────────────────────────────────────── */}
            <header className="fixed top-0 w-full z-50 bg-white/85 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/"><Logo /></Link>
                    <nav className="hidden md:flex items-center gap-1">
                        {NAV.map(item => (
                            <a key={item.label} href={item.href} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all">
                                {t(item.label)}
                            </a>
                        ))}
                    </nav>
                    <div className="flex items-center gap-2">
                        <LanguageToggle />
                        <Link to="/login" className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-semibold rounded-lg hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-sm shadow-emerald-600/20">
                            {t('Portal')} <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <button onClick={() => setMenuOpen(o => !o)} className="md:hidden p-2 text-slate-600"><Menu className="w-5 h-5" /></button>
                    </div>
                </div>
                {menuOpen && (
                    <div className="md:hidden border-t border-slate-100 bg-white px-6 py-3 flex flex-col gap-1">
                        {NAV.map(item => (
                            <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-emerald-50 rounded-lg">{t(item.label)}</a>
                        ))}
                        <Link to="/login" className="mt-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg">{t('Portal')} <ArrowRight className="w-3.5 h-3.5" /></Link>
                    </div>
                )}
            </header>

            {/* ── Hero ───────────────────────────────────────────────────────────── */}
            <section id="home" className="relative pt-28 pb-24 px-6 overflow-hidden">
                {/* fonds animés */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50/70 via-white to-white" />
                <motion.div
                    animate={{ y: [0, 24, 0], x: [0, 12, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -z-10 -top-20 -left-24 w-96 h-96 rounded-full bg-emerald-300/30 blur-3xl" />
                <motion.div
                    animate={{ y: [0, -28, 0], x: [0, -14, 0] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -z-10 top-10 right-0 w-[28rem] h-[28rem] rounded-full bg-amber-200/30 blur-3xl" />

                <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.05fr_1fr] gap-14 items-center">
                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold mb-7">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            {t('Solid Foundation · Discipline · Success')}
                        </div>
                        <h1 className="text-[2.7rem] sm:text-[3.4rem] font-extrabold leading-[1.05] tracking-tight text-slate-900 mb-6">
                            {t('Where every child builds a')}{' '}
                            <span className="relative whitespace-nowrap">
                                <span className="bg-gradient-to-r from-emerald-600 to-emerald-800 bg-clip-text text-transparent">{t('solid future')}</span>
                                <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 200 10" preserveAspectRatio="none">
                                    <path d="M2 7 Q100 -2 198 6" stroke="#f59e0b" strokeWidth="3" fill="none" strokeLinecap="round" />
                                </svg>
                            </span>
                        </h1>
                        <p className="text-lg text-slate-500 leading-relaxed mb-9 max-w-[520px]">
                            {t('A bilingual English–French academy in Yaoundé — from Nursery to Sixth Form and GCE. Nurturing academic excellence, discipline and character since 2004.')}
                        </p>
                        <div className="flex flex-wrap gap-3 mb-10">
                            <a href="#programmes" className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-bold rounded-xl hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-lg shadow-emerald-600/25 hover:-translate-y-0.5">
                                {t('Explore programmes')} <ArrowRight className="w-4 h-4" />
                            </a>
                            <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:border-emerald-300 hover:text-emerald-700 transition-all">
                                {t('Staff portal')}
                            </Link>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                            {['Cameroon GCE Centre', '95%+ pass rate', 'Bilingual learning'].map((item, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> {t(item)}
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <HeroVisual t={t} />
                </div>
            </section>

            {/* ── Bandeau valeurs (marquee) ─────────────────────────────────────── */}
            <div className="border-y border-slate-100 bg-emerald-900 py-3.5 overflow-hidden">
                <motion.div
                    animate={{ x: ['0%', '-50%'] }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
                    className="flex whitespace-nowrap gap-10 text-emerald-100/90 text-sm font-semibold">
                    {Array.from({ length: 2 }).flatMap((_, k) =>
                        ['Excellence', 'Discipline', 'Integrity', 'Bilingual', 'Innovation', 'Community', 'Faith & Values', 'Since 2004']
                            .map((w, i) => (
                                <span key={`${k}-${i}`} className="flex items-center gap-10">
                                    <span className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-amber-300" /> {t(w)}</span>
                                </span>
                            ))
                    )}
                </motion.div>
            </div>

            {/* ── Stats animées ─────────────────────────────────────────────────── */}
            <section className="py-16 px-6">
                <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { n: 20, s: '+', label: 'Years of excellence' },
                        { n: 95, s: '%+', label: 'GCE pass rate' },
                        { n: 6, s: '', label: 'Programmes & sections' },
                        { n: 100, s: '%', label: 'Bilingual (EN·FR)' },
                    ].map((st, i) => (
                        <Reveal key={i} delay={i * 0.08} className="text-center">
                            <p className="text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-emerald-600 to-emerald-800 bg-clip-text text-transparent mb-1">
                                <CountUp to={st.n} suffix={st.s} />
                            </p>
                            <p className="text-sm font-medium text-slate-500">{t(st.label)}</p>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* ── Programmes ────────────────────────────────────────────────────── */}
            <section id="programmes" className="py-24 px-6 bg-slate-50/70">
                <div className="max-w-7xl mx-auto">
                    <Reveal className="text-center max-w-2xl mx-auto mb-14">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3">{t('Our programmes')}</p>
                        <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">{t('One journey, from first steps to graduation')}</h2>
                        <p className="text-slate-500 leading-relaxed">{t('A complete bilingual pathway — playful early years, strong primary foundations and a rigorous GCE-focused secondary school.')}</p>
                    </Reveal>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {PROGRAMMES.map((p, i) => (
                            <Reveal key={i} delay={(i % 3) * 0.08}>
                                <div className="group h-full p-7 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-900/5 transition-all hover:-translate-y-1">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${p.tint} transition-transform group-hover:scale-110`}>
                                        {p.icon}
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-lg font-bold text-slate-900">{t(p.title)}</h3>
                                    </div>
                                    <p className="text-slate-500 text-sm leading-relaxed mb-4">{t(p.desc)}</p>
                                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                                        {t(p.tag)} <ChevronRight className="w-3.5 h-3.5" />
                                    </p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Why us ────────────────────────────────────────────────────────── */}
            <section id="why" className="py-24 px-6">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_1.1fr] gap-14 items-center">
                    <Reveal>
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3">{t('Why Green Hills')}</p>
                        <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-5">{t('More than a school — a community that raises leaders')}</h2>
                        <p className="text-slate-500 leading-relaxed mb-8">{t('Since 2004, under the vision of founder Mama Julie Kwende, Green Hills Academy Complex has combined academic rigour with moral integrity and holistic growth — helping every learner reach their full potential.')}</p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {WHY.map((w, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">{w.icon}</div>
                                    <div>
                                        <p className="font-semibold text-slate-900 text-sm">{t(w.title)}</p>
                                        <p className="text-slate-500 text-xs leading-relaxed">{t(w.desc)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Reveal>
                    <Reveal delay={0.1}><GalleryGrid t={t} /></Reveal>
                </div>
            </section>

            {/* ── Résultats GCE ─────────────────────────────────────────────────── */}
            <section className="py-16 px-6">
                <div className="max-w-6xl mx-auto relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 p-10 lg:p-14 shadow-xl">
                    <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-amber-300/15 blur-3xl" />
                    <div className="absolute right-0 top-0 h-full w-1.5 bg-gradient-to-b from-amber-300 to-amber-500" />
                    <div className="relative grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-amber-200 text-xs font-bold mb-5">
                                <Award className="w-3.5 h-3.5" /> {t('Accredited GCE Examination Centre')}
                            </div>
                            <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-4">{t('A consistent 95%+ G.C.E. pass rate')}</h2>
                            <p className="text-emerald-100/80 leading-relaxed max-w-lg">{t('Our Ordinary & Advanced Level candidates sit their exams right here on campus — supported by experienced teachers and a proven bilingual method.')}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { n: 95, s: '%+', l: 'O & A Level pass' },
                                { n: 2004, s: '', l: 'Founded', raw: true },
                                { n: 5, s: '', l: 'Secondary forms' },
                                { n: 2, s: '', l: 'Sixth-form levels' },
                            ].map((b, i) => (
                                <div key={i} className="bg-white/10 border border-white/10 rounded-2xl p-5 backdrop-blur">
                                    <p className="text-2xl font-extrabold text-white">{b.raw ? b.n : <CountUp to={b.n} suffix={b.s} />}</p>
                                    <p className="text-emerald-100/70 text-xs mt-1">{t(b.l)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── About / Leadership ────────────────────────────────────────────── */}
            <section id="about" className="py-24 px-6 bg-slate-50/70">
                <div className="max-w-7xl mx-auto">
                    <Reveal className="text-center max-w-2xl mx-auto mb-14">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3">{t('Leadership')}</p>
                        <h2 className="text-4xl font-bold text-slate-900 tracking-tight">{t('Guided by vision and dedication')}</h2>
                    </Reveal>
                    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        {LEADERS.map((l, i) => (
                            <Reveal key={i} delay={i * 0.1}>
                                <div className="relative h-full p-7 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                    <Quote className="absolute right-5 top-5 w-8 h-8 text-emerald-100" />
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 ${l.grad}`}>{l.initials}</div>
                                        <div>
                                            <p className="font-bold text-slate-900">{l.name}</p>
                                            <p className="text-emerald-600 text-xs font-semibold">{t(l.role)}</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-500 text-sm leading-relaxed italic">“{t(l.quote)}”</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Contact ───────────────────────────────────────────────────────── */}
            <section id="contact" className="py-24 px-6">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-stretch">
                    <Reveal>
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3">{t('Visit us')}</p>
                        <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-6">{t('Come and see Green Hills')}</h2>
                        <p className="text-slate-500 leading-relaxed mb-8 max-w-md">{t('Our doors are open to families seeking a caring, bilingual and academically strong education for their children.')}</p>
                        <div className="space-y-4">
                            {CONTACTS.map((c, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">{c.icon}</div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{t(c.label)}</p>
                                        <p className="font-semibold text-slate-800 text-sm">{c.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Link to="/login" className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-bold rounded-xl hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-lg shadow-emerald-600/25">
                            {t('Access the school portal')} <ArrowRight className="w-4 h-4" />
                        </Link>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <div className="relative h-full min-h-[320px] rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-700 to-emerald-950 p-8 flex flex-col justify-between">
                            <div className="absolute inset-0 opacity-20"
                                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
                            <div className="relative">
                                <School className="w-10 h-10 text-amber-300 mb-4" />
                                <p className="text-2xl font-bold text-white leading-tight">Green Hills Academy Complex</p>
                                <p className="text-emerald-100/80 text-sm mt-2">Maison Damas, Yaoundé · Cameroon</p>
                            </div>
                            <div className="relative flex items-center gap-2 text-emerald-100/80 text-sm">
                                <MapPin className="w-4 h-4 text-amber-300" /> {t('A green, welcoming campus in the heart of the city.')}
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ── Footer ────────────────────────────────────────────────────────── */}
            <footer className="bg-slate-950 py-14 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-10 mb-10">
                        <div className="md:col-span-2">
                            <Link to="/" className="inline-block mb-4"><Logo dark /></Link>
                            <p className="text-slate-500 text-sm leading-relaxed max-w-sm">{t('A bilingual academy in Yaoundé, Cameroon — nurturing academic excellence, discipline and character since 2004.')}</p>
                        </div>
                        <div>
                            <p className="text-white font-semibold text-sm mb-4">{t('Explore')}</p>
                            <ul className="space-y-2.5">
                                {NAV.map(n => <li key={n.label}><a href={n.href} className="text-slate-500 text-sm hover:text-white transition-colors">{t(n.label)}</a></li>)}
                            </ul>
                        </div>
                        <div>
                            <p className="text-white font-semibold text-sm mb-4">{t('Contact')}</p>
                            <ul className="space-y-2.5 text-slate-500 text-sm">
                                <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-emerald-500" /> Maison Damas, Yaoundé</li>
                                <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-emerald-500" /> (+237) 670 553 492</li>
                                <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-emerald-500" /> info@greenhills.com</li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-7 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-600 text-sm">© {new Date().getFullYear()} Green Hills Academy Complex · Yaoundé, Cameroon.</p>
                        <p className="text-slate-600 text-xs">{t('Solid Foundation · Discipline · Success')}</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// ── Visuel héros (collage animé, sans image externe) ──────────────────────────
const HeroVisual = ({ t }: { t: (s: string) => string }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
        className="relative select-none">
        <div className="absolute -inset-6 bg-emerald-500/5 rounded-[2rem] blur-2xl pointer-events-none" />
        {/* carte principale */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/50">
            <div className="relative h-[360px] bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900">
                <div className="absolute inset-0 opacity-25"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                {/* toque + motif */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                    <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-24 h-24 rounded-3xl bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center mb-5">
                        <GraduationCap className="w-12 h-12 text-amber-300" />
                    </motion.div>
                    <p className="text-white text-2xl font-extrabold tracking-tight">Green Hills Academy</p>
                    <p className="text-emerald-100/80 text-sm mt-1">{t('Nursery · Primary · Secondary · GCE')}</p>
                    <div className="flex gap-2 mt-5">
                        {['EN', 'FR'].map(l => <span key={l} className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold">{l}</span>)}
                    </div>
                </div>
            </div>
        </div>
        {/* badge flottant : réussite */}
        <motion.div animate={{ y: [0, -9, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -right-4 top-8 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 flex items-center gap-3 z-10">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0"><Trophy className="w-4 h-4 text-emerald-600" /></div>
            <div>
                <p className="text-sm font-extrabold text-slate-900 leading-none">95%+</p>
                <p className="text-[10px] text-slate-400 mt-1">{t('GCE pass rate')}</p>
            </div>
        </motion.div>
        {/* badge flottant : depuis 2004 */}
        <motion.div animate={{ y: [0, 9, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute -left-4 bottom-10 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 flex items-center gap-3 z-10">
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4 text-amber-500" /></div>
            <div>
                <p className="text-sm font-extrabold text-slate-900 leading-none">{t('Since 2004')}</p>
                <p className="text-[10px] text-slate-400 mt-1">{t('20+ years of excellence')}</p>
            </div>
        </motion.div>
    </motion.div>
);

// ── Galerie (tuiles dégradées, remplaçables par de vraies photos) ─────────────
const GALLERY = [
    { icon: <Building2 className="w-6 h-6" />, label: 'Campus', grad: 'from-emerald-500 to-emerald-700' },
    { icon: <FlaskConical className="w-6 h-6" />, label: 'Science labs', grad: 'from-teal-500 to-emerald-700' },
    { icon: <Library className="w-6 h-6" />, label: 'Library', grad: 'from-amber-500 to-amber-700' },
    { icon: <Dumbbell className="w-6 h-6" />, label: 'Sports', grad: 'from-emerald-600 to-teal-800' },
    { icon: <Palette className="w-6 h-6" />, label: 'Arts', grad: 'from-amber-600 to-orange-700' },
    { icon: <Music className="w-6 h-6" />, label: 'Culture', grad: 'from-emerald-700 to-emerald-900' },
];
const GalleryGrid = ({ t }: { t: (s: string) => string }) => (
    <div className="grid grid-cols-3 gap-3">
        {GALLERY.map((g, i) => (
            <motion.div key={i}
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                transition={{ delay: i * 0.06 }} whileHover={{ y: -4 }}
                className={`relative aspect-square rounded-2xl bg-gradient-to-br ${g.grad} overflow-hidden flex flex-col items-center justify-center text-white shadow-lg`}>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                <div className="relative">{g.icon}</div>
                <p className="relative text-[11px] font-semibold mt-2">{t(g.label)}</p>
            </motion.div>
        ))}
    </div>
);

// ── Données ───────────────────────────────────────────────────────────────────
const PROGRAMMES = [
    { icon: <Baby className="w-6 h-6" />, tint: 'bg-rose-50 text-rose-600', title: 'Pre-Nursery & Nursery', desc: 'A caring, playful start (ages 2–5) that builds curiosity, confidence and early bilingual skills.', tag: 'Early years' },
    { icon: <BookOpen className="w-6 h-6" />, tint: 'bg-blue-50 text-blue-600', title: 'Primary School', desc: 'Strong literacy and numeracy foundations in a warm, bilingual and values-driven environment.', tag: 'Class 1 – 6' },
    { icon: <GraduationCap className="w-6 h-6" />, tint: 'bg-emerald-50 text-emerald-600', title: 'Secondary — Grammar', desc: 'Forms 1–5 and Sixth Form, preparing students for the GCE Ordinary & Advanced Level.', tag: 'Form 1 – Upper Sixth' },
    { icon: <Building2 className="w-6 h-6" />, tint: 'bg-violet-50 text-violet-600', title: 'Secondary — Commercial', desc: 'A business-oriented track: Accounting, Economics and Commerce for future entrepreneurs.', tag: 'Commercial series' },
    { icon: <Award className="w-6 h-6" />, tint: 'bg-amber-50 text-amber-600', title: 'GCE Examination Centre', desc: 'An accredited Cameroon G.C.E. centre — candidates sit O-Level & A-Level exams on campus.', tag: 'O & A Level' },
    { icon: <Trophy className="w-6 h-6" />, tint: 'bg-teal-50 text-teal-600', title: 'Yaoundé Int. Business School', desc: 'Higher business and professional programmes (YIBS) for post-secondary learners.', tag: 'Higher education' },
];

const WHY = [
    { icon: <Award className="w-4 h-4" />, title: 'Academic excellence', desc: 'A rigorous, exam-focused curriculum with a 95%+ GCE record.' },
    { icon: <ShieldCheck className="w-4 h-4" />, title: 'Discipline & integrity', desc: 'Strong moral values shape confident, respectful young people.' },
    { icon: <Globe className="w-4 h-4" />, title: 'Bilingual learning', desc: 'Fluency in both English and French across every level.' },
    { icon: <HeartHandshake className="w-4 h-4" />, title: 'Holistic growth', desc: 'Sports, arts and culture nurture the whole child.' },
];

const LEADERS = [
    { initials: 'JK', grad: 'bg-gradient-to-br from-emerald-500 to-emerald-700', name: 'Mama Julie Kwende', role: 'Founder & Proprietor', quote: 'Every child who walks through our gates deserves a solid foundation, discipline and the chance to succeed.' },
    { initials: 'TC', grad: 'bg-gradient-to-br from-amber-500 to-amber-700', name: 'Mr. Tsanka Clinton Ndi', role: 'Principal', quote: 'We are committed to excellence, community and innovation — raising leaders of tomorrow, today.' },
];

const CONTACTS = [
    { icon: <MapPin className="w-5 h-5" />, label: 'Address', value: 'Maison Damas, Yaoundé, Cameroon' },
    { icon: <Phone className="w-5 h-5" />, label: 'Phone', value: '(+237) 670 553 492' },
    { icon: <Mail className="w-5 h-5" />, label: 'Email', value: 'info@greenhills.com' },
    { icon: <Clock className="w-5 h-5" />, label: 'Office hours', value: 'Mon – Fri · 7:30 – 16:00' },
];

export default LandingPage;
