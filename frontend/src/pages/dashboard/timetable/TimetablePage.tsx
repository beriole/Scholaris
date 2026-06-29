import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, Plus, Trash2, Loader2, X, ChevronDown,
    Edit2, AlertCircle, Building2,
} from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Year       { id: string; libelle: string; est_active: boolean; }
interface Class      { id: string; nom: string; niveau: string; }
interface Matiere    { id: string; nom: string; code: string; }
interface Enseignant { id: string; nom: string; prenom: string; }
interface Salle      { id: string; nom: string; type: string; capacite: number; }

interface Slot {
    id:           string;
    jour_semaine: number;
    heure_debut:  string;
    heure_fin:    string;
    est_actif:    boolean;
    matiere:      { id: string; nom: string; code: string };
    enseignant:   { id: string; nom: string; prenom: string };
    salle:        { id: string; nom: string; type: string } | null;
}

const JOURS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// Créneaux horaires affichés (07h30 → 18h00 par demi-heures, pour le positionnement)
const TIME_START = 7.5;   // 07h30
const TIME_END   = 18;    // 18h00

const PALETTE = [
    'bg-emerald-100 border-emerald-300 text-emerald-800',
    'bg-blue-100    border-blue-300    text-blue-800',
    'bg-purple-100  border-purple-300  text-purple-800',
    'bg-amber-100   border-amber-300   text-amber-800',
    'bg-rose-100    border-rose-300    text-rose-800',
    'bg-cyan-100    border-cyan-300    text-cyan-800',
    'bg-lime-100    border-lime-300    text-lime-800',
    'bg-orange-100  border-orange-300  text-orange-800',
];

const timeToH = (t: string): number => {
    const d = new Date(t);
    return d.getHours() + d.getMinutes() / 60;
};

