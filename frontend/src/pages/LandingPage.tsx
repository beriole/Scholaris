import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    BookOpen, Users, CreditCard, BarChart3, ArrowRight, CheckCircle2,
    GraduationCap, Calendar, Bell, FileText, UserCheck, Layers,
    ChevronRight, Shield, Globe, TrendingUp, ClipboardList
} from 'lucide-react';
import { useI18n } from '../i18n/i18n';
import LanguageToggle from '../components/LanguageToggle';

const LandingPage = () => {
    const { t } = useI18n();
    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">

            {/* ── Navbar ─────────────────────────────────────────────────────────── */}
            <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 p-[2px] shadow-sm group-hover:scale-105 transition-transform">
                            <div className="w-full h-full rounded-[10px] bg-emerald-800 flex items-center justify-center">
                                <span className="text-amber-300 font-black text-xs tracking-tight">GH</span>
                            </div>
                        </div>
                        <div className="leading-tight">
                            <span className="block font-extrabold text-[16px] tracking-tight text-slate-900">Green Hills Academy</span>
                            <span className="block text-[9px] uppercase tracking-[0.2em] text-emerald-600 font-bold">High School · Yaoundé</span>
                        </div>
                    </Link>

                    <nav className="hidden md:flex items-center gap-1">
                        {['Accueil', 'Programmes', 'Vie scolaire', 'Contact'].map(item => (
                            <a key={item} href="#" className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all">
                                {t(item)}
                            </a>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2">
                        <LanguageToggle />
                        <Link to="/login" className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-semibold rounded-lg hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-sm shadow-emerald-600/20">
                            {t('Portail — Se connecter')} <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* ── Hero ───────────────────────────────────────────────────────────── */}
            <section className="pt-28 pb-20 px-6">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_1.15fr] gap-16 items-center">

                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold mb-8">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            {t('Solid Foundation · Discipline · Success')}
                        </div>

                        <h1 className="text-[3.25rem] lg:text-[3.75rem] font-extrabold leading-[1.08] tracking-tight text-slate-900 mb-6">
                            {t('Green Hills Academy')}<br />
                            <span className="bg-gradient-to-r from-emerald-600 to-emerald-800 bg-clip-text text-transparent">{t('Portail scolaire.')}</span>
                        </h1>

                        <p className="text-lg text-slate-500 leading-relaxed mb-10 max-w-[500px]">
                            {t('Notes & bulletins, cartes d\'étudiant, emplois du temps, finances et présences — la plateforme officielle de Green Hills Academy High School.')}
                        </p>

                        <div className="flex flex-wrap gap-3 mb-10">
                            <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-bold rounded-xl hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-lg shadow-emerald-600/25 hover:-translate-y-0.5">
                                {t('Accéder au portail')} <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                            {['Bulletins officiels & cartes', 'Emplois du temps de classe', 'Anglophone GCE system'].map((item, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    {t(item)}
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.15 }}
                        className="relative"
                    >
                        <DashboardMockup />
                    </motion.div>
                </div>
            </section>

            {/* ── Stats ──────────────────────────────────────────────────────────── */}
            <section className="border-y border-slate-100 bg-slate-50 py-12">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
                        {[
                            { value: 'Forms 1–5', label: '+ Lower & Upper Sixth' },
                            { value: 'GCE', label: 'O-Level & A-Level programme' },
                            { value: '3 Terms', label: 'Bulletins officiels par an' },
                            { value: 'Anglophone', label: 'Système camerounais' },
                        ].map((stat, i) => (
                            <div key={i}>
                                <p className="text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-emerald-600 to-emerald-800 bg-clip-text text-transparent mb-1">{stat.value}</p>
                                <p className="text-sm font-medium text-slate-500">{t(stat.label)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ───────────────────────────────────────────────────────── */}
            <section id="fonctionnalites" className="py-28 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-xl mx-auto mb-20">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4">{t('Fonctionnalités')}</p>
                        <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">{t('Tout ce dont votre école a besoin')}</h2>
                        <p className="text-slate-500 leading-relaxed">
                            {t('Une suite académique, financière et communicationnelle intégrée dans une seule plateforme.')}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {FEATURES.map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08 }}
                                className="p-8 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all"
                            >
                                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-6 ${f.color}`}>
                                    {f.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">{t(f.title)}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{t(f.desc)}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How it works ───────────────────────────────────────────────────── */}
            <section className="py-24 bg-slate-50 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-xl mx-auto mb-16">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4">{t('Le flux de travail')}</p>
                        <h2 className="text-4xl font-bold text-slate-900 tracking-tight">{t('De la note au bulletin, en 3 étapes')}</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-10">
                        {[
                            { n: '01', title: 'Saisie des notes', desc: 'Les enseignants saisissent une note par séquence, par classe et par matière — élèves absents ou non composés gérés.' },
                            { n: '02', title: 'Bulletins & synthèses', desc: 'Génération automatique des bulletins officiels par term (T1·T2·T3), avec positions, moyennes et remarques de compétence.' },
                            { n: '03', title: 'Cartes & emplois du temps', desc: 'Éditez et imprimez les cartes d\'étudiant et les emplois du temps de classe en PDF, prêts à distribuer.' },
                        ].map((step, i) => (
                            <div key={i} className="relative">
                                <p className="text-7xl font-extrabold text-emerald-100 mb-4 leading-none">{step.n}</p>
                                <h3 className="text-lg font-semibold text-slate-900 mb-3">{t(step.title)}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{t(step.desc)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Modules ────────────────────────────────────────────────────────── */}
            <section id="modules" className="py-28 px-6">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4">{t('Modules')}</p>
                        <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-6">{t('14 modules intégrés')}</h2>
                        <p className="text-slate-500 leading-relaxed mb-8 max-w-md">
                            {t('De la saisie des notes à la génération des bulletins PDF officiels, chaque flux de travail de votre établissement est couvert.')}
                        </p>
                        <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                            {t('Voir toutes les fonctionnalités')} <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {MODULES.map((mod, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/40 transition-all group cursor-default">
                                <div className="text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0">{mod.icon}</div>
                                <span className="text-sm font-medium text-slate-700">{t(mod.name)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Security ───────────────────────────────────────────────────────── */}
            <section className="py-24 bg-slate-50 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-xl mx-auto mb-16">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4">{t('Sécurité')}</p>
                        <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">{t('Vos données sont protégées')}</h2>
                        <p className="text-slate-500">{t('Infrastructure conçue selon les standards internationaux de sécurité des données scolaires.')}</p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: <Shield className="w-5 h-5" />, title: 'Authentification JWT', desc: 'Tokens sécurisés, sessions limitées, aucun accès non autorisé.' },
                            { icon: <Users className="w-5 h-5" />, title: 'Rôles & Permissions', desc: 'Chaque utilisateur voit uniquement ce qu\'il est autorisé à voir.' },
                            { icon: <Globe className="w-5 h-5" />, title: 'Données de l\'école', desc: 'Toutes les données restent la propriété de Green Hills Academy.' },
                            { icon: <ClipboardList className="w-5 h-5" />, title: 'Logs d\'activité', desc: 'Traçabilité complète de toutes les actions sur la plateforme.' },
                        ].map((item, i) => (
                            <div key={i} className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-emerald-200 hover:shadow-md transition-all">
                                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                                    {item.icon}
                                </div>
                                <h3 className="font-semibold text-slate-900 mb-2 text-sm">{t(item.title)}</h3>
                                <p className="text-slate-500 text-xs leading-relaxed">{t(item.desc)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ────────────────────────────────────────────────────────────── */}
            <section className="py-28 px-6 bg-slate-900">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-slate-300 text-xs font-semibold mb-8">
                        <TrendingUp className="w-3.5 h-3.5" /> {t('+34% de productivité administrative moyenne')}
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
                        {t('Bienvenue à Green Hills Academy.')}
                    </h2>
                    <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                        {t('Administrateurs et enseignants : accédez au portail pour gérer notes, bulletins, cartes et emplois du temps.')}
                    </p>
                    <Link to="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-xl hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-xl shadow-emerald-600/25 text-base">
                        {t('Accéder au portail')} <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>

            {/* ── Footer ─────────────────────────────────────────────────────────── */}
            <footer className="bg-slate-950 py-16 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
                        <div>
                            <Link to="/" className="flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center">
                                    <span className="text-emerald-900 font-black text-[10px]">GH</span>
                                </div>
                                <span className="font-bold text-white text-sm">Green Hills Academy</span>
                            </Link>
                            <p className="text-slate-500 text-sm leading-relaxed">{t('Solid Foundation · Discipline · Success — Yaoundé, Cameroon.')}</p>
                        </div>

                        {[
                            { title: 'Produit', links: ['Fonctionnalités', 'Modules', 'Tarifs', 'Nouveautés'] },
                            { title: 'Ressources', links: ['Documentation', 'API', 'Blog', 'Formation'] },
                            { title: 'Entreprise', links: ['À propos', 'Contact', 'Partenaires', 'Conditions'] },
                        ].map((col, i) => (
                            <div key={i}>
                                <p className="text-white font-semibold text-sm mb-4">{t(col.title)}</p>
                                <ul className="space-y-2.5">
                                    {col.links.map(link => (
                                        <li key={link}>
                                            <a href="#" className="text-slate-500 text-sm hover:text-white transition-colors">{t(link)}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-600 text-sm">© {new Date().getFullYear()} Green Hills Academy High School · Yaoundé, Cameroon.</p>
                        <div className="flex gap-6">
                            <a href="#" className="text-slate-600 text-sm hover:text-white transition-colors">{t('Confidentialité')}</a>
                            <a href="#" className="text-slate-600 text-sm hover:text-white transition-colors">{t('CGU')}</a>
                            <a href="#" className="text-slate-600 text-sm hover:text-white transition-colors">{t('Mentions légales')}</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// ── Dashboard Mockup (CSS pur — aucune image stock) ─────────────────────────
const DashboardMockup = () => (
    <div className="relative select-none">
        <div className="absolute -inset-6 bg-emerald-500/5 rounded-3xl blur-2xl pointer-events-none" />

        <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Browser chrome */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                </div>
                <div className="flex-1 bg-white rounded-md px-3 py-1 text-[11px] text-slate-400 border border-slate-100 font-mono">
                    lycee-bilingue.scholaris.cm
                </div>
            </div>

            {/* App shell */}
            <div className="flex" style={{ height: 300 }}>
                {/* Sidebar */}
                <div className="w-44 border-r border-slate-100 bg-slate-50/80 p-3 flex flex-col gap-0.5 shrink-0">
                    <div className="flex items-center gap-2 px-2 py-2 mb-2">
                        <div className="w-5 h-5 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-md shrink-0" />
                        <span className="text-[11px] font-bold text-slate-900">Green Hills</span>
                    </div>
                    {[
                        { label: 'Tableau de bord', active: true },
                        { label: 'Élèves', active: false },
                        { label: 'Notes & Bulletins', active: false },
                        { label: 'Présences', active: false },
                        { label: 'Finances', active: false },
                        { label: 'Enseignants', active: false },
                    ].map((item, i) => (
                        <div key={i} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${item.active ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>
                            {item.label}
                        </div>
                    ))}
                </div>

                {/* Main content */}
                <div className="flex-1 p-4 overflow-hidden bg-white">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[12px] font-bold text-slate-900">Tableau de bord — Trim. 2</p>
                        <div className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                            Année 2025-2026
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                            { value: '342', label: 'Élèves', color: 'text-slate-900' },
                            { value: '14.8/20', label: 'Moy. générale', color: 'text-emerald-600' },
                            { value: '89%', label: 'Présence', color: 'text-blue-600' },
                        ].map((s, i) => (
                            <div key={i} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                                <p className="text-[9px] text-slate-400 mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Progress by class */}
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Taux de présence par classe</p>
                    <div className="space-y-2">
                        {[
                            { name: 'Terminale C', pct: 89, color: 'bg-emerald-500' },
                            { name: 'Terminale D', pct: 73, color: 'bg-blue-500' },
                            { name: '3ème B', pct: 91, color: 'bg-emerald-500' },
                            { name: '2nde A', pct: 68, color: 'bg-amber-500' },
                        ].map((cls, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-[10px] w-20 text-slate-500 shrink-0">{cls.name}</span>
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${cls.color} rounded-full`} style={{ width: `${cls.pct}%` }} />
                                </div>
                                <span className="text-[10px] text-slate-400 w-7 text-right">{cls.pct}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Floating: bulletin */}
        <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -right-5 top-10 bg-white rounded-xl shadow-xl border border-slate-200 p-3 flex items-center gap-3 z-10"
        >
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
                <p className="text-[11px] font-semibold text-slate-900">Bulletins générés</p>
                <p className="text-[10px] text-slate-400">12 PDF · Terminale C</p>
            </div>
        </motion.div>

        {/* Floating: payment */}
        <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute -left-5 bottom-10 bg-white rounded-xl shadow-xl border border-slate-200 p-3 flex items-center gap-3 z-10"
        >
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <div>
                <p className="text-[11px] font-semibold text-slate-900">Paiement reçu</p>
                <p className="text-[10px] text-slate-400">75 000 XAF · MTN</p>
            </div>
        </motion.div>
    </div>
);

// ── Data ────────────────────────────────────────────────────────────────────
const FEATURES = [
    {
        icon: <GraduationCap className="w-5 h-5" />,
        title: 'Notes & Bulletins',
        desc: 'Saisie par séquence, calcul automatique des moyennes et rangs, génération de bulletins PDF conformes aux normes MINESEC.',
        color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
        icon: <CreditCard className="w-5 h-5" />,
        title: 'Finances XAF',
        desc: 'Suivi des tranches de scolarité, encaissement Mobile Money, reçus imprimables et tableau de bord des arriérés.',
        color: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
        icon: <Users className="w-5 h-5" />,
        title: 'Gestion des profils',
        desc: 'Fiches élèves complètes, liaison parents-enfants, dossiers enseignants et gestion des inscriptions par classe.',
        color: 'bg-violet-50 text-violet-600 border-violet-100',
    },
    {
        icon: <UserCheck className="w-5 h-5" />,
        title: 'Présences & Absences',
        desc: 'Appel quotidien par classe, rapport mensuel, justifications parentales et alertes automatiques.',
        color: 'bg-amber-50 text-amber-600 border-amber-100',
    },
    {
        icon: <Calendar className="w-5 h-5" />,
        title: 'Emploi du temps',
        desc: 'Grille hebdomadaire par classe, assignation enseignant/salle/matière, consultation sur tous les appareils.',
        color: 'bg-teal-50 text-teal-600 border-teal-100',
    },
    {
        icon: <BarChart3 className="w-5 h-5" />,
        title: 'Reporting & Analytics',
        desc: 'Tableaux de bord en temps réel, indicateurs de performance académique, exports Excel et PDF.',
        color: 'bg-rose-50 text-rose-600 border-rose-100',
    },
];

const MODULES = [
    { icon: <Users size={14} />, name: 'Élèves' },
    { icon: <GraduationCap size={14} />, name: 'Enseignants' },
    { icon: <Layers size={14} />, name: 'Classes' },
    { icon: <BookOpen size={14} />, name: 'Matières' },
    { icon: <FileText size={14} />, name: 'Bulletins PDF' },
    { icon: <Calendar size={14} />, name: 'Emploi du temps' },
    { icon: <UserCheck size={14} />, name: 'Présences' },
    { icon: <CreditCard size={14} />, name: 'Finances XAF' },
    { icon: <Bell size={14} />, name: 'Notifications' },
    { icon: <BarChart3 size={14} />, name: 'Reporting' },
];

export default LandingPage;
