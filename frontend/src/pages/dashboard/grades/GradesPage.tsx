import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    BookOpen, Layers, ChevronRight, Settings, CheckCircle2,
    Loader2, AlertCircle, FileText, ClipboardList, CalendarRange,
} from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n/i18n';

interface Year     { id: string; libelle: string; est_active: boolean; }
interface Periode  { id: string; nom: string; ordre: number; type: string; }
interface Classe   { id: string; nom: string; niveau: string; }
interface Matiere  { id: string; nom: string; code: string; coefficient: number; }
interface EvalType { id: string; nom: string; code: string; ponderation: number; }

const SELECT = 'w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed';

const GradesPage = () => {
    const { user } = useAuth();
    const { t } = useI18n();
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
        <div className="space-y-7 max-w-4xl">
            {/* Bannière de section — émeraude raffiné */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 p-6 shadow-lg shadow-emerald-900/20">
                <div className="absolute -right-8 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-amber-300 to-amber-500" />
                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 backdrop-blur flex items-center justify-center shrink-0">
                        <ClipboardList className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold text-white tracking-tight">{t('Notes & Bulletins')}</h2>
                        <p className="text-emerald-50/80 text-sm mt-0.5">
                            {t('Saisie des notes par séquence · Bulletins séquentiels & trimestriels')}
                        </p>
                    </div>
                    {activeYear && (
                        <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-amber-300 px-3 py-1.5 rounded-full shadow">
                            <CalendarRange className="w-3.5 h-3.5" /> {activeYear.libelle}
                        </span>
                    )}
                </div>
            </motion.div>

            {/* Setup */}
            {!hasSetup && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                            <Settings className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-amber-900 mb-1">{t('Configuration requise')}</h3>
                            <p className="text-sm text-amber-700 leading-relaxed mb-4">
                                {t('Initialisez les séquences et les types d\'évaluation par défaut pour')} {activeYear?.libelle ?? t('cette année')}.
                            </p>
                            {setupError && <div className="flex items-center gap-2 text-sm text-red-600 mb-3"><AlertCircle className="w-4 h-4" /> {setupError}</div>}
                            {setupMsg && <div className="flex items-center gap-2 text-sm text-emerald-700 mb-3"><CheckCircle2 className="w-4 h-4" /> {setupMsg}</div>}
                            <button onClick={handleSetupAll} disabled={setupLoading || !activeYear}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition-all disabled:opacity-60">
                                {setupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                                {t('Configurer les séquences')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Périodes (vue d'ensemble) */}
            {hasSetup && (
                <motion.div initial="hidden" animate="show"
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                    className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    {sequences.map(s => (
                        <motion.div key={s.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                            whileHover={{ y: -3 }}
                            className="p-3 rounded-xl border bg-white border-slate-200 text-center hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-600/5 transition-colors">
                            <p className="text-xs font-bold text-slate-900">{s.nom}</p>
                            <p className="text-[10px] text-emerald-600 font-bold">T{Math.ceil(s.ordre / 2)}</p>
                        </motion.div>
                    ))}
                    {trimestres.map(tr => (
                        <motion.div key={tr.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                            whileHover={{ y: -3 }}
                            className="p-3 rounded-xl border border-emerald-800 text-center bg-gradient-to-br from-emerald-700 to-emerald-900 shadow-sm">
                            <p className="text-xs font-bold text-white">{tr.nom}</p>
                            <p className="text-[10px] text-amber-300 font-bold">{t('Synthèse')}</p>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Sélecteur */}
            {hasSetup && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                    <h3 className="text-sm font-bold text-slate-900">{t('Sélection')}</h3>

                    <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Layers className="w-3 h-3" /> {t('Classe')}
                            </label>
                            <select className={SELECT} value={selClasse} onChange={e => handleClasseChange(e.target.value)}>
                                <option value="">{t('— Choisir —')}</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <CalendarRange className="w-3 h-3" /> {t('Période')}
                            </label>
                            <select className={SELECT} value={selPeriode} onChange={e => setSelPeriode(e.target.value)}>
                                <option value="">{t('— Choisir —')}</option>
                                <optgroup label={t('Séquences')}>
                                    {sequences.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                                </optgroup>
                                {trimestres.length > 0 && (
                                    <optgroup label={t('Trimestres (bulletin de synthèse)')}>
                                        {trimestres.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
                                    </optgroup>
                                )}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <BookOpen className="w-3 h-3" /> {t('Matière')}
                            </label>
                            <select className={SELECT} value={selMatiere} onChange={e => setSelMatiere(e.target.value)}
                                disabled={!selClasse || matieres.length === 0 || isTrimestre}>
                                <option value="">{t('— Choisir —')}</option>
                                {matieres.map(m => <option key={m.id} value={m.id}>{m.nom} ({t('coeff')} {m.coefficient})</option>)}
                            </select>
                        </div>
                    </div>

                    {isTrimestre && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                            {t('Le bulletin trimestriel agrège automatiquement les notes des séquences du trimestre. La saisie se fait par séquence.')}
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
                            <ClipboardList className="w-4 h-4" /> {t('Saisir les notes')} <ChevronRight className="w-4 h-4" />
                        </button>
                        <button onClick={goToBulletins} disabled={!canBulletin}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-800 to-emerald-950 text-white text-sm font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                            <FileText className="w-4 h-4" /> {t('Voir / générer les bulletins')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GradesPage;
