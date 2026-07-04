import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, FileText, Loader2, AlertCircle,
    CheckCircle2, ChevronRight, TrendingUp, Award, Users, Download, Table2,
} from 'lucide-react';
import api from '../../../lib/api';
import BulletinPDF from './BulletinPDF';
import { downloadGradeSheet } from '../../../lib/classPdf';
import {
    downloadBulletinDetailed, downloadClassDetailed,
    type DetailStudent, type BulletinContext, type SchoolFull,
} from '../../../lib/bulletinTemplates';
import { useI18n } from '../../../i18n/i18n';

interface DetailedResponse {
    periode: { nom: string; ordre: number; type: string; term_label: string };
    classe: { nom: string; niveau: string };
    effectif: number;
    sequences: { id: string; nom: string; label: string }[];
    class_av: number | null;
    is_last_term?: boolean;
    annual_class_av?: number | null;
    students: DetailStudent[];
}

interface BulletinDetail {
    id:                  string;
    matiere:             { nom: string; code: string; coefficient: number };
    moyenne_matiere:     number;
    appreciation_matiere: string;
}

interface Bulletin {
    id:                    string;
    moyenne_generale:      number;
    rang:                  number | null;
    effectif_classe:       number | null;
    appreciation_generale: string;
    eleve: {
        nom: string; prenom: string; matricule: string;
        sexe: string; date_naissance: string;
    };
    classe:  { nom: string; niveau: string };
    details: BulletinDetail[];
    periode: { nom: string; ordre: number; annee: { libelle: string } };
}

