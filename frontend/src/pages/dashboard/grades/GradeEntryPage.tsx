import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2,
    GraduationCap, ChevronRight
} from 'lucide-react';
import api from '../../../lib/api';
import { useI18n } from '../../../i18n/i18n';

interface EvalType { id: string; libelle: string; ponderation: number; }
interface EleveRow {
    inscription_id: string;
    eleve: { nom: string; prenom: string; matricule: string };
    grades: Record<string, { id: string; valeur: number } | null>;
    moyenne: number | null;
}
interface GradeSheet {
    periode: { id: string; libelle: string };
    matiere: { id: string; nom: string; code: string; coefficient: number };
    eval_types: EvalType[];
    rows: EleveRow[];
}

// Calcul en temps réel côté client
const calcAvg = (grades: Record<string, { valeur: number } | null>, draft: Record<string, string>, evalTypes: EvalType[]): number | null => {
    let totalW = 0;
    let totalC = 0;
    let hasAny = false;
    for (const et of evalTypes) {
        const raw = draft[et.id] ?? grades[et.id]?.valeur?.toString() ?? '';
        if (raw === '' || raw === null) continue;
        const val = parseFloat(raw);
        if (isNaN(val)) continue;
        hasAny = true;
        totalW += val * et.ponderation;
        totalC += et.ponderation;
    }
    return hasAny && totalC > 0 ? Math.round((totalW / totalC) * 100) / 100 : null;
};

