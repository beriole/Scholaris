import { useState, useEffect } from 'react';
import { Outlet, useLocation, Link, NavLink } from 'react-router-dom';
import {
    Users, GraduationCap, Wallet, Calendar, Settings, Bell,
    LogOut, LayoutDashboard, BookOpen, Layers, UserCheck, Menu, X,
    ClipboardList, TrendingUp, AlertCircle, CheckCircle2, Loader2,
    CreditCard, ArrowUpRight, Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import NotificationBell from '../../components/NotificationBell';
import LanguageToggle from '../../components/LanguageToggle';
import { useI18n } from '../../i18n/i18n';

const NAV_ITEMS = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/ecole-dashboard' },
    { icon: Calendar, label: 'Années scolaires', path: '/ecole-dashboard/years' },
    { icon: Layers, label: 'Classes', path: '/ecole-dashboard/classes' },
    { icon: BookOpen, label: 'Matières', path: '/ecole-dashboard/academic' },
    { icon: Users, label: 'Élèves', path: '/ecole-dashboard/students' },
    { icon: GraduationCap, label: 'Enseignants', path: '/ecole-dashboard/teachers' },
    { icon: ClipboardList, label: 'Notes & Bulletins', path: '/ecole-dashboard/grades' },
    { icon: Wallet, label: 'Finances', path: '/ecole-dashboard/finances' },
    { icon: UserCheck, label: 'Présences', path: '/ecole-dashboard/attendance' },
    { icon: Clock,     label: 'Emploi du temps', path: '/ecole-dashboard/timetable' },
    { icon: Bell,        label: 'Messagerie',         path: '/ecole-dashboard/messages' },
    { icon: TrendingUp, label: 'Rapports',           path: '/ecole-dashboard/reports' },
    { icon: Calendar,   label: 'Calendrier',         path: '/ecole-dashboard/calendar' },
    { icon: GraduationCap, label: 'Affectations',   path: '/ecole-dashboard/affectations' },
    { icon: Settings,   label: 'Paramètres',         path: '/ecole-dashboard/settings' },
];