const fmtTime = (t: string): string =>
    new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TimetablePage() {
    const { user } = useAuth();

    const [years,       setYears]       = useState<Year[]>([]);
    const [classes,     setClasses]     = useState<Class[]>([]);
    const [matieres,    setMatieres]    = useState<Matiere[]>([]);
    const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
    const [salles,      setSalles]      = useState<Salle[]>([]);

    const [selectedYear,  setSelectedYear]  = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [slots,         setSlots]         = useState<Slot[]>([]);
    const [loading,       setLoading]       = useState(false);

    // Modale ajout
    const [showModal,   setShowModal]   = useState(false);
    const [editSlot,    setEditSlot]    = useState<Slot | null>(null);
    const [saving,      setSaving]      = useState(false);
    const [formErr,     setFormErr]     = useState('');

    // Modale salle
    const [showSalleModal, setShowSalleModal] = useState(false);
    const [salleForm,      setSalleForm]      = useState({ nom: '', capacite: '', type: 'classe' });
    const [savingSalle,    setSavingSalle]    = useState(false);

    const [form, setForm] = useState({
        matiere_id:    '',
        enseignant_id: '',
        salle_id:      '',
        jour_semaine:  '1',
        heure_debut:   '07:30',
        heure_fin:     '09:00',
    });

    // ── Données ───────────────────────────────────────────────────────────────

    useEffect(() => {
        const tid = user?.tenant_id;
        if (!tid) return;

        Promise.all([
            api.get(`/api/academic/years/${tid}`),
            api.get(`/api/academic/subject-groups/${tid}`),
            api.get('/api/teachers'),
            api.get('/api/timetable/salles'),
        ]).then(([yr, sg, te, sa]) => {
            const ys: Year[] = yr.data ?? [];
            setYears(ys);
            const active = ys.find(y => y.est_active);
            if (active) setSelectedYear(active.id);

            const all: Matiere[] = [];
            for (const g of (sg.data ?? [])) all.push(...(g.matieres ?? []));
            setMatieres(all);

            setEnseignants(te.data ?? []);
            setSalles(sa.data ?? []);
        }).catch(() => {});
    }, [user?.tenant_id]);

    useEffect(() => {
        if (!selectedYear) return;
        api.get(`/api/evaluations/sequences/year/${selectedYear}`)
            .then(r => { setClasses(r.data?.classes ?? []); setSelectedClass(''); })
            .catch(() => {});
    }, [selectedYear]);

    useEffect(() => {
        if (!selectedClass || !selectedYear) return;
        setLoading(true);
        api.get('/api/timetable', { params: { classe_id: selectedClass, annee_id: selectedYear } })
            .then(r => setSlots(r.data ?? []))
            .catch(() => setSlots([]))
            .finally(() => setLoading(false));
    }, [selectedClass, selectedYear]);

    // ── Couleurs matière ──────────────────────────────────────────────────────

    const matColorMap: Record<string, string> = {};
    matieres.forEach((m, i) => { matColorMap[m.id] = PALETTE[i % PALETTE.length]; });

    // ── Handlers ─────────────────────────────────────────────────────────────

    const openCreate = () => {
        setEditSlot(null);
        setForm({ matiere_id: '', enseignant_id: '', salle_id: '', jour_semaine: '1', heure_debut: '07:30', heure_fin: '09:00' });
        setFormErr('');
        setShowModal(true);
    };

    const openEdit = (slot: Slot) => {
        setEditSlot(slot);
        setForm({
            matiere_id:    slot.matiere.id,
            enseignant_id: slot.enseignant.id,
            salle_id:      slot.salle?.id ?? '',
            jour_semaine:  String(slot.jour_semaine),
            heure_debut:   fmtTime(slot.heure_debut),
            heure_fin:     fmtTime(slot.heure_fin),
        });
        setFormErr('');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.matiere_id || !form.enseignant_id || !form.heure_debut || !form.heure_fin) {
            setFormErr('Matière, enseignant, heure début et heure fin sont requis.');
            return;
        }
        setSaving(true);
        setFormErr('');
        try {
            const payload = {
                classe_id:     selectedClass,
                annee_id:      selectedYear,
                matiere_id:    form.matiere_id,
                enseignant_id: form.enseignant_id,
                salle_id:      form.salle_id || undefined,
                jour_semaine:  parseInt(form.jour_semaine),
                heure_debut:   form.heure_debut,
                heure_fin:     form.heure_fin,
            };

            if (editSlot) {
                const r = await api.put(`/api/timetable/${editSlot.id}`, payload);
                setSlots(prev => prev.map(s => s.id === editSlot.id ? r.data : s));
            } else {
                const r = await api.post('/api/timetable', payload);
                setSlots(prev => [...prev, r.data]);
            }
            setShowModal(false);
        } catch (err: any) {
            setFormErr(err?.response?.data?.error ?? 'Erreur lors de la sauvegarde.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer ce créneau ?')) return;
        try {
            await api.delete(`/api/timetable/${id}`);
            setSlots(prev => prev.filter(s => s.id !== id));
        } catch (err: any) {
            alert(err?.response?.data?.error ?? 'Erreur.');
        }
    };

    const handleCreateSalle = async () => {
        if (!salleForm.nom || !salleForm.capacite) return;
        setSavingSalle(true);
        try {
            const r = await api.post('/api/timetable/salles', salleForm);
            setSalles(prev => [...prev, r.data]);
            setSalleForm({ nom: '', capacite: '', type: 'classe' });
            setShowSalleModal(false);
        } catch (err: any) {
            alert(err?.response?.data?.error ?? 'Erreur.');
        } finally {
            setSavingSalle(false);
        }
    };

    // ── Grid calculation ──────────────────────────────────────────────────────

    const GRID_H  = 480; // px height for TIME_START → TIME_END
    const TOTAL_H = TIME_END - TIME_START;
    const pxPerH  = GRID_H / TOTAL_H;

    const slotStyle = (slot: Slot) => {
        const top    = (timeToH(slot.heure_debut) - TIME_START) * pxPerH;
        const height = (timeToH(slot.heure_fin) - timeToH(slot.heure_debut)) * pxPerH;
        return { top: `${top}px`, height: `${Math.max(height - 4, 20)}px` };
    };

    // Lignes horaires
    const hourLines = [];
    for (let h = Math.ceil(TIME_START); h <= TIME_END; h++) {
        hourLines.push(h);
    }

    // ── Rendu ─────────────────────────────────────────────────────────────────

    return (
        <div className="p-6 space-y-6">
            {/* En-tête */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Emploi du temps</h1>
                    <p className="text-slate-500 text-sm mt-1">Planification hebdomadaire par classe</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowSalleModal(true)}
                        className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 font-medium">
                        <Building2 size={15} /> Salles
                    </button>
                    <button onClick={openCreate} disabled={!selectedClass}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 font-medium disabled:opacity-50">
                        <Plus size={15} /> Ajouter un créneau
                    </button>
                </div>
            </div>

            {/* Sélecteurs */}
            <div className="flex flex-wrap gap-3 items-end">
                <Select value={selectedYear}  onChange={e => setSelectedYear(e.target.value)}  label="Année scolaire">
                    <option value="">-- Année --</option>
                    {years.map(y => <option key={y.id} value={y.id}>{y.libelle}</option>)}
                </Select>
                <Select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} label="Classe" className="min-w-[180px]">
                    <option value="">-- Classe --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>)}
                </Select>
            </div>

            {/* Grille */}
            {!selectedClass ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                    <Clock size={40} className="text-slate-300" />
                    <p className="text-sm">Sélectionnez une classe pour voir son emploi du temps.</p>
                </div>
            ) : loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={28} className="animate-spin text-emerald-600" />
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
                    {/* En-têtes jours */}
                    <div className="grid grid-cols-[64px_repeat(6,1fr)] border-b border-slate-200 sticky top-0 bg-white z-10">
                        <div className="border-r border-slate-100" />
                        {[1, 2, 3, 4, 5, 6].map(j => (
                            <div key={j} className="py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide border-r border-slate-100 last:border-0">
                                {JOURS[j]}
                            </div>
                        ))}
                    </div>

                    {/* Corps */}
                    <div className="grid grid-cols-[64px_repeat(6,1fr)]" style={{ height: `${GRID_H}px` }}>
                        {/* Colonne horaires */}
                        <div className="border-r border-slate-100 relative">
                            {hourLines.map(h => (
                                <div key={h} className="absolute w-full flex items-center justify-end pr-2"
                                    style={{ top: `${(h - TIME_START) * pxPerH - 8}px` }}>
                                    <span className="text-[10px] text-slate-400 font-medium">{String(h).padStart(2, '0')}h</span>
                                </div>
                            ))}
                        </div>

                        {/* Colonnes jours */}
                        {[1, 2, 3, 4, 5, 6].map(jour => {
                            const daySlots = slots.filter(s => s.jour_semaine === jour);
                            return (
                                <div key={jour} className="relative border-r border-slate-100 last:border-0">
                                    {/* Lignes horaires */}
                                    {hourLines.map(h => (
                                        <div key={h} className="absolute w-full border-t border-slate-100"
                                            style={{ top: `${(h - TIME_START) * pxPerH}px` }} />
                                    ))}

                                    {/* Créneaux */}
                                    {daySlots.map(slot => (
                                        <div key={slot.id}
                                            className={`absolute left-1 right-1 rounded-lg border px-2 py-1 overflow-hidden cursor-pointer hover:shadow-md transition-shadow group ${matColorMap[slot.matiere.id] ?? PALETTE[0]}`}
                                            style={slotStyle(slot)}
                                            onClick={() => openEdit(slot)}
                                        >
                                            <p className="text-[11px] font-bold leading-tight truncate">{slot.matiere.code}</p>
                                            <p className="text-[10px] truncate opacity-80">{slot.enseignant.nom}</p>
                                            {slot.salle && <p className="text-[9px] truncate opacity-70">{slot.salle.nom}</p>}
                                            <p className="text-[9px] opacity-60">{fmtTime(slot.heure_debut)}–{fmtTime(slot.heure_fin)}</p>

                                            <button onClick={e => { e.stopPropagation(); handleDelete(slot.id); }}
                                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-200">
                                                <Trash2 size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Légende */}
            {slots.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {[...new Set(slots.map(s => s.matiere.id))].map(mid => {
                        const mat = slots.find(s => s.matiere.id === mid)?.matiere;
                        if (!mat) return null;
                        return (
                            <span key={mid} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${matColorMap[mid] ?? PALETTE[0]}`}>
                                {mat.nom}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* ── Modale Créneau ────────────────────────────────────────────── */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-800">
                                    {editSlot ? 'Modifier le créneau' : 'Nouveau créneau'}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                                    <X size={18} />
                                </button>
                            </div>

                            {formErr && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    <AlertCircle size={15} className="mt-0.5 shrink-0" /> {formErr}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <ModalSelect label="Matière *" value={form.matiere_id} onChange={v => setForm(f => ({ ...f, matiere_id: v }))}>
                                        <option value="">-- Choisir --</option>
                                        {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                                    </ModalSelect>
                                </div>
                                <div className="col-span-2">
                                    <ModalSelect label="Enseignant *" value={form.enseignant_id} onChange={v => setForm(f => ({ ...f, enseignant_id: v }))}>
                                        <option value="">-- Choisir --</option>
                                        {enseignants.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
                                    </ModalSelect>
                                </div>
                                <ModalSelect label="Jour *" value={form.jour_semaine} onChange={v => setForm(f => ({ ...f, jour_semaine: v }))}>
                                    {[1,2,3,4,5,6].map(j => <option key={j} value={j}>{JOURS[j]}</option>)}
                                </ModalSelect>
                                <ModalSelect label="Salle" value={form.salle_id} onChange={v => setForm(f => ({ ...f, salle_id: v }))}>
                                    <option value="">-- Sans salle --</option>
                                    {salles.map(s => <option key={s.id} value={s.id}>{s.nom} (cap. {s.capacite})</option>)}
                                </ModalSelect>
                                <ModalInput label="Heure début *" type="time" value={form.heure_debut} onChange={v => setForm(f => ({ ...f, heure_debut: v }))} />
                                <ModalInput label="Heure fin *"   type="time" value={form.heure_fin}   onChange={v => setForm(f => ({ ...f, heure_fin:   v }))} />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
                                    Annuler
                                </button>
                                <button onClick={handleSave} disabled={saving}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                                    {saving && <Loader2 size={14} className="animate-spin" />}
                                    {editSlot ? 'Modifier' : 'Ajouter'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Modale Salle ──────────────────────────────────────────────── */}
            <AnimatePresence>
                {showSalleModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-800">Gestion des salles</h2>
                                <button onClick={() => setShowSalleModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                            </div>

                            {/* Liste existante */}
                            <div className="max-h-48 overflow-y-auto space-y-1.5">
                                {salles.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Aucune salle configurée</p>}
                                {salles.map(s => (
                                    <div key={s.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-sm">
                                        <span className="font-medium text-slate-700">{s.nom}</span>
                                        <span className="text-slate-400 text-xs">{s.type} · {s.capacite} places</span>
                                    </div>
                                ))}
                            </div>

                            {/* Formulaire ajout */}
                            <div className="border-t border-slate-100 pt-4 space-y-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ajouter une salle</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <ModalInput label="Nom *" type="text" value={salleForm.nom} onChange={v => setSalleForm(f => ({ ...f, nom: v }))} />
                                    </div>
                                    <ModalInput label="Capacité *" type="number" value={salleForm.capacite} onChange={v => setSalleForm(f => ({ ...f, capacite: v }))} />
                                    <ModalSelect label="Type" value={salleForm.type} onChange={v => setSalleForm(f => ({ ...f, type: v }))}>
                                        <option value="classe">Salle de classe</option>
                                        <option value="laboratoire">Laboratoire</option>
                                        <option value="salle_info">Salle info</option>
                                        <option value="amphi">Amphithéâtre</option>
                                    </ModalSelect>
                                </div>
                                <button onClick={handleCreateSalle} disabled={savingSalle || !salleForm.nom || !salleForm.capacite}
                                    className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {savingSalle && <Loader2 size={14} className="animate-spin" />}
                                    <Plus size={14} /> Ajouter
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

function Select({ value, onChange, label, children, className = '' }: {
    value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    label: string; children: React.ReactNode; className?: string;
}) {
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <label className="text-xs text-slate-500 font-medium">{label}</label>
            <div className="relative">
                <select value={value} onChange={onChange}
                    className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                    {children}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
        </div>
    );
}

function ModalSelect({ label, value, onChange, children }: {
    label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">{label}</label>
            <div className="relative">
                <select value={value} onChange={e => onChange(e.target.value)}
                    className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                    {children}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
        </div>
    );
}

function ModalInput({ label, type, value, onChange }: {
    label: string; type: string; value: string; onChange: (v: string) => void;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white" />
        </div>
    );
}
