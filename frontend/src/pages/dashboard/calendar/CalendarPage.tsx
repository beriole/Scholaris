import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Plus, X, Loader2, Trash2,
    AlertCircle, CalendarDays,
} from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n/i18n';

interface Year  { id: string; libelle: string; est_active: boolean; }
interface Event {
    id:                string;
    date_debut:        string;
    date_fin:          string | null;
    type:              string;
    libelle:           string;
    affecte_presences: boolean;
    annee:             { libelle: string };
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    ferie:      { label: 'Jour férié',   color: 'text-red-700',    bg: 'bg-red-100 border-red-200' },
    vacances:   { label: 'Vacances',     color: 'text-blue-700',   bg: 'bg-blue-100 border-blue-200' },
    examen:     { label: 'Examen',       color: 'text-purple-700', bg: 'bg-purple-100 border-purple-200' },
    evenement:  { label: 'Événement',    color: 'text-emerald-700',bg: 'bg-emerald-100 border-emerald-200' },
};

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_FR   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

const isoDate = (d: Date) => d.toISOString().split('T')[0];

export default function CalendarPage() {
    const { user } = useAuth();
    const { t } = useI18n();

    const now     = new Date();
    const [year,  setYear]  = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());

    const [years,     setYears]     = useState<Year[]>([]);
    const [selYear,   setSelYear]   = useState('');
    const [events,    setEvents]    = useState<Event[]>([]);
    const [loading,   setLoading]   = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [clickedDay,setClickedDay]= useState<string>('');
    const [saving,    setSaving]    = useState(false);
    const [err,       setErr]       = useState('');

    const [form, setForm] = useState({
        libelle: '', type: 'evenement', date_debut: '', date_fin: '',
        affecte_presences: false,
    });

    useEffect(() => {
        const tid = user?.tenant_id;
        if (!tid) return;
        api.get(`/api/academic/years/${tid}`).then(r => {
            const ys: Year[] = r.data ?? [];
            setYears(ys);
            const active = ys.find(y => y.est_active);
            if (active) setSelYear(active.id);
        }).catch(() => {});
    }, [user?.tenant_id]);

    useEffect(() => {
        if (!selYear) return;
        setLoading(true);
        const mois = `${year}-${String(month + 1).padStart(2, '0')}`;
        api.get('/api/calendar', { params: { annee_id: selYear, mois } })
            .then(r => setEvents(r.data ?? []))
            .catch(() => setEvents([]))
            .finally(() => setLoading(false));
    }, [selYear, year, month]);

    // Grille calendrier
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    // Offset : lundi = 0
    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalCells  = startOffset + lastDay.getDate();
    const weeks       = Math.ceil(totalCells / 7);

    const eventsOnDay = (dayStr: string) =>
        events.filter(e => {
            const debut = e.date_debut.split('T')[0];
            const fin   = e.date_fin?.split('T')[0] ?? debut;
            return dayStr >= debut && dayStr <= fin;
        });

    const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
    const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

    const openModal = (dayStr: string) => {
        setClickedDay(dayStr);
        setForm({ libelle: '', type: 'evenement', date_debut: dayStr, date_fin: '', affecte_presences: false });
        setErr('');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.libelle || !form.date_debut) { setErr(t('Libellé et date requis.')); return; }
        setSaving(true); setErr('');
        try {
            const r = await api.post('/api/calendar', {
                annee_id:          selYear,
                libelle:           form.libelle,
                type:              form.type,
                date_debut:        form.date_debut,
                date_fin:          form.date_fin || undefined,
                affecte_presences: form.affecte_presences,
            });
            setEvents(prev => [...prev, r.data]);
            setShowModal(false);
        } catch (e: any) {
            setErr(e?.response?.data?.error ?? t('Erreur.'));
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/api/calendar/${id}`);
            setEvents(prev => prev.filter(e => e.id !== id));
        } catch {}
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('Calendrier scolaire')}</h1>
                    <p className="text-slate-500 text-sm mt-1">{t('Jours fériés, vacances, examens et événements')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <select value={selYear} onChange={e => setSelYear(e.target.value)}
                            className="appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-7 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                            <option value="">{t('-- Année --')}</option>
                            {years.map(y => <option key={y.id} value={y.id}>{y.libelle}</option>)}
                        </select>
                        <ChevronRight size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
                    </div>
                </div>
            </div>

            {/* Légende */}
            <div className="flex flex-wrap gap-2">
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <span key={k} className={`px-2.5 py-1 rounded-full text-xs font-medium border ${v.bg} ${v.color}`}>{t(v.label)}</span>
                ))}
            </div>

            {/* Navigation mois */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-all"><ChevronLeft size={18} /></button>
                    <h2 className="text-base font-bold text-slate-800">{t(MONTHS_FR[month])} {year}</h2>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-all"><ChevronRight size={18} /></button>
                </div>

                {/* Jours de la semaine */}
                <div className="grid grid-cols-7 border-b border-slate-100">
                    {DAYS_FR.map(d => (
                        <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">{t(d)}</div>
                    ))}
                </div>

                {/* Grille jours */}
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-emerald-600" /></div>
                ) : (
                    <div className="grid grid-cols-7">
                        {Array.from({ length: weeks * 7 }).map((_, idx) => {
                            const dayNum  = idx - startOffset + 1;
                            const isValid = dayNum >= 1 && dayNum <= lastDay.getDate();
                            const dayStr  = isValid ? isoDate(new Date(year, month, dayNum)) : '';
                            const dayEvts = isValid ? eventsOnDay(dayStr) : [];
                            const isToday = dayStr === isoDate(now);

                            return (
                                <div key={idx}
                                    className={`min-h-[80px] p-1.5 border-b border-r border-slate-100 last:border-r-0 transition-all ${isValid ? 'hover:bg-slate-50 cursor-pointer' : 'bg-slate-50/50'}`}
                                    onClick={() => isValid && openModal(dayStr)}>
                                    {isValid && (
                                        <>
                                            <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1 ${isToday ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}>
                                                {dayNum}
                                            </div>
                                            <div className="space-y-0.5">
                                                {dayEvts.slice(0, 3).map(e => {
                                                    const cfg = TYPE_CONFIG[e.type] ?? TYPE_CONFIG.evenement;
                                                    return (
                                                        <div key={e.id}
                                                            onClick={ev => { ev.stopPropagation(); handleDelete(e.id); }}
                                                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer hover:opacity-70 border ${cfg.bg} ${cfg.color}`}
                                                            title={`${e.libelle} (clic pour supprimer)`}>
                                                            {e.libelle}
                                                        </div>
                                                    );
                                                })}
                                                {dayEvts.length > 3 && (
                                                    <div className="text-[9px] text-slate-400 pl-1">+{dayEvts.length - 3} {t('de plus')}</div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Liste compacte des événements du mois */}
            {events.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{events.length} {t('événement(s) ce mois')}</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {events.map(e => {
                            const cfg = TYPE_CONFIG[e.type] ?? TYPE_CONFIG.evenement;
                            return (
                                <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${cfg.bg} ${cfg.color}`}>{t(cfg.label)}</span>
                                    <span className="flex-1 text-sm text-slate-700 font-medium">{e.libelle}</span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(e.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                        {e.date_fin && e.date_fin !== e.date_debut ? ` → ${new Date(e.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}` : ''}
                                    </span>
                                    {e.affecte_presences && <span className="text-[10px] text-orange-600 font-medium bg-orange-50 px-1.5 rounded">{t('présences')}</span>}
                                    <button onClick={() => handleDelete(e.id)}
                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Modale ──────────────────────────────────────────────────────── */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-slate-800">{t('Nouvel événement')} — {clickedDay}</h2>
                                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
                            </div>

                            {err && (
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    <AlertCircle size={14} /> {err}
                                </div>
                            )}

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">{t('Libellé *')}</label>
                                    <input value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))}
                                        className="input-field" placeholder="Ex: Fête nationale" />
                                </div>
                                <div className="relative">
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">{t('Type *')}</label>
                                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                        className="input-field appearance-none pr-8">
                                        {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
                                    </select>
                                    <ChevronRight size={13} className="absolute right-2.5 bottom-2.5 text-slate-400 pointer-events-none rotate-90" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 mb-1 block">{t('Date début *')}</label>
                                        <input type="date" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 mb-1 block">{t('Date fin')}</label>
                                        <input type="date" value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))} className="input-field" />
                                    </div>
                                </div>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input type="checkbox" checked={form.affecte_presences} onChange={e => setForm(f => ({ ...f, affecte_presences: e.target.checked }))}
                                        className="w-4 h-4 rounded accent-emerald-600" />
                                    <span className="text-sm text-slate-600">{t('Affecte le calcul des présences')}</span>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
                                    {t('Annuler')}
                                </button>
                                <button onClick={handleSave} disabled={saving}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                                    {saving && <Loader2 size={13} className="animate-spin" />} {t('Enregistrer')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
