import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Loader2, MapPin, Clock } from 'lucide-react';
import api from '../../lib/api';
import { useTeacher } from './TeacherLayout';
import { useI18n } from '../../i18n/i18n';

const JOURS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const fmtTime = (t: string) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const PALETTE = [
    'from-emerald-500 to-emerald-600',
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-amber-500 to-amber-600',
    'from-rose-500 to-rose-600',
    'from-cyan-500 to-cyan-600',
];

interface Slot {
    id: string; jour_semaine: number; heure_debut: string; heure_fin: string;
    matiere: { id: string; nom: string; code: string };
    classe: { id: string; nom: string; niveau: string };
    salle: { id: string; nom: string } | null;
}

export default function TeacherTimetable() {
    const { profil, annee } = useTeacher();
    const { t } = useI18n();
    const [slots, setSlots]     = useState<Slot[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!annee) { setLoading(false); return; }
        api.get('/api/timetable/teacher', { params: { enseignant_id: profil.id, annee_id: annee.id } })
            .then(r => setSlots(r.data ?? []))
            .catch(() => setSlots([]))
            .finally(() => setLoading(false));
    }, [profil.id, annee]);

    const colorOf: Record<string, string> = {};
    [...new Set(slots.map(s => s.matiere.id))].forEach((id, i) => { colorOf[id] = PALETTE[i % PALETTE.length]; });

    const todayIdx = new Date().getDay();

    return (
        <div className="max-w-6xl space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
                    <CalendarDays className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900">{t('Mon emploi du temps')}</h1>
                    <p className="text-sm text-slate-400">{annee ? `${t('Année')} ${annee.libelle}` : t('Aucune année active')}</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-emerald-600" /></div>
            ) : slots.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center">
                    <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">{t("Aucun cours programmé. L'administration gère l'emploi du temps.")}</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5, 6].map(jour => {
                        const daySlots = slots.filter(s => s.jour_semaine === jour)
                            .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut));
                        const isToday = jour === todayIdx;
                        return (
                            <motion.div key={jour} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: jour * 0.04 }}
                                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isToday ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-100'}`}>
                                <div className={`px-4 py-3 flex items-center justify-between ${isToday ? 'bg-emerald-50' : 'bg-slate-50/60'}`}>
                                    <span className={`font-black text-sm ${isToday ? 'text-emerald-700' : 'text-slate-700'}`}>{t(JOURS[jour])}</span>
                                    {isToday && <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 bg-white px-2 py-0.5 rounded-full">{t("Aujourd'hui")}</span>}
                                </div>
                                <div className="p-3 space-y-2 min-h-[80px]">
                                    {daySlots.length === 0 ? (
                                        <p className="text-xs text-slate-300 text-center py-6">{t('Libre')}</p>
                                    ) : daySlots.map(s => (
                                        <div key={s.id} className="rounded-xl border border-slate-100 overflow-hidden">
                                            <div className={`h-1 bg-gradient-to-r ${colorOf[s.matiere.id]}`} />
                                            <div className="p-3">
                                                <p className="text-sm font-bold text-slate-800">{s.matiere.nom}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{s.classe.nom}</p>
                                                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtTime(s.heure_debut)}–{fmtTime(s.heure_fin)}</span>
                                                    {s.salle && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.salle.nom}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
