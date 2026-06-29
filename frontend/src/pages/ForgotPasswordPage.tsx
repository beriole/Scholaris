import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    BookOpen,
    Mail,
    ArrowLeft,
    ArrowRight,
    Loader2,
    KeyRound,
    ShieldCheck,
    CheckCircle2,
} from "lucide-react";

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const maskEmail = (email: string) => {
        const [name, domain] = email.split("@");

        if (!name || !domain) return email;

        return `${name.substring(0, 2)}******@${domain}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        setIsLoading(true);

        setTimeout(() => {
            setIsLoading(false);
            setIsSent(true);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="grid min-h-screen lg:grid-cols-2">
                {/* LEFT SIDE */}
                <div className="relative hidden lg:flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0">
                        <div className="absolute top-20 left-20 w-96 h-96 rounded-full bg-emerald-500/20 blur-[120px]" />
                        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-cyan-500/10 blur-[120px]" />
                    </div>

                    <div className="relative z-10 max-w-lg px-10">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-3 mb-12"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-emerald-400" />
                            </div>

                            <span className="text-white font-black text-2xl">
                                Scholaris
                                <span className="text-emerald-400">.</span>
                            </span>
                        </Link>

                        <div className="space-y-6">
                            <span className="inline-flex px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-semibold border border-emerald-500/20">
                                Sécurité & Authentification
                            </span>

                            <h1 className="text-5xl font-black text-white leading-tight">
                                Récupérez
                                <br />
                                l'accès à votre compte.
                            </h1>

                            <p className="text-slate-400 text-lg leading-relaxed">
                                Nous vous enverrons un code OTP sécurisé afin de
                                réinitialiser votre mot de passe en toute sécurité.
                            </p>
                        </div>

                        {/* Illustration */}
                        <div className="mt-16 relative">
                            <div className="w-full h-64 rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-xl flex items-center justify-center">
                                <motion.div
                                    animate={{
                                        y: [0, -15, 0],
                                    }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 4,
                                    }}
                                    className="w-32 h-32 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20"
                                >
                                    <KeyRound className="w-16 h-16 text-emerald-400" />
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="flex items-center justify-center px-6 py-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-[460px]"
                    >
                        <div className="bg-white rounded-[32px] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.12)]">
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-8"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Retour à la connexion
                            </Link>

                            <motion.div
                                animate={{
                                    rotate: [0, -8, 8, -8, 0],
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 5,
                                }}
                                className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6"
                            >
                                <KeyRound className="w-7 h-7 text-emerald-600" />
                            </motion.div>

                            <AnimatePresence mode="wait">
                                {!isSent ? (
                                    <motion.div
                                        key="form"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <span className="inline-flex px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold mb-5">
                                            Sécurité du compte
                                        </span>

                                        <h2 className="text-3xl font-black text-slate-900 leading-tight">
                                            Mot de passe oublié ?
                                        </h2>

                                        <p className="text-slate-500 mt-4 mb-8 leading-relaxed">
                                            Saisissez votre adresse e-mail et nous vous
                                            enverrons un code OTP sécurisé.
                                        </p>

                                        <form
                                            onSubmit={handleSubmit}
                                            className="space-y-6"
                                        >
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                                    Adresse e-mail
                                                </label>

                                                <div className="relative">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

                                                    <input
                                                        type="email"
                                                        required
                                                        value={email}
                                                        onChange={(e) =>
                                                            setEmail(e.target.value)
                                                        }
                                                        placeholder="directeur@ecole.cm"
                                                        className="
                              w-full
                              h-14
                              rounded-2xl
                              border
                              border-slate-200
                              bg-slate-50
                              pl-12
                              pr-4
                              outline-none
                              focus:border-emerald-500
                              focus:ring-4
                              focus:ring-emerald-500/10
                              transition-all
                            "
                                                    />
                                                </div>
                                            </div>

                                            <motion.button
                                                whileHover={{ y: -2 }}
                                                whileTap={{ scale: 0.98 }}
                                                disabled={isLoading}
                                                type="submit"
                                                className="
                          w-full
                          h-14
                          rounded-2xl
                          bg-emerald-600
                          hover:bg-emerald-500
                          text-white
                          font-bold
                          flex
                          items-center
                          justify-center
                          gap-2
                          shadow-lg
                          shadow-emerald-600/20
                          transition-all
                        "
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <>
                                                        Envoyer le code OTP
                                                        <ArrowRight className="w-5 h-5" />
                                                    </>
                                                )}
                                            </motion.button>
                                        </form>

                                        <div className="flex items-center justify-center gap-2 mt-8 text-sm text-slate-500">
                                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                            Protection SSL & récupération sécurisée
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="success"
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                    >
                                        <div className="text-center">
                                            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                                                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                                            </div>

                                            <h3 className="text-3xl font-black text-slate-900 mb-4">
                                                Code envoyé !
                                            </h3>

                                            <p className="text-slate-500 mb-6">
                                                Vérifiez votre boîte mail.
                                            </p>

                                            <div className="inline-flex px-4 py-2 rounded-xl bg-slate-100 font-semibold text-slate-800">
                                                {maskEmail(email)}
                                            </div>

                                            <p className="mt-4 text-sm text-slate-500">
                                                Le code expire dans 10 minutes.
                                            </p>

                                            <button
                                                onClick={() => setIsSent(false)}
                                                className="mt-8 text-emerald-600 font-semibold"
                                            >
                                                Utiliser une autre adresse
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;