const GradeEntryPage = () => {
    const { t } = useI18n();
    const [params] = useSearchParams();
    const navigate = useNavigate();

    const periode_id = params.get('periode_id') ?? '';
    const classe_id = params.get('classe_id') ?? '';
    const matiere_id = params.get('matiere_id') ?? '';

    const [sheet, setSheet] = useState<GradeSheet | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // draft[inscription_id][type_eval_id] = valeur string
    const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const fetchSheet = async () => {
        if (!periode_id || !classe_id || !matiere_id) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/api/grades/sheet', {
                params: { periode_id, classe_id, matiere_id },
            });
            setSheet(res.data);

            // Pré-remplir le draft avec les notes existantes
            const d: Record<string, Record<string, string>> = {};
            for (const row of res.data.rows as EleveRow[]) {
                d[row.inscription_id] = {};
                for (const et of res.data.eval_types as EvalType[]) {
                    const existing = row.grades[et.id];
                    d[row.inscription_id][et.id] = existing != null ? String(existing.valeur) : '';
                }
            }
            setDraft(d);
        } catch (err: any) {
            setError(err.response?.data?.error ?? 'Erreur lors du chargement.');
        }
        setLoading(false);
    };

    useEffect(() => { fetchSheet(); }, [periode_id, classe_id, matiere_id]);

    const handleChange = useCallback((inscription_id: string, type_eval_id: string, value: string) => {
        // Valider : vide ou 0-20
        if (value !== '' && (isNaN(parseFloat(value)) || parseFloat(value) < 0 || parseFloat(value) > 20)) return;
        setDraft(d => ({
            ...d,
            [inscription_id]: { ...d[inscription_id], [type_eval_id]: value },
        }));
    }, []);

    // Navigation clavier : Tab vers la prochaine cellule
    const handleKeyDown = (e: React.KeyboardEvent, inscId: string, etId: string) => {
        if (e.key !== 'Enter' && e.key !== 'Tab') return;
        if (e.key === 'Enter') e.preventDefault();

        if (!sheet) return;
        const types = sheet.eval_types;
        const rows = sheet.rows;
        const curTypeIdx = types.findIndex(t => t.id === etId);
        const curRowIdx = rows.findIndex(r => r.inscription_id === inscId);

        let nextTypeIdx = curTypeIdx + 1;
        let nextRowIdx = curRowIdx;

        if (nextTypeIdx >= types.length) {
            nextTypeIdx = 0;
            nextRowIdx = curRowIdx + 1;
        }

        if (nextRowIdx >= rows.length) return;

        const key = `${rows[nextRowIdx].inscription_id}__${types[nextTypeIdx].id}`;
        inputRefs.current[key]?.focus();
    };

    const handleSave = async () => {
        if (!sheet) return;
        setSaving(true);
        setError('');
        setSuccess('');

        const grades: any[] = [];
        for (const row of sheet.rows) {
            for (const et of sheet.eval_types) {
                const val = draft[row.inscription_id]?.[et.id];
                if (val === '' || val === undefined) continue;
                grades.push({
                    inscription_id: row.inscription_id,
                    matiere_id,
                    periode_id,
                    type_eval_id: et.id,
                    valeur: parseFloat(val),
                });
            }
        }

        if (grades.length === 0) {
            setError('Aucune note à enregistrer.');
            setSaving(false);
            return;
        }

        try {
            const res = await api.post('/api/grades/bulk', { grades });
            setSuccess(res.data.message);
            await fetchSheet();
        } catch (err: any) {
            setError(err.response?.data?.error ?? t('Erreur lors de la sauvegarde.'));
        }
        setSaving(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64 gap-3">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-400">{t('Chargement de la feuille de notes…')}</span>
        </div>
    );

    if (error && !sheet) return (
        <div className="p-6 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
        </div>
    );

    if (!sheet) return null;

    const hasUnsaved = Object.values(draft).some(d => Object.values(d).some(v => v !== ''));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-3"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> {t('Retour')}
                    </button>
                    <h2 className="text-lg font-bold text-slate-900">{t('Saisie des notes')}</h2>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                        <span className="font-semibold text-slate-700">{sheet.matiere.nom}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>{sheet.periode.libelle}</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold">
                            {t('coeff')} {sheet.matiere.coefficient}
                        </span>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-70 shrink-0"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {t('Enregistrer')}
                </button>
            </div>

            {/* Feedback */}
            {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}
            {success && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
                </div>
            )}

            {/* Types d'évaluation info */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold">{t('Types :')}</span>
                {sheet.eval_types.map((et, i) => (
                    <span key={et.id} className="inline-flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-slate-100 rounded font-semibold text-slate-700">{et.libelle}</span>
                        <span className="text-slate-400">×{et.ponderation}</span>
                        {i < sheet.eval_types.length - 1 && <span className="text-slate-300">+</span>}
                    </span>
                ))}
                <span className="text-slate-300 mx-1">→</span>
                <span className="text-slate-600">{t('Moyenne pondérée')}</span>
            </div>

            {/* Grille */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {sheet.rows.length === 0 ? (
                    <div className="py-20 text-center">
                        <GraduationCap className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">{t('Aucun élève inscrit dans cette classe.')}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/80">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-8">#</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Élève')}</th>
                                    {sheet.eval_types.map(et => (
                                        <th key={et.id} className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[100px]">
                                            {et.libelle}
                                            <span className="block text-[9px] font-normal text-slate-400 normal-case">×{et.ponderation}</span>
                                        </th>
                                    ))}
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Moy.')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sheet.rows.map((row, rowIdx) => {
                                    const avg = calcAvg(row.grades, draft[row.inscription_id] ?? {}, sheet.eval_types);
                                    return (
                                        <motion.tr
                                            key={row.inscription_id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: rowIdx * 0.02 }}
                                            className="hover:bg-slate-50/50 transition-colors"
                                        >
                                            <td className="px-4 py-2 text-xs text-slate-400 font-mono">{rowIdx + 1}</td>
                                            <td className="px-4 py-2.5">
                                                <p className="font-semibold text-slate-900 text-sm">{row.eleve.nom} {row.eleve.prenom}</p>
                                                <p className="text-[10px] text-slate-400 font-mono">{row.eleve.matricule}</p>
                                            </td>
                                            {sheet.eval_types.map(et => {
                                                const key = `${row.inscription_id}__${et.id}`;
                                                const val = draft[row.inscription_id]?.[et.id] ?? '';
                                                const numVal = parseFloat(val);
                                                const isLow = !isNaN(numVal) && numVal < 10;
                                                return (
                                                    <td key={et.id} className="px-3 py-2 text-center">
                                                        <input
                                                            ref={el => { inputRefs.current[key] = el; }}
                                                            type="number"
                                                            min="0"
                                                            max="20"
                                                            step="0.25"
                                                            value={val}
                                                            onChange={e => handleChange(row.inscription_id, et.id, e.target.value)}
                                                            onKeyDown={e => handleKeyDown(e, row.inscription_id, et.id)}
                                                            placeholder="—"
                                                            className={`
                                                                w-20 text-center px-2 py-1.5 text-sm font-semibold rounded-lg border outline-none transition-all
                                                                ${isLow
                                                                    ? 'border-red-200 bg-red-50 text-red-700 focus:border-red-400 focus:ring-2 focus:ring-red-400/10'
                                                                    : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10'
                                                                }
                                                                [&::-webkit-inner-spin-button]:appearance-none [appearance:textfield]
                                                            `}
                                                        />
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-2 text-center">
                                                {avg !== null ? (
                                                    <span className={`text-sm font-bold ${avg >= 10 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {avg.toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">—</span>
                                                )}
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Stats rapides */}
            {sheet.rows.length > 0 && (
                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    <span><span className="font-semibold text-slate-700">{sheet.rows.length}</span> élèves</span>
                    <span><span className="font-semibold text-slate-700">{sheet.eval_types.length}</span> types d'évaluation</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400 text-xs">Tab / Entrée pour naviguer · Notes entre 0 et 20 · Rouge si &lt; 10</span>
                </div>
            )}
        </div>
    );
};

export default GradeEntryPage;
