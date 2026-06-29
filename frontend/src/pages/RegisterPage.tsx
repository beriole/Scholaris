import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, School, Globe, Mail, Lock, ArrowRight, Loader2, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const steps = ['Établissement', 'Administrateur', 'Confirmation'];

const RegisterPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        nom_tenant: '',
        sous_domaine: '',
        pays: 'CM',
        email: '',
        mot_de_passe: '',
        confirm_password: '',
    });

    const update = (field: string, value: string) =>
        setFormData((prev) => ({ ...prev, [field]: value }));

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (step === 1 && formData.mot_de_passe !== formData.confirm_password) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }
        setStep((s) => s + 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await api.post('/api/auth/register', {
                nom_tenant: formData.nom_tenant,
                sous_domaine: formData.sous_domaine,
                pays: formData.pays,
                email: formData.email,
                mot_de_passe: formData.mot_de_passe,
            });
            navigate('/login', { state: { registered: true } });
        } catch (err: any) {
            setError(err.response?.data?.error || 'Une erreur est survenue lors de la création.');
            setStep(0);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex font-sans bg-white text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">

            {/* Left panel — Brand */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                className="hidden lg:flex w-[45%] relative overflow-hidden bg-slate-900 flex-col justify-between p-12"
            >
                <motion.img
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 2, ease: 'easeOut' }}
                    src="https://images.unsplash.com/photo-1509062522246-3755977927d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
                    alt="École africaine"
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-slate-900/10" />
                <div className="absolute inset-0 bg-emerald-900/20 mix-blend-overlay" />

                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <Link to="/" className="flex items-center gap-3 relative z-10 w-max group">
                        <div className="w-12 h-12 rounded-[1.2rem] bg-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                            <BookOpen className="h-7 w-7 text-emerald-600" />
                        </div>
                        <span className="font-extrabold text-3xl tracking-tight text-white drop-shadow-md">
                            Scholaris<span className="text-emerald-400">.</span>
                        </span>
                    </Link>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="relative z-10 max-w-lg mb-10"
                >
                    <div className="inline-block px-3 py-1 mb-6 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-extrabold uppercase tracking-widest">
                        Inscription Gratuite
                    </div>
                    <h1 className="text-4xl lg:text-[2.75rem] font-extrabold text-white leading-[1.1] mb-6 drop-shadow-lg tracking-tight">
                        Votre école mérite <br /> le meilleur outil.
                    </h1>
                    <div className="space-y-3 mt-8">
                        {[
                            'Déploiement en moins de 5 minutes',
                            'Aucune carte bancaire requise',
                            'Support dédié en français',
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 text-slate-200/90 text-sm font-medium">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                {item}
                            </div>
                        ))}
                    </div>
                </motion.div>
            </motion.div>

            {/* Right panel — Form */}
            <div className="w-full lg:w-[55%] flex flex-col justify-center p-8 sm:p-16 lg:p-24 relative bg-white">

                <Link to="/" className="absolute top-8 left-8 sm:left-auto sm:right-12 flex items-center text-sm font-bold text-slate-400 hover:text-slate-800 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Retour au site
                </Link>

                <div className="w-full max-w-[440px] mx-auto">

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="mb-10"
                    >
                        <h2 className="text-[2.2rem] font-extrabold text-slate-900 mb-2 tracking-tight">Créer votre espace</h2>
                        <p className="text-slate-500 font-medium text-base">Inscrivez votre établissement en quelques étapes.</p>
                    </motion.div>

                    {/* Stepper */}
                    <div className="flex items-center gap-2 mb-10">
                        {steps.map((label, i) => (
                            <React.Fragment key={i}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                        i < step ? 'bg-emerald-600 text-white' :
                                        i === step ? 'bg-slate-900 text-white' :
                                        'bg-slate-100 text-slate-400'
                                    }`}>
                                        {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                                    </div>
                                    <span className={`text-xs font-black hidden sm:block ${i === step ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {label}
                                    </span>
                                </div>
                                {i < steps.length - 1 && (
                                    <div className={`flex-1 h-0.5 rounded-full ${i < step ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-6 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2"
                            >
                                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Step 0 — Établissement */}
                    <AnimatePresence mode="wait">
                        {step === 0 && (
                            <motion.form
                                key="step0"
                                variants={staggerContainer}
                                initial="hidden"
                                animate="visible"
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handleNext}
                                className="space-y-5"
                            >
                                <motion.div variants={fadeInUp} className="space-y-2">
                                    <label className="block text-sm font-extrabold text-slate-700">Nom de l'établissement</label>
                                    <div className="relative group">
                                        <School className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                                        <input
                                            required
                                            type="text"
                                            className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all font-bold shadow-sm"
                                            placeholder="Lycée Bilingue de Yaoundé"
                                            value={formData.nom_tenant}
                                            onChange={(e) => update('nom_tenant', e.target.value)}
                                        />
                                    </div>
                                </motion.div>

                                <motion.div variants={fadeInUp} className="space-y-2">
                                    <label className="block text-sm font-extrabold text-slate-700">
                                        Sous-domaine <span className="text-slate-400 font-medium">.scholaris.cm</span>
                                    </label>
                                    <div className="relative group">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                                        <input
                                            required
                                            type="text"
                                            className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all font-bold shadow-sm"
                                            placeholder="lycee-bilingue"
                                            value={formData.sous_domaine}
                                            onChange={(e) => update('sous_domaine', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium ml-1">
                                        Votre URL : <span className="text-emerald-600 font-bold">{formData.sous_domaine || 'votre-ecole'}.scholaris.cm</span>
                                    </p>
                                </motion.div>

                                <motion.div variants={fadeInUp} className="space-y-2">
                                    <label className="block text-sm font-extrabold text-slate-700">Pays</label>
                                    <select
                                        className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all font-bold shadow-sm"
                                        value={formData.pays}
                                        onChange={(e) => update('pays', e.target.value)}
                                    >
                                        <option value="CM">🇨🇲 Cameroun</option>
                                        <option value="SN">🇸🇳 Sénégal</option>
                                        <option value="CI">🇨🇮 Côte d'Ivoire</option>
                                        <option value="GA">🇬🇦 Gabon</option>
                                        <option value="CD">🇨🇩 RDC</option>
                                        <option value="FR">🇫🇷 France</option>
                                    </select>
                                </motion.div>

                                <motion.button
                                    variants={fadeInUp}
                                    type="submit"
                                    className="mt-4 w-full flex justify-center items-center gap-2 py-4 px-4 rounded-xl text-base font-extrabold text-white bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/10 transition-all active:scale-[0.98] group"
                                >
                                    Continuer <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </motion.button>
                            </motion.form>
                        )}

                        {/* Step 1 — Administrateur */}
                        {step === 1 && (
                            <motion.form
                                key="step1"
                                variants={staggerContainer}
                                initial="hidden"
                                animate="visible"
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handleNext}
                                className="space-y-5"
                            >
                                <motion.div variants={fadeInUp} className="space-y-2">
                                    <label className="block text-sm font-extrabold text-slate-700">Email de l'administrateur</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                                        <input
                                            required
                                            type="email"
                                            className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all font-bold shadow-sm"
                                            placeholder="directeur@ecole.cm"
                                            value={formData.email}
                                            onChange={(e) => update('email', e.target.value)}
                                        />
                                    </div>
                                </motion.div>

                                <motion.div variants={fadeInUp} className="space-y-2">
                                    <label className="block text-sm font-extrabold text-slate-700">Mot de passe</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                                        <input
                                            required
                                            type="password"
                                            minLength={8}
                                            className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all font-bold shadow-sm"
                                            placeholder="8 caractères minimum"
                                            value={formData.mot_de_passe}
                                            onChange={(e) => update('mot_de_passe', e.target.value)}
                                        />
                                    </div>
                                </motion.div>

                                <motion.div variants={fadeInUp} className="space-y-2">
                                    <label className="block text-sm font-extrabold text-slate-700">Confirmer le mot de passe</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                                        <input
                                            required
                                            type="password"
                                            className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all font-bold shadow-sm"
                                            placeholder="••••••••"
                                            value={formData.confirm_password}
                                            onChange={(e) => update('confirm_password', e.target.value)}
                                        />
                                    </div>
                                </motion.div>

                                <motion.div variants={fadeInUp} className="flex gap-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(0)}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all active:scale-[0.98]"
                                    >
                                        Retour
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] flex justify-center items-center gap-2 py-4 px-4 rounded-xl text-base font-extrabold text-white bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/10 transition-all active:scale-[0.98] group"
                                    >
                                        Continuer <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </motion.div>
                            </motion.form>
                        )}

                        {/* Step 2 — Confirmation */}
                        {step === 2 && (
                            <motion.form
                                key="step2"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                onSubmit={handleSubmit}
                                className="space-y-5"
                            >
                                <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
                                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Récapitulatif</p>
                                    <div className="space-y-3">
                                        <SummaryRow label="Établissement" value={formData.nom_tenant} />
                                        <SummaryRow label="URL" value={`${formData.sous_domaine}.scholaris.cm`} highlight />
                                        <SummaryRow label="Pays" value={formData.pays} />
                                        <SummaryRow label="Email admin" value={formData.email} />
                                    </div>
                                </div>

                                <p className="text-xs text-slate-400 font-medium text-center leading-relaxed px-2">
                                    En créant votre espace, vous acceptez nos{' '}
                                    <span className="text-emerald-600 font-bold cursor-pointer">Conditions Générales</span> et notre{' '}
                                    <span className="text-emerald-600 font-bold cursor-pointer">Politique de Confidentialité</span>.
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all active:scale-[0.98]"
                                    >
                                        Retour
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-[2] flex justify-center items-center gap-2 py-4 px-4 rounded-xl text-base font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-70"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            'Créer mon espace'
                                        )}
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <p className="text-center text-sm text-slate-400 font-medium mt-8">
                        Déjà inscrit ?{' '}
                        <Link to="/login" className="font-extrabold text-emerald-600 hover:text-emerald-700 transition-colors">
                            Se connecter
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

const SummaryRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500 font-medium">{label}</span>
        <span className={`text-sm font-bold ${highlight ? 'text-emerald-600' : 'text-slate-900'}`}>{value}</span>
    </div>
);

export default RegisterPage;
