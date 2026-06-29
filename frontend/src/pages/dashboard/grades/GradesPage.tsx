import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    BookOpen, Layers, ChevronRight, Settings, CheckCircle2,
    Loader2, AlertCircle, FileText, ClipboardList, CalendarRange,
} from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

interface Year     { id: string; libelle: string; est_active: boolean; }
interface Periode  { id: string; nom: string; ordre: number; type: string; }
interface Classe   { id: string; nom: string; niveau: string; }
interface Matiere  { id: string; nom: string; code: string; coefficient: number; }
interface EvalType { id: string; nom: string; code: string; ponderation: number; }

const SELECT = 'w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed';

const GradesPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [activeYear, setActiveYear] = useState<Year | null>(null);
    const [sequences, setSequences]   = useState<Periode[]>([]);
    const [trimestres, setTrimestres] = useState<Periode[]>([]);
    const [classes, setClasses]       = useState<Classe[]>([]);
    const [matieres, setMatieres]     = useState<Matiere[]>([]);
    const [evalTypes, setEvalTypes]   = useState<EvalType[]>([]);

    const [selClasse, setSelClasse]   = useState('');
    const [selPeriode, setSelPeriode] = useState('');
    const [selMatiere, setSelMatiere] = useState('');

    const [loading, setLoading]         = useState(true);
    const [setupLoading, setSetupLoading] = useState(false);
    const [setupMsg, setSetupMsg]       = useState('');
    const [setupError, setSetupError]   = useState('');

    // ── Init ──────────────────────────────────────────────────────────────────
    const loadPeriods = async (annee_id: string) => {
        try {
            const res = await api.get(`/api/evaluations/sequences/year/${annee_id}`);
            setSequences(res.data.sequences ?? []);
            setTrimestres(res.data.trimestres ?? []);
            setClasses(res.data.classes ?? []);
        } catch {
            setSequences([]); setTrimestres([]); setClasses([]);
        }
    };

    const init = async () => {
        setLoading(true);
        try {
            const yearsRes = await api.get(`/api/academic/years/${user?.tenant_id}`);
            const ay = yearsRes.data.find((y: Year) => y.est_active) ?? yearsRes.data[0] ?? null;
            setActiveYear(ay);
            if (ay) await loadPeriods(ay.id);
            const typesRes = await api.get('/api/evaluations/eval-types');
            setEvalTypes(typesRes.data ?? []);
        } catch { /* silencieux */ }
        setLoading(false);
    };
    useEffect(() => { init(); }, []);

    // Charger les matières quand une classe est choisie
    const handleClasseChange = async (classeId: string) => {
        setSelClasse(classeId);
        setSelMatiere('');
        setMatieres([]);
        if (!classeId) return;
        try {
            const res = await api.get(`/api/academic/subject-groups/${user?.tenant_id}`);
            const all: Matiere[] = [];
            for (const g of res.data) all.push(...g.matieres);
            setMatieres(all);
        } catch { setMatieres([]); }
    };

    // ── Setup automatique ───────────────────────────────────────────────────────
    const handleSetupAll = async () => {
        if (!activeYear) return;
        setSetupLoading(true); setSetupMsg(''); setSetupError('');
        try {
            await api.post('/api/evaluations/eval-types/setup');
            const res = await api.post('/api/evaluations/sequences/setup', { annee_id: activeYear.id });
            setSetupMsg(res.data.message);
            await loadPeriods(activeYear.id);
            const typesRes = await api.get('/api/evaluations/eval-types');
            setEvalTypes(typesRes.data ?? []);
        } catch (err: any) {
            setSetupError(err.response?.data?.error ?? 'Erreur lors de la configuration.');
        }
        setSetupLoading(false);
    };

    const isTrimestre = trimestres.some(t => t.id === selPeriode);
    const hasSetup    = evalTypes.length > 0 && sequences.length > 0;
    const canEntry    = selClasse && selPeriode && selMatiere && !isTrimestre;
    const canBulletin = selClasse && selPeriode;

    const goToEntry = () => canEntry &&
        navigate(`/ecole-dashboard/grades/entry?periode_id=${selPeriode}&classe_id=${selClasse}&matiere_id=${selMatiere}`);
    const goToBulletins = () => canBulletin &&
        navigate(`/ecole-dashboard/grades/bulletins?periode_id=${selPeriode}&classe_id=${selClasse}`);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h2 className="text-lg font-bold text-slate-900">Notes & Bulletins</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                    Saisie des notes par séquence · Bulletins séquentiels & trimestriels (MINESEC)
                </p>
            </div>

            {/* Setup */}
            {!hasSetup && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                            <Settings className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-amber-900 mb-1">Configuration requise</h3>
                            <p className="text-sm text-amber-700 leading-relaxed mb-4">
                                Initialisez les séquences et les types d'évaluation par défaut pour {activeYear?.libelle ?? 'cette année'}.
                            </p>
                            {setupError && <div className="flex items-center gap-2 text-sm text-red-600 mb-3"><AlertCircle className="w-4 h-4" /> {setupError}</div>}
                            {setupMsg && <div className="flex items-center gap-2 text-sm text-emerald-700 mb-3"><CheckCircle2 className="w-4 h-4" /> {setupMsg}</div>}
                            <button onClick={handleSetupAll} disabled={setupLoading || !activeYear}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition-all disabled:opacity-60">
                                {setupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                                Configurer les séquences
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Périodes (vue d'ensemble) */}
            {hasSetup && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    {sequences.map(s => (
                        <div key={s.id} className="p-3 rounded-xl border bg-white border-slate-200 text-center">
                            <p className="text-xs font-bold text-slate-900">{s.nom}</p>
                            <p className="text-[10px] text-slate-400 font-medium">T{Math.ceil(s.ordre / 2)}</p>
                        </div>
                    ))}
                    {trimestres.map(t => (
                        <div key={t.id} className="p-3 rounded-xl border bg-slate-900 border-slate-900 text-center">
                            <p className="text-xs font-bold text-white">{t.nom}</p>
                            <p className="text-[10px] text-slate-400 font-medium">Synthèse</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Sélecteur */}
            {hasSetup && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                    <h3 className="text-sm font-bold text-slate-900">Sélection</h3>

                    <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Layers className="w-3 h-3" /> Classe
                            </label>
                            <select className={SELECT} value={selClasse} onChange={e => handleClasseChange(e.target.value)}>
                                <option value="">— Choisir —</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <CalendarRange className="w-3 h-3" /> Période
                            </label>
                            <select className={SELECT} value={selPeriode} onChange={e => setSelPeriode(e.target.value)}>
                                <option value="">— Choisir —</option>
                                <optgroup label="Séquences">
                                    {sequences.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                                </optgroup>
                                {trimestres.length > 0 && (
                                    <optgroup label="Trimestres (bulletin de synthèse)">
                                        {trimestres.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
                                    </optgroup>
                                )}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <BookOpen className="w-3 h-3" /> Matière
                            </label>
                            <select className={SELECT} value={selMatiere} onChange={e => setSelMatiere(e.target.value)}
                                disabled={!selClasse || matieres.length === 0 || isTrimestre}>
                                <option value="">— Choisir —</option>
                                {matieres.map(m => <option key={m.id} value={m.id}>{m.nom} (coeff {m.coefficient})</option>)}
                            </select>
                        </div>
                    </div>

                    {isTrimestre && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                            Le bulletin trimestriel agrège automatiquement les notes des séquences du trimestre. La saisie se fait par séquence.
                        </div>
                    )}

                    {evalTypes.length > 0 && !isTrimestre && (
                        <div className="flex flex-wrap gap-2">
                            {evalTypes.map(et => (
                                <span key={et.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                                    {et.nom}
                                    <span className="px-1.5 py-0.5 bg-slate-200 rounded-md text-[10px]">×{et.ponderation}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
                        <button onClick={goToEntry} disabled={!canEntry}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                            <ClipboardList className="w-4 h-4" /> Saisir les notes <ChevronRight className="w-4 h-4" />
                        </button>
                        <button onClick={goToBulletins} disabled={!canBulletin}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                            <FileText className="w-4 h-4" /> Voir / générer les bulletins
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GradesPage;