const BulletinsPage = () => {
    const { t } = useI18n();
    const [params]  = useSearchParams();
    const navigate  = useNavigate();

    const periode_id = params.get('periode_id') ?? '';
    const classe_id  = params.get('classe_id')  ?? '';

    const [school, setSchool] = useState<SchoolFull>({ nom: 'Mon Établissement' });
    const [detailed, setDetailed] = useState<DetailedResponse | null>(null);
    const [bulletins,  setBulletins]  = useState<Bulletin[]>([]);
    const [loading,    setLoading]    = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error,      setError]      = useState('');
    const [genMsg,     setGenMsg]     = useState('');
    const [selected,   setSelected]   = useState<Bulletin | null>(null);
    const [dlClass,    setDlClass]    = useState(false);
    const [dlSheet,    setDlSheet]    = useState(false);
    const fetchBulletins = async () => {
        if (!periode_id || !classe_id) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/api/bulletins/class', {
                params: { periode_id, classe_id },
            });
            setBulletins(res.data);
        } catch {
            setBulletins([]);
        }
        setLoading(false);
    };

    const fetchDetailed = async () => {
        if (!periode_id || !classe_id) return;
        try {
            const res = await api.get('/api/bulletins/class-detailed', { params: { periode_id, classe_id } });
            setDetailed(res.data);
        } catch { setDetailed(null); }
    };

    useEffect(() => { fetchBulletins(); fetchDetailed(); }, [periode_id, classe_id]);

    useEffect(() => {
        api.get('/api/settings/school')
            .then(r => {
                const e = r.data.ecole ?? {};
                setSchool({
                    nom: e.nom ?? 'Mon Établissement',
                    logo_url: e.logo_url ?? null,
                    ville: e.ville ?? null,
                    telephone: e.telephone ?? null,
                    email: e.email ?? null,
                    boite_postale: e.boite_postale ?? null,
                    devise: e.devise ?? null,
                    numero_contribuable: e.numero_contribuable ?? null,
                    registre_commerce: e.registre_commerce ?? null,
                    adresse: e.adresse ?? null,
                    region: e.region ?? null,
                });
            })
            .catch(() => {});
    }, []);

    const buildCtx = (): BulletinContext | null => {
        if (!detailed) return null;
        return {
            school,
            periode: detailed.periode,
            classe: detailed.classe,
            effectif: detailed.effectif,
            sequences: detailed.sequences,
            class_av: detailed.class_av,
            anneeLabel: anneeLabel,
            is_last_term: detailed.is_last_term,
            annual_class_av: detailed.annual_class_av,
        };
    };

    const handleGenerate = async () => {
        setGenerating(true);
        setGenMsg('');
        setError('');
        try {
            const res = await api.post('/api/bulletins/generate', { periode_id, classe_id });
            setGenMsg(res.data.message);
            await Promise.all([fetchBulletins(), fetchDetailed()]);
        } catch (err: any) {
            setError(err.response?.data?.error ?? 'Erreur lors de la génération.');
        }
        setGenerating(false);
    };

    const moy       = (n: number) => n?.toFixed(2) ?? '—';
    const appColor  = (avg: number) => avg >= 14 ? 'text-emerald-600' : avg >= 10 ? 'text-blue-600' : 'text-red-500';

    if (loading) return (
        <div className="flex items-center justify-center h-64 gap-3">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-400">{t('Chargement des bulletins…')}</span>
        </div>
    );

    const periodLabel  = bulletins[0]?.periode?.nom      ?? 'Séquence';
    const classeLabel  = bulletins[0]?.classe?.nom        ?? '';
    const anneeLabel   = bulletins[0]?.periode?.annee?.libelle ?? '';

    const stats = bulletins.length > 0 ? {
        max:   Math.max(...bulletins.map(b => b.moyenne_generale)),
        min:   Math.min(...bulletins.map(b => b.moyenne_generale)),
        moy:   bulletins.reduce((a, b) => a + b.moyenne_generale, 0) / bulletins.length,
        admis: bulletins.filter(b => b.moyenne_generale >= 10).length,
    } : null;

    const clsStats = { moy: stats?.moy ?? null, max: stats?.max ?? null, min: stats?.min ?? null };

    const handleDownloadClass = async () => {
        const ctx = buildCtx();
        if (!ctx || !detailed?.students.length) { setError('Données du bulletin indisponibles. Générez les bulletins puis réessayez.'); return; }
        setDlClass(true);
        try {
            await downloadClassDetailed(detailed.students, ctx);
        } catch (e) {
            console.error(e); setError('Erreur lors de la génération du PDF de la classe.');
        } finally { setDlClass(false); }
    };

    const handleDownloadOne = async (matricule: string) => {
        const ctx = buildCtx();
        const st = detailed?.students.find(s => s.eleve.matricule === matricule);
        if (!ctx || !st) { setError('Données du bulletin indisponibles.'); return; }
        try { await downloadBulletinDetailed(st, ctx); }
        catch (e) { console.error(e); setError('Erreur lors de la génération du PDF.'); }
    };

    const handleDownloadSheet = async () => {
        if (!bulletins.length) return;
        setDlSheet(true);
        try {
            await downloadGradeSheet(bulletins as any, school, classeLabel, periodLabel, anneeLabel);
        } catch (e) {
            console.error(e); setError('Erreur lors de la génération du bordereau.');
        } finally { setDlSheet(false); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <button onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-3">
                        <ArrowLeft className="w-3.5 h-3.5" /> {t('Retour')}
                    </button>
                    <h2 className="text-lg font-bold text-slate-900">{t('Bulletins')}</h2>
                    {classeLabel && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                            <span className="font-semibold text-slate-700">{classeLabel}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                            <span>{periodLabel}</span>
                            {anneeLabel && <span className="text-slate-400">· {anneeLabel}</span>}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {bulletins.length > 0 && (
                        <button onClick={handleDownloadSheet} disabled={dlSheet}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-sm disabled:opacity-70">
                            {dlSheet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Table2 className="w-4 h-4" />}
                            {t('Bordereau de notes')}
                        </button>
                    )}
                    {bulletins.length > 0 && (
                        <button onClick={handleDownloadClass} disabled={dlClass}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-sm disabled:opacity-70">
                            {dlClass ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {t('Toute la classe')} ({bulletins.length})
                        </button>
                    )}
                    <button onClick={handleGenerate} disabled={generating}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-70">
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        {bulletins.length > 0 ? t('Re-générer') : t('Générer les bulletins')}
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}
            {genMsg && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> {genMsg}
                </div>
            )}

            {bulletins.length === 0 ? (
                <div className="py-24 text-center bg-white rounded-xl border border-dashed border-slate-200">
                    <FileText className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">{t('Aucun bulletin généré pour le moment.')}</p>
                    <p className="text-xs text-slate-300 mt-1">{t('Saisissez d\'abord les notes, puis cliquez sur « Générer les bulletins ».')}</p>
                </div>
            ) : (
                <div className="grid lg:grid-cols-[1fr_1.6fr] gap-6 items-start">

                    {/* Classement */}
                    <div className="space-y-4">
                        {stats && (
                            <div className="grid grid-cols-2 gap-3">
                                <StatCard icon={<Users className="w-4 h-4 text-slate-400" />} value={bulletins.length} label={t('Élèves')} />
                                <StatCard icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} value={moy(stats.moy)} label={t('Moy. classe')} color="text-emerald-600" />
                                <StatCard icon={<Award className="w-4 h-4 text-amber-500" />} value={moy(stats.max)} label={t('Meilleure note')} color="text-amber-600" />
                                <StatCard icon={null} value={`${Math.round((stats.admis / bulletins.length) * 100)}%`} label={t('Taux réussite')} color="text-emerald-600" />
                            </div>
                        )}

                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Classement')}</p>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {bulletins.map((b, i) => (
                                    <motion.button key={b.id}
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                                        onClick={() => setSelected(b)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-all ${selected?.id === b.id ? 'bg-emerald-50/50' : ''}`}>
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${b.rang === 1 ? 'bg-amber-100 text-amber-700' : b.rang === 2 ? 'bg-slate-100 text-slate-600' : b.rang === 3 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                                            {b.rang}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 truncate">{b.eleve.nom} {b.eleve.prenom}</p>
                                            <p className="text-xs text-slate-400">{b.eleve.matricule}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className={`text-sm font-bold ${appColor(b.moyenne_generale)}`}>{moy(b.moyenne_generale)}</span>
                                            <p className="text-[10px] text-slate-400">/20</p>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Détail bulletin */}
                    <AnimatePresence mode="wait">
                        {selected ? (
                            <motion.div key={selected.id}
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                                className="sticky top-6 overflow-auto max-h-[80vh] pb-4">
                                <BulletinPDF bulletin={selected} school={school} stats={clsStats}
                                    onDownload={() => handleDownloadOne(selected.eleve.matricule)} />
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="flex items-center justify-center h-64 bg-white rounded-xl border border-dashed border-slate-200">
                                <p className="text-sm text-slate-400">{t('Sélectionnez un élève pour voir son bulletin')}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

// ── StatCard ──────────────────────────────────────────────────────────────────

const StatCard = ({ icon, value, label, color = 'text-slate-900' }: {
    icon: React.ReactNode; value: string | number; label: string; color?: string;
}) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
        {icon && <div className="flex justify-center mb-1.5">{icon}</div>}
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
    </div>
);

export default BulletinsPage;