const SchoolDashboard = () => {
    const { user, logout } = useAuth();
    const { t } = useI18n();
    const location = useLocation();
    const isRoot = location.pathname === '/ecole-dashboard';
    const [mobileOpen, setMobileOpen] = useState(false);

    const initial = user?.email?.[0]?.toUpperCase() ?? 'A';
    const [school, setSchool] = useState<{ nom: string; logo_url?: string | null }>({ nom: user?.tenant_name ?? 'Mon Établissement' });
    const schoolName = school.nom;
    const monogram = schoolName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'GH';

    useEffect(() => {
        api.get('/api/settings/school')
            .then(r => setSchool({ nom: r.data.ecole?.nom ?? user?.tenant_name ?? 'Mon Établissement', logo_url: r.data.ecole?.logo_url ?? null }))
            .catch(() => {});
    }, []);

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">

            {/* ── Mobile overlay ───────────────────────────────────────────── */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* ── Sidebar ──────────────────────────────────────────────────── */}
            <aside className={`
                fixed top-0 left-0 h-full w-60 bg-white border-r border-slate-200 z-40 flex flex-col
                transition-transform duration-200
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0
            `}>
                {/* Logo / marque GHAHS */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {school.logo_url ? (
                            <img src={school.logo_url} alt="logo"
                                className="w-9 h-9 rounded-lg object-contain bg-white border border-slate-100 shrink-0"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/30">
                                <span className="text-white font-extrabold text-[13px] tracking-tight">{monogram}</span>
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="font-bold text-[13px] text-slate-900 truncate leading-tight max-w-[135px]">{schoolName}</p>
                            <p className="text-[9px] uppercase tracking-[0.15em] text-emerald-600 font-bold">High School</p>
                        </div>
                    </div>
                    <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1 text-slate-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
                    {NAV_ITEMS.map(({ icon: Icon, label, path, disabled }) => {
                        const isActive = disabled
                            ? false
                            : path === '/ecole-dashboard'
                                ? location.pathname === path
                                : location.pathname.startsWith(path);

                        if (disabled) {
                            return (
                                <div
                                    key={path}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 cursor-not-allowed"
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <span className="text-sm font-medium">{t(label)}</span>
                                    <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded">{t('Bientôt')}</span>
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={path}
                                to={path}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    isActive
                                        ? 'bg-emerald-50 text-emerald-700 font-semibold ring-1 ring-emerald-100 shadow-sm shadow-emerald-600/5'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : ''}`} />
                                {t(label)}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="border-t border-slate-100 p-3 shrink-0">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center font-semibold text-slate-600 text-xs shrink-0">
                            {initial}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{user?.email}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{t('Admin École')}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                        <LogOut className="w-4 h-4 shrink-0" />
                        {t('Déconnexion')}
                    </button>
                </div>
            </aside>

            {/* ── Main ─────────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col lg:ml-60 min-w-0">

                {/* Top bar */}
                <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-all"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="hidden sm:flex items-center gap-1.5 text-sm text-slate-400 font-medium">
                            <span>{schoolName}</span>
                            <span>/</span>
                            <span className="text-slate-700 font-semibold capitalize">
                                {location.pathname === '/ecole-dashboard'
                                    ? t('Tableau de bord')
                                    : t(NAV_ITEMS.find(n => location.pathname.startsWith(n.path) && n.path !== '/ecole-dashboard')?.label ?? '')}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <LanguageToggle />
                        <NotificationBell />
                        <Link to="/ecole-dashboard/settings" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
                            <Settings className="w-4 h-4" />
                        </Link>
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center font-semibold text-emerald-700 text-xs">
                            {initial}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
                    {isRoot ? <SchoolHomeDashboard /> : <Outlet />}
                </main>
            </div>
        </div>
    );
};

// ── Tableau de bord accueil ──────────────────────────────────────────────────

interface DashStats {
    annee_active:  { id: string; libelle: string } | null;
    kpis:          { total_eleves: number; total_enseignants: number; total_classes: number; total_matieres: number };
    finance:       { total_recouvre: number; total_en_attente: number; paiements_ce_mois: number };
    presences:     { seances_aujourd_hui: number; absences_aujourd_hui: number };
    setup:         { has_year: boolean; has_classes: boolean; has_matieres: boolean; has_eval_types: boolean; is_complete: boolean };
    derniers_paiements: { id: string; montant: number; methode: string; date: string; eleve: { nom: string; prenom: string } | null }[];
    absences_recentes:  { id: string; date: string; statut: string; eleve: { nom: string; prenom: string }; matiere: { nom: string }; classe: { nom: string } }[];
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

const SchoolHomeDashboard = () => {
    const { user } = useAuth();
    const { t } = useI18n();
    const [stats, setStats]   = useState<DashStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/api/dashboard/stats')
            .then(r => setStats(r.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const kpiCards = stats ? [
        { label: 'Élèves inscrits',   value: fmt(stats.kpis.total_eleves),      icon: <Users size={20} />,         color: 'text-emerald-600', bg: 'bg-emerald-50',   path: '/ecole-dashboard/students' },
        { label: 'Classes actives',   value: fmt(stats.kpis.total_classes),      icon: <Layers size={20} />,        color: 'text-teal-600',    bg: 'bg-teal-50',      path: '/ecole-dashboard/classes' },
        { label: 'Enseignants',       value: fmt(stats.kpis.total_enseignants),  icon: <GraduationCap size={20} />, color: 'text-green-700',   bg: 'bg-green-50',     path: '/ecole-dashboard/teachers' },
        { label: 'Matières',          value: fmt(stats.kpis.total_matieres),     icon: <BookOpen size={20} />,      color: 'text-emerald-700', bg: 'bg-emerald-50',   path: '/ecole-dashboard/academic' },
        { label: 'Recouvré (total)',  value: `${fmt(stats.finance.total_recouvre)} XAF`, icon: <TrendingUp size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/ecole-dashboard/finances' },
        { label: 'Absences auj.',     value: fmt(stats.presences.absences_aujourd_hui), icon: <AlertCircle size={20} />, color: 'text-red-600', bg: 'bg-red-50',       path: '/ecole-dashboard/attendance' },
    ] : [];

    const setupSteps = stats ? [
        { label: 'Créer l\'année scolaire active',    path: '/ecole-dashboard/years',    done: stats.setup.has_year },
        { label: 'Configurer les classes',            path: '/ecole-dashboard/classes',  done: stats.setup.has_classes },
        { label: 'Définir les matières & programmes', path: '/ecole-dashboard/academic', done: stats.setup.has_matieres },
        { label: 'Configurer les types d\'évaluation', path: '/ecole-dashboard/grades',  done: stats.setup.has_eval_types },
    ] : [];

    return (
        <div className="space-y-6">
            {/* Welcome banner — charte GHAHS verte */}
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 rounded-2xl p-6 flex items-center justify-between gap-6 overflow-hidden relative shadow-lg shadow-emerald-900/20">
                <div className="absolute -right-10 -top-12 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute right-24 -bottom-16 w-40 h-40 bg-emerald-300/20 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10">
                    <p className="text-emerald-200 text-xs font-semibold uppercase tracking-[0.15em] mb-2">
                        {stats?.annee_active ? stats.annee_active.libelle : t('Academic Year')}
                    </p>
                    <h2 className="text-2xl font-extrabold text-white mb-1 tracking-tight">{user?.tenant_name}</h2>
                    <p className="text-emerald-50/80 text-sm">
                        {stats?.setup.is_complete
                            ? t('Votre établissement est entièrement configuré.')
                            : t('Complétez la configuration de votre établissement.')}
                    </p>
                </div>
                <Link to="/ecole-dashboard/years"
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl transition-all shadow-lg relative z-10">
                    <Calendar className="w-4 h-4" /> {t('Années scolaires')}
                </Link>
            </div>

            {/* KPI grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={28} className="animate-spin text-emerald-600" />
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {kpiCards.map((card, i) => (
                        <Link key={i} to={card.path}
                            className="bg-white rounded-xl border border-slate-200 p-4 hover:border-emerald-200 hover:shadow-sm transition-all group">
                            <div className={`w-9 h-9 ${card.bg} ${card.color} rounded-lg flex items-center justify-center mb-3`}>
                                {card.icon}
                            </div>
                            <p className={`text-xl font-bold ${card.color} mb-0.5`}>{card.value}</p>
                            <p className="text-xs text-slate-400 font-medium leading-tight">{t(card.label)}</p>
                        </Link>
                    ))}
                </div>
            )}

            {/* Contenu principal en deux colonnes */}
            {stats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Setup checklist */}
                    {!stats.setup.is_complete && (
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Settings size={15} className="text-slate-400" /> {t('Guide de configuration')}
                            </h3>
                            <div className="space-y-2">
                                {setupSteps.map((step, i) => (
                                    <Link key={i} to={step.path}
                                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-all group">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                            step.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 group-hover:border-emerald-400'
                                        }`}>
                                            {step.done && <CheckCircle2 size={11} className="text-white" />}
                                        </div>
                                        <span className={`text-sm font-medium transition-colors ${step.done ? 'text-slate-400 line-through' : 'text-slate-700 group-hover:text-emerald-700'}`}>
                                            {t(step.label)}
                                        </span>
                                        {!step.done && <ArrowUpRight size={13} className="ml-auto text-slate-300 group-hover:text-emerald-500" />}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Derniers paiements */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <CreditCard size={15} className="text-slate-400" /> {t('Derniers paiements')}
                        </h3>
                        {stats.derniers_paiements.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">{t('Aucun paiement enregistré')}</p>
                        ) : (
                            <div className="space-y-2">
                                {stats.derniers_paiements.map(p => (
                                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">
                                                {p.eleve ? `${p.eleve.nom} ${p.eleve.prenom}` : '—'}
                                            </p>
                                            <p className="text-xs text-slate-400">{p.methode?.replace('_', ' ')} · {new Date(p.date).toLocaleDateString('fr-FR')}</p>
                                        </div>
                                        <span className="text-sm font-semibold text-emerald-600">{fmt(p.montant)} XAF</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Link to="/ecole-dashboard/finances" className="mt-3 flex items-center gap-1 text-xs text-emerald-600 hover:underline font-medium">
                            {t('Voir toutes les finances')} <ArrowUpRight size={12} />
                        </Link>
                    </div>

                    {/* Absences récentes */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <AlertCircle size={15} className="text-slate-400" /> {t('Absences non justifiées (récentes)')}
                        </h3>
                        {stats.absences_recentes.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">{t('Aucune absence récente')}</p>
                        ) : (
                            <div className="space-y-2">
                                {stats.absences_recentes.map(a => (
                                    <div key={a.id} className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">{a.eleve.nom} {a.eleve.prenom}</p>
                                            <p className="text-xs text-slate-400">{a.classe.nom} · {a.matiere.nom} · {new Date(a.date).toLocaleDateString('fr-FR')}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${a.statut === 'absent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {a.statut}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Link to="/ecole-dashboard/attendance" className="mt-3 flex items-center gap-1 text-xs text-emerald-600 hover:underline font-medium">
                            {t('Gérer les présences')} <ArrowUpRight size={12} />
                        </Link>
                    </div>

                    {/* Finances résumé */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Wallet size={15} className="text-slate-400" /> {t('Finances — résumé')}
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">{t('Total recouvré')}</span>
                                <span className="text-sm font-bold text-emerald-600">{fmt(stats.finance.total_recouvre)} XAF</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">{t('En attente (mobile)')}</span>
                                <span className="text-sm font-semibold text-amber-600">{fmt(stats.finance.total_en_attente)} XAF</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">{t('Paiements ce mois')}</span>
                                <span className="text-sm font-semibold text-slate-700">{fmt(stats.finance.paiements_ce_mois)}</span>
                            </div>
                            {stats.finance.total_recouvre > 0 && (
                                <div className="pt-1">
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div className="bg-emerald-500 h-2 rounded-full" style={{
                                            width: `${Math.min(100, Math.round(stats.finance.total_recouvre / (stats.finance.total_recouvre + stats.finance.total_en_attente + 1) * 100))}%`
                                        }} />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">{t('Taux de recouvrement immédiat')}</p>
                                </div>
                            )}
                        </div>
                        <Link to="/ecole-dashboard/finances" className="mt-3 flex items-center gap-1 text-xs text-emerald-600 hover:underline font-medium">
                            {t('Voir le détail')} <ArrowUpRight size={12} />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchoolDashboard;
