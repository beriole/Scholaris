import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserCheck, Check, X, Clock, Ban, Loader2, Save, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { useTeacher } from './TeacherLayout';

type Statut = 'present' | 'absent' | 'retard' | 'exclu';
interface Row { inscription_id: string; eleve_id: string; eleve: { nom: string; prenom: string; matricule: string; sexe: string }; }

const STATUTS: { value: Statut; label: string; icon: any; active: string }[] = [
    { value: 'present', label: 'Présent', icon: Check, active: 'bg-emerald-600 text-white border-emerald-600' },
    { value: 'absent',  label: 'Absent',  icon: X,     active: 'bg-red-600 text-white border-red-600' },
    { value: 'retard',  label: 'Retard',  icon: Clock, active: 'bg-amber-500 text-white border-amber-500' },
    { value: 'exclu',   label: 'Exclu',   icon: Ban,   active: 'bg-slate-700 text-white border-slate-700' },
];

export default function TeacherAttendance() {
    const { affectations } = useTeacher();
    const [params] = useSearchParams();

    const [classeId, setClasseId]   = useState(params.get('classe_id') ?? '');
    const [matiereId, setMatiereId] = useState(params.get('matiere_id') ?? '');
    const [date, setDate]           = useState(new Date().toISOString().split('T')[0]);
    const [hDebut, setHDebut]       = useState('07:30');
    const [hFin, setHFin]           = useState('09:00');

    const [rows, setRows]       = useState<Row[]>([]);
    const [marks, setMarks]     = useState<Record<string, Statut>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving]   = useState(false);
    const [msg, setMsg]         = useState('');
    const [err, setErr]         = useState('');

    const classes  = Array.from(new Map(affectations.map(a => [a.classe.id, a.classe])).values());
    const matieres = affectations.filter(a => a.classe.id === classeId).map(a => a.matiere);

    useEffect(() => {
        if (classeId && matiereId && !matieres.some(m => m.id === matiereId)) setMatiereId('');
    }, [classeId]); // eslint-disable-line

    const loadStudents = useCallback(async () => {
        if (!classeId) { setRows([]); return; }
        setLoading(true); setErr(''); setMsg('');
        try {
            const res = await api.get(`/api/students/class/${classeId}`);
            const list: Row[] = res.data ?? [];
            setRows(list);

            // Pré-remplir tous présents, puis surcharger avec la séance existante si elle existe
            const init: Record<string, Statut> = {};
            list.forEach(r => { init[r.eleve_id] = 'present'; });
            if (matiereId && date && hDebut) {
                try {
                    const ex = await api.get('/api/attendance/session', {
                        params: { classe_id: classeId, matiere_id: matiereId, date_seance: date, heure_debut: hDebut },
                    });
                    for (const p of (ex.data ?? [])) init[p.eleve_id] = p.statut;
                } catch { /* pas de séance existante */ }
            }
            setMarks(init);
        } catch {
            setErr('Erreur lors du chargement des élèves.');
        } finally { setLoading(false); }
    }, [classeId, matiereId, date, hDebut]);

    useEffect(() => { loadStudents(); }, [loadStudents]);

    const setAll = (s: Statut) => setMarks(Object.fromEntries(rows.map(r => [r.eleve_id, s])));
    const count  = (s: Statut) => rows.filter(r => marks[r.eleve_id] === s).length;

    const save = async () => {
        if (!classeId || !matiereId) { setErr('Sélectionnez une classe et une matière.'); return; }
        setSaving(true); setErr(''); setMsg('');
        try {
            const entries = rows.map(r => ({ eleve_id: r.eleve_id, statut: marks[r.eleve_id] ?? 'present' }));
            const res = await api.post('/api/attendance/session', {
                classe_id: classeId, matiere_id: matiereId, date_seance: date,
                heure_debut: hDebut, heure_fin: hFin, entries,
            });
            setMsg(res.data?.message ?? 'Séance enregistrée.');
        } catch (e: any) {
            setErr(e?.response?.data?.error ?? 'Erreur lors de l\'enregistrement.');
        } finally { setSaving(false); }
    };

    return (
        <div className="max-w-4xl space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900">Faire l'appel</h1>
                    <p className="text-sm text-slate-400">Marquez la présence de vos élèves pour une séance.</p>
                </div>
            </div>

            {/* Sélecteurs */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <Sel label="Classe" value={classeId} onChange={setClasseId} ph="-- Classe --">
                    {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </Sel>
                <Sel label="Matière" value={matiereId} onChange={setMatiereId} ph="-- Matière --" disabled={!classeId}>
                    {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </Sel>
                <Inp label="Date" type="date" value={date} onChange={setDate} />
                <Inp label="Début" type="time" value={hDebut} onChange={setHDebut} />
                <Inp label="Fin" type="time" value={hFin} onChange={setHFin} />
            </div>

            {msg && <Banner ok text={msg} />}
            {err && <Banner text={err} />}

            {/* Liste élèves */}
            {!classeId || !matiereId ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-14 text-center text-sm text-slate-400">
                    Sélectionnez une classe et une matière pour faire l'appel.
                </div>
            ) : loading ? (
                <div className="flex justify-center py-14"><Loader2 className="w-7 h-7 animate-spin text-emerald-600" /></div>
            ) : rows.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-14 text-center text-sm text-slate-400">
                    Aucun élève inscrit dans cette classe.
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Barre d'actions */}
                    <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b border-slate-50 bg-slate-50/40">
                        <span className="text-xs font-bold text-slate-500">{rows.length} élève(s)</span>
                        <span className="text-xs text-emerald-600 font-semibold">{count('present')} présents</span>
                        <span className="text-xs text-red-500 font-semibold">{count('absent')} absents</span>
                        <span className="text-xs text-amber-500 font-semibold">{count('retard')} retards</span>
                        <div className="ml-auto flex gap-2">
                            <button onClick={() => setAll('present')} className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-all">Tous présents</button>
                            <button onClick={() => setAll('absent')} className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all">Tous absents</button>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-50">
                        {rows.map((r, i) => (
                            <motion.div key={r.inscription_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                                className="flex items-center gap-3 px-5 py-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{r.eleve.nom} {r.eleve.prenom}</p>
                                    <p className="text-[11px] font-mono text-slate-400">{r.eleve.matricule}</p>
                                </div>
                                <div className="flex gap-1">
                                    {STATUTS.map(st => {
                                        const active = marks[r.eleve_id] === st.value;
                                        return (
                                            <button key={st.value} onClick={() => setMarks(m => ({ ...m, [r.eleve_id]: st.value }))}
                                                title={st.label}
                                                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                                                    active ? st.active : 'border-slate-200 text-slate-300 hover:text-slate-500 hover:border-slate-300'
                                                }`}>
                                                <st.icon className="w-3.5 h-3.5" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="px-5 py-4 border-t border-slate-50 flex justify-end">
                        <button onClick={save} disabled={saving}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-60 transition-all">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer l'appel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Banner({ text, ok }: { text: string; ok?: boolean }) {
    return (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-100'}`}>
            {ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />} {text}
        </div>
    );
}
function Sel({ label, value, onChange, children, ph, disabled }: any) {
    return (
        <div>
            <label className="text-[11px] font-bold uppercase text-slate-400">{label}</label>
            <div className="relative mt-1">
                <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
                    className="w-full appearance-none bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 pr-8 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 disabled:opacity-50">
                    <option value="">{ph}</option>{children}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
        </div>
    );
}
function Inp({ label, type, value, onChange }: any) {
    return (
        <div>
            <label className="text-[11px] font-bold uppercase text-slate-400">{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)}
                className="w-full mt-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500" />
        </div>
    );
}
