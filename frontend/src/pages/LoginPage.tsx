import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Mail, Lock, ArrowRight, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { login, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    // Redirige dès que isAuthenticated passe à true (après setToken asynchrone)
    React.useEffect(() => {
        if (isAuthenticated && user) {
            const dest = user.role === 'super_admin' ? '/dashboard'
                       : user.role === 'enseignant'  ? '/prof'
                       : '/ecole-dashboard';
            navigate(dest, { replace: true });
        }
    }, [isAuthenticated, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await api.post('/api/auth/login', {
                email,
                mot_de_passe: password
            });

            const { token, user: userData } = response.data;
            login(token, userData);
            // La navigation se fait via le useEffect ci-dessus.
            // Fallback direct si React Router ne répond pas (bug extension navigateur).
            setTimeout(() => {
                if (userData.role === 'super_admin') window.location.href = '/dashboard';
                else if (userData.role === 'enseignant') window.location.href = '/prof';
                else window.location.href = '/ecole-dashboard';
            }, 300);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Une erreur est survenue lors de la connexion.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex font-sans bg-white text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">

            {/* Light corporate Left panel - Visual/Brand */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                className="hidden lg:flex w-[45%] relative overflow-hidden bg-slate-900 flex-col justify-between p-12"
            >
                <motion.img
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
                    alt="Élèves en classe"
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-slate-900/10 mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-emerald-900/20 mix-blend-overlay"></div>

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
                    <div className="inline-block px-3 py-1 mb-6 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-extrabold uppercase tracking-widest shadow-sm">
                        Espace Sécurisé
                    </div>
                    <h1 className="text-4xl lg:text-[2.75rem] font-extrabold text-white leading-[1.1] mb-6 drop-shadow-lg tracking-tight">
                        L'excellence académique à portée de clic.
                    </h1>
                    <p className="text-slate-200/90 text-lg font-medium leading-relaxed drop-shadow-md max-w-md">
                        Identifiez-vous pour administrer les notes, la comptabilité et le suivi rigoureux de vos apprenants.
                    </p>
                </motion.div>
            </motion.div>

            {/* Right panel - Auth Form */}
            <div className="w-full lg:w-[55%] flex flex-col justify-center p-8 sm:p-16 lg:p-24 relative bg-white">

                <Link to="/" className="absolute top-8 left-8 sm:left-auto sm:right-12 flex items-center text-sm font-bold text-slate-400 hover:text-slate-800 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Retour au site
                </Link>

                <div className="w-full max-w-[400px] mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="mb-12"
                    >
                        <h2 className="text-[2.5rem] font-extrabold text-slate-900 mb-3 tracking-tight">Connexion</h2>
                        <p className="text-slate-500 font-medium text-[17px]">Entrez vos identifiants pour accéder au portail.</p>
                    </motion.div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-6 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2"
                            >
                                <AlertCircle className="w-4 h-4" /> {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.form
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        onSubmit={handleSubmit}
                        className="space-y-6"
                    >
                        <div className="space-y-5">

                            <motion.div variants={fadeInUp} className="group">
                                <label className="block text-sm font-extrabold text-slate-700 mb-2">
                                    Adresse e-mail
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all font-bold text-base shadow-sm"
                                        placeholder="nom@etablissement.cm"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </motion.div>

                            <motion.div variants={fadeInUp} className="group">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-extrabold text-slate-700">
                                        Mot de passe
                                    </label>
                                    <Link to="/forgot-password" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                                        Oublié ?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all font-bold text-base shadow-sm"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </motion.div>
                        </div>

                        <motion.button
                            variants={fadeInUp}
                            type="submit"
                            disabled={isLoading}
                            className="mt-6 w-full flex justify-center items-center py-4 px-4 rounded-xl text-base font-extrabold text-white bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/10 focus:outline-none focus:ring-4 focus:ring-slate-900/20 transition-all active:scale-[0.98] disabled:opacity-70 group"
                        >
                            <span className="flex items-center gap-2">
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>Accéder à l'espace <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </span>
                        </motion.button>

                        <motion.div variants={fadeInUp} className="text-center mt-12 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <p className="text-slate-500 text-sm font-medium">
                                Accès réservé aux administrateurs.<br />
                                Contactez votre établissement pour obtenir vos identifiants.
                            </p>
                        </motion.div>
                    </motion.form>
                </div>

            </div>
        </div>
    );
};

export default LoginPage;
