import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Layers, CalendarDays, ClipboardList, UserCheck, Clock, ArrowRight } from 'lucide-react';
import api from '../../lib/api';
import { useTeacher } from './TeacherLayout';
import { useI18n } from '../../i18n/i18n';

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const fmtTime = (t: string) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

interface Slot {
    id: string; jour_semaine: number; heure_debut: string; heure_fin: string;
    matiere: { nom: string; code: string }; classe: { nom: string }; salle: { nom: string } | null;
}

export default function TeacherHome() {
    const { profil, annee, affectations } = useTeacher();
    const { t } = useI18n();
    const navigate = useNavigate();
    const [slots, setSlots] = useState<Slot[]>([]);

    const todayIdx = new Date().getDay(); // 0=dim … 6=sam

    useEffect(() => {
        if (!annee) return;
        api.get('/api/timetable/teacher', { params: { enseignant_id: profil.id, annee_id: annee.id } })
            .then(r => setSlots(r.data ?? []))
            .catch(() => setSlots([]));
    }, [profil.id, annee]);

    const classesUniques = [...new Set(affectations.map(a => a.classe.id))];
    const matieresUniques = [...new Set(affectations.map(a => a.matiere.id))];
    const todaySlots = slots.filter(s => s.jour_semaine === todayIdx)
        .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut));

    const kpis = [
        { label: 'Mes classes',   value: classesUniques.length,  icon: Layers,       tint: 'text-emerald-600 bg-emerald-50' },
        { label: 'Mes matières',  value: matieresUniques.length, icon: BookOpen,     tint: 'text-blue-600 bg-blue-50' },
        { label: 'Affectations',  value: affectations.length,    icon: ClipboardList,tint: 'text-purple-600 bg-purple-50' },
        { label: 'Cours du jour', value: todaySlots.length,      icon: CalendarDays, tint: 'text-amber-600 bg-amber-50' },
    ];

    return (
        <div className="space-y-7 max-w-6xl">
            {/* Bandeau d'accueil premium */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-7 lg:p-9 text-white shadow-xl">
                <div className="absolute -right-10 -top-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute -right-20 bottom-0 w-56 h-56 bg-emerald-400/10 rounded-full blur-3xl" />
                <div className="relative">
                    <p className="text-emerald-300 text-sm font-semibold">{t('Bonjour,')}</p>
                    <h1 className="text-2xl lg:text-3xl font-black mt-1">{profil.prenom} {profil.nom}</h1>
                    <p className="text-slate-300 text-sm mt-2 max-w-md">
                        {profil.specialite ? `${profil.specialite} · ` : ''}{t(JOURS[todayIdx])} — {t('voici votre activité du jour.')}
                    </p>
                </div>
            </motion.div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((k, i) => (
                    <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${k.tint}`}>
                            <k.icon className="w-5 h-5" />
                        </div>
                        <p className="text-2xl font-black text-slate-900">{k.value}</p>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mt-0.5">{t(k.label)}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-start">
                {/* Mes classes */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                        <h2 className="font-bold text-slate-900">{t('Mes enseignements')}</h2>
                        <button onClick={() => navigate('/prof/classes')}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                            {t('Tout voir')} <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    {affectations.length === 0 ? (
                        <div className="p-10 text-center text-sm text-slate-400">
                            {t("Aucune affectation pour le moment. Contactez l'administration.")}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {affectations.slice(0, 6).map(a => (
                                <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
                                        {a.matiere.code}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{a.matiere.nom}</p>
                                        <p className="text-xs text-slate-400">{a.classe.nom} · {a.classe.niveau}</p>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button title={t('Saisir les notes')}
                                            onClick={() => navigate(`/prof/grades?classe_id=${a.classe.id}&matiere_id=${a.matiere.id}`)}
                                            className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all">
                                            <ClipboardList className="w-4 h-4" />
                                        </button>
                                        <button title={t("Faire l'appel")}
                                            onClick={() => navigate(`/prof/attendance?classe_id=${a.classe.id}&matiere_id=${a.matiere.id}`)}
                                            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                            <UserCheck className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Emploi du jour */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <h2 className="font-bold text-slate-900">{t("Cours d'aujourd'hui")}</h2>
                    </div>
                    {todaySlots.length === 0 ? (
                        <div className="p-10 text-center text-sm text-slate-400">{t("Aucun cours programmé aujourd'hui.")} 🎉</div>
                    ) : (
                        <div className="p-3 space-y-2">
                            {todaySlots.map(s => (
                                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70">
                                    <div className="text-center shrink-0 w-14">
                                        <p className="text-xs font-black text-slate-800">{fmtTime(s.heure_debut)}</p>
                                        <p className="text-[10px] text-slate-400">{fmtTime(s.heure_fin)}</p>
                                    </div>
                                    <div className="w-px h-8 bg-emerald-200" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{s.matiere.nom}</p>
                                        <p className="text-xs text-slate-400">{s.classe.nom}{s.salle ? ` · ${s.salle.nom}` : ''}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
