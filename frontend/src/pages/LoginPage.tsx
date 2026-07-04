import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, Lock, ArrowRight, Loader2, ArrowLeft, AlertCircle,
    GraduationCap, CreditCard, CalendarDays, ClipboardList, ShieldCheck,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import LanguageToggle from '../components/LanguageToggle';
import { useI18n } from '../i18n/i18n';

const fadeInUp = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};
const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const FEATURES = [
    { icon: ClipboardList, label: 'Grades & report cards' },
    { icon: CreditCard, label: 'Student ID cards' },
    { icon: CalendarDays, label: 'Class timetables' },
];

const LoginPage = () => {
    const { t } = useI18n();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { login, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (isAuthenticated && user) {
            const dest = user.role === 'enseignant' ? '/prof' : '/ecole-dashboard';
            navigate(dest, { replace: true });
        }
    }, [isAuthenticated, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const response = await api.post('/api/auth/login', { email, mot_de_passe: password });
            const { token, user: userData } = response.data;
            login(token, userData);
            setTimeout(() => {
                if (userData.role === 'enseignant') window.location.href = '/prof';
                else window.location.href = '/ecole-dashboard';
            }, 300);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Une erreur est survenue lors de la connexion.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex font-sans bg-white text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">

            {/* ── Panneau de marque (émeraude raffiné) ─────────────────────── */}
            <div className="hidden lg:flex w-[46%] relative overflow-hidden flex-col justify-between p-12
                bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950">

                {/* orbes lumineux animés */}
                <motion.div
                    animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.6, 0.35] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -top-24 -right-16 w-96 h-96 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
                <motion.div
                    animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0.5, 0.25] }}
                    transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
                    className="absolute bottom-0 -left-24 w-96 h-96 rounded-full bg-teal-300/15 blur-3xl pointer-events-none" />
                {/* filet doré diagonal */}
                <div className="absolute top-0 right-0 w-[140%] h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent rotate-[8deg] origin-top-right pointer-events-none" />

                {/* Marque */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                    <Link to="/" className="flex items-center gap-3.5 relative z-10 w-max group">
                        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 p-[2px] shadow-xl shadow-emerald-950/40 group-hover:scale-105 transition-transform duration-300">
                            <div className="w-full h-full rounded-[14px] bg-emerald-900 flex items-center justify-center">
                                <span className="text-amber-300 font-black text-lg tracking-tight">GH</span>
                            </div>
                        </div>
                        <div className="leading-tight">
                            <span className="block font-extrabold text-2xl tracking-tight text-white drop-shadow">Green Hills</span>
                            <span className="block text-[10px] uppercase tracking-[0.28em] text-amber-300/90 font-bold">Academy · High School</span>
                        </div>
                    </Link>
                </motion.div>

                {/* Accroche + fonctionnalités */}
                <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
                    className="relative z-10 max-w-lg">
                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-300" /> Secure School Portal
                    </div>
                    <h1 className="text-4xl xl:text-[2.7rem] font-extrabold text-white leading-[1.12] mb-5 tracking-tight drop-shadow-lg">
                        Solid Foundation<span className="text-amber-300">.</span><br />Discipline · Success.
                    </h1>
                    <p className="text-emerald-50/80 text-[15px] font-medium leading-relaxed mb-8 max-w-md">
                        The complete management portal for Green Hills Academy — grades, finances and student records in one place.
                    </p>
                    <div className="space-y-3">
                        {FEATURES.map(({ icon: Icon, label }, i) => (
                            <motion.div key={label}
                                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 + i * 0.12 }}
                                className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 backdrop-blur flex items-center justify-center shrink-0">
                                    <Icon className="w-4 h-4 text-amber-300" />
                                </div>
                                <span className="text-emerald-50 font-semibold text-sm">{label}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Pied */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                    className="relative z-10 flex items-center gap-2 text-emerald-100/60 text-xs font-medium">
                    <span className="inline-block w-8 h-1 rounded-full bg-gradient-to-r from-amber-300 to-amber-500" />
                    © {new Date().getFullYear()} Green Hills Academy · Yaoundé, Cameroon
                </motion.div>
            </div>

            {/* ── Formulaire ────────────────────────────────────────────────── */}
            <div className="w-full lg:w-[54%] flex flex-col justify-center p-8 sm:p-16 lg:p-24 relative bg-white">
                {/* halo décoratif discret */}
                <div className="absolute -top-24 right-0 w-72 h-72 rounded-full bg-emerald-50 blur-3xl pointer-events-none" />

                <Link to="/" className="absolute top-8 right-8 flex items-center text-sm font-bold text-slate-400 hover:text-emerald-700 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> {t('Retour au site')}
                </Link>

                <div className="w-full max-w-[400px] mx-auto relative z-10">
                    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="mb-10">
                        <div className="flex justify-end mb-5"><LanguageToggle /></div>
                        <span className="inline-block text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 mb-3">{t('Portail Administrateur')}</span>
                        <h2 className="text-[2.35rem] font-extrabold text-slate-900 mb-2 tracking-tight leading-none">{t('Connexion')}</h2>
                        <p className="text-slate-500 font-medium text-[15px]">{t('Entrez vos identifiants pour accéder au portail.')}</p>
                        <div className="mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-emerald-500 to-amber-400" />
                    </motion.div>

                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="mb-6 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-semibold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.form variants={staggerContainer} initial="hidden" animate="visible" onSubmit={handleSubmit} className="space-y-5">
                        <motion.div variants={fadeInUp} className="group">
                            <label className="block text-sm font-bold text-slate-700 mb-2">{t('Adresse e-mail')}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <input type="email" required
                                    className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all font-semibold text-base"
                                    placeholder="nom@etablissement.cm" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                        </motion.div>

                        <motion.div variants={fadeInUp} className="group">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-bold text-slate-700">{t('Mot de passe')}</label>
                                <Link to="/forgot-password" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">{t('Oublié ?')}</Link>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <input type="password" required
                                    className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all font-semibold text-base"
                                    placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                            </div>
                        </motion.div>

                        <motion.button variants={fadeInUp} type="submit" disabled={isLoading}
                            whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}
                            className="mt-2 w-full flex justify-center items-center py-4 px-4 rounded-xl text-base font-extrabold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 shadow-lg shadow-emerald-600/25 focus:outline-none focus:ring-4 focus:ring-emerald-500/25 transition-all disabled:opacity-70 group">
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" />
                                : <span className="flex items-center gap-2">{t("Accéder à l'espace")} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>}
                        </motion.button>

                        <motion.div variants={fadeInUp} className="flex items-start gap-3 mt-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                                <GraduationCap className="w-4 h-4 text-emerald-600" />
                            </div>
                            <p className="text-slate-500 text-[13px] font-medium leading-relaxed">
                                {t('Accès réservé aux administrateurs.')}<br />
                                {t('Contactez votre établissement pour obtenir vos identifiants.')}
                            </p>
                        </motion.div>
                    </motion.form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
