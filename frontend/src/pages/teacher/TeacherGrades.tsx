import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, ChevronDown, ArrowRight, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { useTeacher } from './TeacherLayout';

interface Sequence { id: string; nom: string; ordre: number; }

export default function TeacherGrades() {
    const { annee, affectations } = useTeacher();
    const navigate = useNavigate();
    const [params] = useSearchParams();

    const [classeId, setClasseId]   = useState(params.get('classe_id') ?? '');
    const [matiereId, setMatiereId] = useState(params.get('matiere_id') ?? '');
    const [seqId, setSeqId]         = useState('');
    const [sequences, setSequences] = useState<Sequence[]>([]);

    useEffect(() => {
        if (!annee) return;
        api.get(`/api/evaluations/sequences/year/${annee.id}`)
            .then(r => setSequences(r.data?.sequences ?? []))
            .catch(() => setSequences([]));
    }, [annee]);

    // Classes distinctes de l'enseignant
    const classes = Array.from(new Map(affectations.map(a => [a.classe.id, a.classe])).values());
    // Matières disponibles pour la classe choisie
    const matieres = affectations.filter(a => a.classe.id === classeId).map(a => a.matiere);

    // Si la matière sélectionnée n'appartient pas à la classe, on réinitialise
    useEffect(() => {
        if (classeId && matiereId && !matieres.some(m => m.id === matiereId)) setMatiereId('');
    }, [classeId]); // eslint-disable-line

    const ready = classeId && matiereId && seqId;
    const go = () => ready && navigate(`/prof/grades/entry?periode_id=${seqId}&classe_id=${classeId}&matiere_id=${matiereId}`);

    return (
        <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
                    <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900">Saisie des notes</h1>
                    <p className="text-sm text-slate-400">Choisissez la classe, la matière et la séquence.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                <Field label="Classe">
                    <Select value={classeId} onChange={setClasseId} placeholder="-- Choisir une classe --">
                        {classes.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>)}
                    </Select>
                </Field>

                <Field label="Matière">
                    <Select value={matiereId} onChange={setMatiereId} placeholder="-- Choisir une matière --" disabled={!classeId}>
                        {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                    </Select>
                </Field>

                <Field label="Séquence / Période">
                    <Select value={seqId} onChange={setSeqId} placeholder="-- Choisir une séquence --">
                        {sequences.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                    </Select>
                </Field>

                {!annee && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
                        <AlertCircle className="w-4 h-4" /> Aucune année scolaire active configurée.
                    </div>
                )}

                <button onClick={go} disabled={!ready}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50 disabled:shadow-none transition-all">
                    Ouvrir la feuille de notes <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400 ml-1">{label}</label>
            <div className="mt-1.5">{children}</div>
        </div>
    );
}

function Select({ value, onChange, children, placeholder, disabled }: {
    value: string; onChange: (v: string) => void; children: React.ReactNode; placeholder: string; disabled?: boolean;
}) {
    return (
        <div className="relative">
            <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
                className="w-full appearance-none bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 pr-10 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 disabled:opacity-50 transition-all">
                <option value="">{placeholder}</option>
                {children}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
    );
}
