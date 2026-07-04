import { useState, useEffect, createContext, useContext } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, BookOpen, CalendarDays, LogOut, Menu, X,
    GraduationCap, Loader2, ChevronRight,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import LanguageToggle from '../../components/LanguageToggle';
import { PageTransition } from '../../lib/motion';
import { useI18n } from '../../i18n/i18n';

// ── Contexte partagé du portail enseignant ─────────────────────────────────────

export interface Affectation {
    id:            string;
    coefficient:   number | null;
    volume_horaire: number | null;
    matiere: { id: string; nom: string; code: string; coefficient: number };
    classe:  { id: string; nom: string; niveau: string; annee_id: string };
}
export interface TeacherProfil {
    id: string; matricule: string; nom: string; prenom: string;
    specialite: string | null; telephone: string | null; photo_url: string | null;
}
export interface TeacherContextValue {
    profil:       TeacherProfil;
    ecole:        { id: string; nom: string } | null;
    annee:        { id: string; libelle: string } | null;
    affectations: Affectation[];
    reload:       () => void;
}

const TeacherCtx = createContext<TeacherContextValue | null>(null);
export const useTeacher = () => {
    const ctx = useContext(TeacherCtx);
    if (!ctx) throw new Error('useTeacher doit être utilisé dans TeacherLayout');
    return ctx;
};

const NAV = [
    { to: '/prof',            label: 'Accueil',         icon: LayoutDashboard, end: true },
    { to: '/prof/classes',    label: 'Mes classes',     icon: BookOpen },
    { to: '/prof/timetable',  label: 'Emploi du temps', icon: CalendarDays },
];

export default function TeacherLayout() {
    const { logout } = useAuth();
    const { t } = useI18n();
    const location = useLocation();
    const navigate = useNavigate();

    const [data,    setData]    = useState<Omit<TeacherContextValue, 'reload'> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [mobile,  setMobile]  = useState(false);

    const load = () => {
        setLoading(true);
        api.get('/api/teachers/me')
            .then(r => {
                setData({
                    profil:       r.data.profil,
                    ecole:        r.data.ecole,
                    annee:        r.data.annee_active,
                    affectations: r.data.affectations ?? [],
                });
                setError('');
            })
            .catch(e => setError(e?.response?.data?.error ?? 'Impossible de charger votre profil enseignant.'))
            .finally(() => setLoading(false));
    };
    useEffect(load, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                    <X className="w-7 h-7 text-red-400" />
                </div>
                <p className="text-slate-600 font-medium max-w-sm">{error}</p>
                <button onClick={logout} className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-all">
                    Se déconnecter
                </button>
            </div>
        );
    }

    const ctx: TeacherContextValue = { ...data, reload: load };
    const fullName = `${data.profil.prenom} ${data.profil.nom}`.trim();
    const initials = `${data.profil.prenom?.[0] ?? ''}${data.profil.nom?.[0] ?? ''}`.toUpperCase() || 'P';
    const current  = NAV.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to) && n.to !== '/prof');

    return (
        <TeacherCtx.Provider value={ctx}>
            <div className="flex min-h-screen bg-slate-50 font-sans">

                {/* Overlay mobile */}
                <AnimatePresence>
                    {mobile && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setMobile(false)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden" />
                    )}
                </AnimatePresence>

                {/* Sidebar */}
                <aside className={`fixed top-0 left-0 h-full w-64 z-40 flex flex-col bg-slate-900 text-slate-300
                    transition-transform duration-200 ${mobile ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>

                    <div className="h-16 flex items-center justify-between px-5 border-b border-white/10 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
                                <GraduationCap className="w-4 h-4 text-white" />
                            </div>
                            <div className="leading-tight">
                                <p className="font-bold text-sm text-white">Green Hills</p>
                                <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">{t('Enseignant')}</p>
                            </div>
                        </div>
                        <button onClick={() => setMobile(false)} className="lg:hidden p-1 text-slate-400"><X className="w-4 h-4" /></button>
                    </div>

                    <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
                        {NAV.map(({ to, label, icon: Icon, end }) => (
                            <NavLink key={to} to={to} end={end} onClick={() => setMobile(false)}
                                className={({ isActive }) => `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                    isActive ? 'text-emerald-300' : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}>
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <motion.span layoutId="teacherNavPill"
                                                className="absolute inset-0 rounded-xl bg-emerald-500/15 shadow-inner"
                                                transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
                                        )}
                                        <Icon className="w-4 h-4 shrink-0 relative z-10" />
                                        <span className="relative z-10">{t(label)}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="border-t border-white/10 p-3 shrink-0">
                        <div className="flex items-center gap-3 px-2 py-2 mb-1">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{fullName}</p>
                                <p className="text-[10px] text-slate-400 truncate">{data.profil.specialite ?? t('Enseignant')}</p>
                            </div>
                        </div>
                        <button onClick={() => { logout(); navigate('/login'); }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                            <LogOut className="w-4 h-4 shrink-0" /> {t('Déconnexion')}
                        </button>
                    </div>
                </aside>

                {/* Main */}
                <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
                    <header className="h-16 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-20">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setMobile(true)} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                                <Menu className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-1.5 text-sm">
                                <span className="text-slate-400 font-medium hidden sm:inline">{data.ecole?.nom ?? 'Mon établissement'}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
                                <span className="text-slate-800 font-semibold">{t(current?.label ?? 'Accueil')}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <LanguageToggle />
                            {data.annee && (
                                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                                    <CalendarDays className="w-3.5 h-3.5" /> {data.annee.libelle}
                                </span>
                            )}
                            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center font-bold text-white text-xs">{initials}</div>
                        </div>
                    </header>

                    <main className="flex-1 p-5 lg:p-8 overflow-x-hidden">
                        <AnimatePresence mode="wait">
                            <PageTransition key={location.pathname}>
                                <Outlet />
                            </PageTransition>
                        </AnimatePresence>
                    </main>
                </div>
            </div>
        </TeacherCtx.Provider>
    );
}
