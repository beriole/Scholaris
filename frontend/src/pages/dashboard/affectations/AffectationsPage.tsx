import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Trash2, Loader2, X, AlertCircle, ChevronDown,
    UserCog, BookOpen, CheckCircle2, Edit2,
} from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

interface Year       { id: string; libelle: string; est_active: boolean; }
interface Class      { id: string; nom: string; niveau: string; }
interface Matiere    { id: string; nom: string; code: string; coefficient: number; }
interface Enseignant { id: string; nom: string; prenom: string; specialite: string | null; }
interface Affectation {
    id:             string;
    coefficient:    number | null;
    volume_horaire: number | null;
    matiere:        { id: string; nom: string; code: string; coefficient: number };
    enseignant:     { id: string; nom: string; prenom: string };
}

export default function AffectationsPage() {
    const { user } = useAuth();

    const [years,        setYears]        = useState<Year[]>([]);
    const [classes,      setClasses]      = useState<Class[]>([]);
    const [matieres,     setMatieres]     = useState<Matiere[]>([]);
    const [enseignants,  setEnseignants]  = useState<Enseignant[]>([]);
    const [affectations, setAffectations] = useState<Affectation[]>([]);

    const [selYear,   setSelYear]   = useState('');
    const [selClass,  setSelClass]  = useState('');
    const [loading,   setLoading]   = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editId,    setEditId]    = useState<string | null>(null);
    const [saving,    setSaving]    = useState(false);
    const [err,       setErr]       = useState('');
    const [ok,        setOk]        = useState('');

    const [form, setForm] = useState({
        matiere_id: '', enseignant_id: '', volume_horaire: '', coefficient: '',
    });

    useEffect(() => {
        const tid = user?.tenant_id;
        if (!tid) return;
        Promise.all([
            api.get(`/api/academic/years/${tid}`),
            api.get(`/api/academic/subject-groups/${tid}`),
            api.get('/api/teachers'),
        ]).then(([yr, sg, te]) => {
            const ys: Year[] = yr.data ?? [];
            setYears(ys);
            const active = ys.find(y => y.est_active);
            if (active) setSelYear(active.id);
            const all: Matiere[] = [];
            for (const g of (sg.data ?? [])) all.push(...(g.matieres ?? []));
            setMatieres(all);
            setEnseignants(te.data ?? []);
        }).catch(() => {});
    }, [user?.tenant_id]);

    // Classes de l'année sélectionnée
    useEffect(() => {
        if (!selYear) return;
        api.get(`/api/academic/classes/${selYear}`)
            .then(r => { setClasses(r.data ?? []); setSelClass(''); setAffectations([]); })
            .catch(() => {});
    }, [selYear]);

    // Affectations pour classe+année
    useEffect(() => {
        if (!selClass || !selYear) return;
        setLoading(true);
        api.get('/api/affectations', { params: { classe_id: selClass, annee_id: selYear } })
            .then(r => setAffectations(r.data ?? []))
            .catch(() => setAffectations([]))
            .finally(() => setLoading(false));
    }, [selClass, selYear]);

    const openCreate = () => {
        setEditId(null);
        setForm({ matiere_id: '', enseignant_id: '', volume_horaire: '', coefficient: '' });
        setErr('');
        setShowModal(true);
    };

    const openEdit = (a: Affectation) => {
        setEditId(a.id);
        setForm({
            matiere_id:     a.matiere.id,
            enseignant_id:  a.enseignant.id,
            volume_horaire: a.volume_horaire?.toString() ?? '',
            coefficient:    a.coefficient?.toString() ?? '',
        });
        setErr('');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.matiere_id || !form.enseignant_id) {
            setErr('Matière et enseignant requis.'); return;
        }
        setSaving(true); setErr(''); setOk('');
        try {
            if (editId) {
                const r = await api.put(`/api/affectations/${editId}`, {
                    enseignant_id:  form.enseignant_id,
                    volume_horaire: form.volume_horaire || undefined,
                    coefficient:    form.coefficient    || undefined,
                });
                setAffectations(prev => prev.map(a => a.id === editId ? { ...a, ...r.data } : a));
                setOk('Affectation mise à jour.');
            } else {
                const r = await api.post('/api/affectations', {
                    classe_id:      selClass,
                    annee_id:       selYear,
                    matiere_id:     form.matiere_id,
                    enseignant_id:  form.enseignant_id,
                    volume_horaire: form.volume_horaire || undefined,
                    coefficient:    form.coefficient    || undefined,
                });
                setAffectations(prev => [...prev, r.data]);
                setOk('Affectation créée.');
            }
            setShowModal(false);
        } catch (e: any) {
            setErr(e?.response?.data?.error ?? 'Erreur.');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer cette affectation ?')) return;
        try {
            await api.delete(`/api/affectations/${id}`);
            setAffectations(prev => prev.filter(a => a.id !== id));
        } catch {}
    };

    const unaffectedMatieres = matieres.filter(m => !affectations.find(a => a.matiere.id === m.id));
    const selectedClass = classes.find(c => c.id === selClass);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Affectations enseignants</h1>
                    <p className="text-slate-500 text-sm mt-1">Assigner les enseignants aux matières — coefficient par classe</p>
                </div>
                <button onClick={openCreate} disabled={!selClass}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                    <Plus size={15} /> Ajouter une affectation
                </button>
            </div>

            {/* Sélecteurs */}
            <div className="flex flex-wrap gap-3">
                <SelField label="Année scolaire" value={selYear} onChange={setSelYear}>
                    <option value="">-- Année --</option>
                    {years.map(y => <option key={y.id} value={y.id}>{y.libelle}{y.est_active ? ' ★' : ''}</option>)}
                </SelField>
                <SelField label="Classe" value={selClass} onChange={setSelClass} className="min-w-[200px]">
                    <option value="">-- Classe --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.nom} · {c.niveau}</option>)}
                </SelField>
            </div>

            {ok && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm">
                    <CheckCircle2 size={15} /> {ok}
                </div>
            )}

            {/* Tableau */}
            {!selClass ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                    <UserCog size={40} className="text-slate-200" />
                    <p className="text-sm">Sélectionnez une classe pour voir ses affectations.</p>
                </div>
            ) : loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-emerald-600" />
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    {selectedClass && (
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3">
                            <span className="text-sm font-bold text-slate-800">{selectedClass.nom}</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-semibold">{selectedClass.niveau}</span>
                            {unaffectedMatieres.length > 0 && (
                                <span className="ml-auto text-xs text-amber-600 font-medium">
                                    {unaffectedMatieres.length} matière(s) sans enseignant
                                </span>
                            )}
                        </div>
                    )}
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                {['Matière','Code','Coeff. classe','Enseignant','Vol./sem.',''].map(h => (
                                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {affectations.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-slate-400 text-sm">
                                        <BookOpen size={32} className="mx-auto mb-3 text-slate-200" />
                                        Aucune affectation pour cette classe.
                                    </td>
                                </tr>
                            ) : affectations.map((a, i) => (
                                <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                                    className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-800">{a.matiere.nom}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">{a.matiere.code}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {a.coefficient != null ? (
                                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">{a.coefficient}</span>
                                        ) : (
                                            <span className="text-slate-400 text-xs">{a.matiere.coefficient} <span className="text-slate-300">(défaut)</span></span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
                                                {a.enseignant.prenom[0]}{a.enseignant.nom[0]}
                                            </div>
                                            <span className="text-slate-700 font-medium">{a.enseignant.prenom} {a.enseignant.nom}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-xs">
                                        {a.volume_horaire ? `${a.volume_horaire}h` : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => openEdit(a)}
                                                className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                                                <Edit2 size={13} />
                                            </button>
                                            <button onClick={() => handleDelete(a.id)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Modale ── */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-slate-800">
                                    {editId ? 'Modifier l\'affectation' : 'Nouvelle affectation'}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
                            </div>

                            {err && (
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    <AlertCircle size={14} /> {err}
                                </div>
                            )}

                            <div className="space-y-3">
                                {editId ? (
                                    <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="text-xs text-slate-500">Matière : <span className="font-semibold text-slate-700">
                                            {affectations.find(a => a.id === editId)?.matiere.nom}
                                        </span></p>
                                    </div>
                                ) : (
                                    <ModalSelect label="Matière *" value={form.matiere_id} onChange={v => setForm(f => ({ ...f, matiere_id: v }))}>
                                        <option value="">-- Choisir --</option>
                                        {unaffectedMatieres.map(m => (
                                            <option key={m.id} value={m.id}>{m.nom} — coeff. défaut: {m.coefficient}</option>
                                        ))}
                                        {unaffectedMatieres.length === 0 && <option disabled>Toutes les matières sont affectées</option>}
                                    </ModalSelect>
                                )}

                                <ModalSelect label="Enseignant *" value={form.enseignant_id} onChange={v => setForm(f => ({ ...f, enseignant_id: v }))}>
                                    <option value="">-- Choisir --</option>
                                    {enseignants.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.prenom} {e.nom}{e.specialite ? ` (${e.specialite})` : ''}
                                        </option>
                                    ))}
                                </ModalSelect>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 mb-1 block">Coefficient (ce niveau)</label>
                                        <input type="number" value={form.coefficient}
                                            onChange={e => setForm(f => ({ ...f, coefficient: e.target.value }))}
                                            min="1" max="20" placeholder="Ex: 4"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <p className="text-[10px] text-slate-400 mt-0.5">Vide = coeff. de la matière</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 mb-1 block">Vol. horaire (h/sem)</label>
                                        <input type="number" value={form.volume_horaire}
                                            onChange={e => setForm(f => ({ ...f, volume_horaire: e.target.value }))}
                                            min="1" max="40" placeholder="Ex: 4"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
                                    Annuler
                                </button>
                                <button onClick={handleSave} disabled={saving}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                                    {saving && <Loader2 size={13} className="animate-spin" />}
                                    {editId ? 'Mettre à jour' : 'Affecter'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function SelField({ label, value, onChange, children, className = '' }: {
    label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string;
}) {
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <label className="text-xs font-medium text-slate-500">{label}</label>
            <div className="relative">
                <select value={value} onChange={e => onChange(e.target.value)}
                    className="appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none w-full">
                    {children}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
        </div>
    );
}

function ModalSelect({ label, value, onChange, children }: {
    label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
    return (
        <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
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
