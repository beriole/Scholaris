import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard, TrendingUp, AlertCircle, CheckCircle2,
    Plus, Trash2, Loader2, X, Search, Users,
    Clock, Banknote,
} from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n/i18n';
import ReceiptPDF, { type RecuData } from './ReceiptPDF';

// ── Types ────────────────────────────────────────────────────────────────────

interface Year     { id: string; libelle: string; est_active: boolean; }
interface Class    { id: string; nom: string; niveau: string; }
interface Tranche  { id: string; nom: string; montant_xaf: number; date_echeance: string; ordre: number; classe_id: string | null; est_obligatoire: boolean; }

interface EleveRow {
    inscription_id: string;
    eleve: { nom: string; prenom: string; matricule: string };
    total_du: number;
    total_paye: number;
    solde: number;
    statut_paiement: 'solde' | 'partiel' | 'impaye';
    dernier_paiement: { montant: number; mode: string; date: string; statut: string; reference?: string } | null;
    paiements: any[];
    tranches: Tranche[];
}

type Tab = 'overview' | 'payments' | 'tranches';

const MODES = [
    { value: 'especes',      label: 'Espèces' },
    { value: 'virement',     label: 'Virement bancaire' },
    { value: 'cheque',       label: 'Chèque' },
    { value: 'mobile_money', label: 'Mobile Money' },
];

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' XAF';

// ── Page principale ──────────────────────────────────────────────────────────

const FinancePage = () => {
    const { user } = useAuth();
    const { t } = useI18n();
    const [tab, setTab] = useState<Tab>('overview');
    const [years, setYears] = useState<Year[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [activeYear, setActiveYear] = useState<Year | null>(null);
    const [selClasse, setSelClasse] = useState('');
    const [stats, setStats] = useState<any>(null);
    const [rows, setRows] = useState<EleveRow[]>([]);
    const [tranches, setTranches] = useState<Tranche[]>([]);
    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatut, setFilterStatut] = useState('');
    const [payTarget, setPayTarget] = useState<EleveRow | null>(null);
    const [trancheModal, setTrancheModal] = useState(false);

    // Init
    useEffect(() => {
        (async () => {
            try {
                const yr = await api.get(`/api/academic/years/${user?.tenant_id}`);
                setYears(yr.data);
                const ay = yr.data.find((y: Year) => y.est_active) ?? yr.data[0] ?? null;
                setActiveYear(ay);
                if (ay) await fetchYearData(ay);
            } catch { /* silencieux */ }
            setLoading(false);
        })();
    }, []);

    const fetchYearData = async (y: Year) => {
        const [statsRes, clsRes, trRes] = await Promise.all([
            api.get('/api/finance/stats', { params: { annee_id: y.id } }),
            api.get(`/api/academic/classes/${y.id}`),
            api.get('/api/finance/tranches', { params: { annee_id: y.id } }),
        ]);
        setStats(statsRes.data);
        setClasses(clsRes.data);
        setTranches(trRes.data);
    };

    const loadClasse = async (classeId: string, anneeId: string) => {
        if (!classeId || !anneeId) return;
        setTableLoading(true);
        try {
            const res = await api.get('/api/finance/class-status', {
                params: { classe_id: classeId, annee_id: anneeId },
            });
            setRows(res.data.rows);
        } catch { setRows([]); }
        setTableLoading(false);
    };

    const refreshAll = async () => {
        if (!activeYear) return;
        await fetchYearData(activeYear);
        if (selClasse) await loadClasse(selClasse, activeYear.id);
    };

    const displayed = rows.filter(r => {
        const q = search.toLowerCase();
        const matchSearch = !q || r.eleve.nom.toLowerCase().includes(q) || r.eleve.prenom.toLowerCase().includes(q) || r.eleve.matricule.toLowerCase().includes(q);
        const matchSt = !filterStatut || r.statut_paiement === filterStatut;
        return matchSearch && matchSt;
    });

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">{t('Finances')}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{t('Scolarités XAF · Enregistrement des paiements · Arriérés')}</p>
                </div>
                <select
                    className={SEL}
                    value={activeYear?.id ?? ''}
                    onChange={async e => {
                        const y = years.find(y => y.id === e.target.value) ?? null;
                        setActiveYear(y);
                        setSelClasse('');
                        setRows([]);
                        if (y) await fetchYearData(y);
                    }}
                >
                    {years.map(y => <option key={y.id} value={y.id}>{y.libelle}</option>)}
                </select>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {([
                    { key: 'overview',  label: 'Vue d\'ensemble' },
                    { key: 'payments',  label: 'Paiements' },
                    { key: 'tranches',  label: 'Tranches' },
                ] as { key: Tab; label: string }[]).map(tb => (
                    <button
                        key={tb.key}
                        onClick={() => setTab(tb.key)}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab === tb.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {t(tb.label)}
                    </button>
                ))}
            </div>

            {/* ── Vue d'ensemble ─────────────────────────────────────────── */}
            {tab === 'overview' && (
                <div className="space-y-6">
                    {stats ? (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard icon={<TrendingUp className="w-4 h-4" />}    label={t('Total collecté')}       value={fmt(stats.total_collecte)}   color="text-emerald-600 bg-emerald-50" />
                                <StatCard icon={<CreditCard className="w-4 h-4" />}    label={t('Total attendu')}        value={fmt(stats.total_attendu)}    color="text-blue-600 bg-blue-50" />
                                <StatCard icon={<CheckCircle2 className="w-4 h-4" />}  label={t('Taux recouvrement')}    value={`${stats.taux_recouvrement}%`} color="text-violet-600 bg-violet-50" />
                                <StatCard icon={<AlertCircle className="w-4 h-4" />}   label={t('Élèves en retard')}     value={String(stats.nb_eleves_impaye + stats.nb_eleves_partiel)} color="text-red-500 bg-red-50" />
                            </div>

                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-semibold text-slate-700">{t('Recouvrement global')}</p>
                                    <p className="text-sm font-bold text-emerald-600">{stats.taux_recouvrement}%</p>
                                </div>
                                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(stats.taux_recouvrement, 100)}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className="h-full bg-emerald-500 rounded-full"
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-slate-400 mt-2">
                                    <span>{stats.nb_eleves_solde} {t('soldés')}</span>
                                    <span>{stats.nb_eleves_partiel} {t('partiels')} · {stats.nb_eleves_impaye} {t('impayés')}</span>
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-3 gap-4">
                                {[
                                    { label: 'Soldés',   count: stats.nb_eleves_solde,   color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                                    { label: 'Partiels', count: stats.nb_eleves_partiel, color: 'bg-amber-50 border-amber-200 text-amber-700' },
                                    { label: 'Impayés',  count: stats.nb_eleves_impaye,  color: 'bg-red-50 border-red-200 text-red-600' },
                                ].map((s, i) => (
                                    <div key={i} className={`rounded-xl border p-5 ${s.color}`}>
                                        <p className="text-2xl font-bold mb-1">{s.count}</p>
                                        <p className="text-sm font-semibold">{t(s.label)}</p>
                                        <p className="text-xs opacity-70 mt-0.5">
                                            {stats.nb_eleves_total > 0 ? Math.round((s.count / stats.nb_eleves_total) * 100) : 0}% {t('des élèves')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-slate-400">{t('Aucune donnée financière pour cette année.')}</p>
                    )}
                </div>
            )}

            {/* ── Paiements ─────────────────────────────────────────────── */}
            {tab === 'payments' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                        <select
                            className={SEL}
                            value={selClasse}
                            onChange={e => {
                                setSelClasse(e.target.value);
                                if (e.target.value && activeYear) loadClasse(e.target.value, activeYear.id);
                                else setRows([]);
                            }}
                        >
                            <option value="">{t('— Choisir une classe —')}</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                        </select>

                        {rows.length > 0 && (
                            <>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Rechercher…')}
                                        className="pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-400 w-48" />
                                </div>
                                <select className={SEL} value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
                                    <option value="">{t('Tous')}</option>
                                    <option value="solde">{t('Soldés')}</option>
                                    <option value="partiel">{t('Partiels')}</option>
                                    <option value="impaye">{t('Impayés')}</option>
                                </select>
                            </>
                        )}
                    </div>

                    {!selClasse ? (
                        <div className="py-20 text-center bg-white rounded-xl border border-dashed border-slate-200">
                            <Users className="w-7 h-7 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-400">{t('Sélectionnez une classe pour voir les paiements.')}</p>
                        </div>
                    ) : tableLoading ? (
                        <div className="flex items-center justify-center gap-3 py-16">
                            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-slate-400">{t('Chargement…')}</span>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/60">
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Élève')}</th>
                                            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Total dû')}</th>
                                            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Payé')}</th>
                                            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Solde')}</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Statut')}</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Dernier paiement')}</th>
                                            <th className="px-4 py-3" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {displayed.length === 0 ? (
                                            <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">{t('Aucun résultat.')}</td></tr>
                                        ) : displayed.map((r, i) => (
                                            <motion.tr key={r.inscription_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-slate-50/50">
                                                <td className="px-5 py-3.5">
                                                    <p className="font-semibold text-slate-900">{r.eleve.nom} {r.eleve.prenom}</p>
                                                    <p className="text-xs text-slate-400 font-mono">{r.eleve.matricule}</p>
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-medium text-slate-700">{fmt(r.total_du)}</td>
                                                <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">{fmt(r.total_paye)}</td>
                                                <td className="px-4 py-3.5 text-right font-bold">
                                                    <span className={r.solde <= 0 ? 'text-emerald-600' : 'text-red-500'}>
                                                        {r.solde <= 0 ? '—' : fmt(r.solde)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5"><PayBadge status={r.statut_paiement} /></td>
                                                <td className="px-4 py-3.5">
                                                    {r.dernier_paiement ? (
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="text-sm font-semibold text-slate-700">{fmt(r.dernier_paiement.montant)}</p>
                                                                {r.dernier_paiement.statut === 'en_attente' && (
                                                                    <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded font-semibold">{t('En attente')}</span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-400">
                                                                {MODES.find(m => m.value === r.dernier_paiement!.mode)?.label ?? r.dernier_paiement.mode}
                                                                {' · '}
                                                                {new Date(r.dernier_paiement.date).toLocaleDateString('fr-FR')}
                                                            </p>
                                                        </div>
                                                    ) : <span className="text-slate-300 text-xs">—</span>}
                                                </td>
                                                <td className="px-4 py-3.5 text-right">
                                                    <button
                                                        onClick={() => setPayTarget(r)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all"
                                                    >
                                                        <Plus className="w-3 h-3" /> {t('Paiement')}
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tranches ──────────────────────────────────────────────── */}
            {tab === 'tranches' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">{tranches.length} {t('tranche(s) pour')} {activeYear?.libelle}</p>
                        <button
                            onClick={() => setTrancheModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> {t('Nouvelle tranche')}
                        </button>
                    </div>

                    {tranches.length === 0 ? (
                        <div className="py-16 text-center bg-white rounded-xl border border-dashed border-slate-200">
                            <CreditCard className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-400">{t('Aucune tranche définie.')}</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/60">
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Nom')}</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Montant')}</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Échéance')}</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Classe')}</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tranches.map(tr => (
                                        <tr key={tr.id} className="hover:bg-slate-50/50">
                                            <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{tr.ordre}</td>
                                            <td className="px-5 py-3.5">
                                                <p className="font-semibold text-slate-900">{tr.nom}</p>
                                                {tr.est_obligatoire && <span className="text-[10px] text-slate-400">{t('Obligatoire')}</span>}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-bold text-slate-900">{fmt(tr.montant_xaf)}</td>
                                            <td className="px-4 py-3.5 text-slate-600">{new Date(tr.date_echeance).toLocaleDateString('fr-FR')}</td>
                                            <td className="px-4 py-3.5">
                                                {tr.classe_id
                                                    ? <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-semibold">{classes.find(c => c.id === tr.classe_id)?.nom ?? '—'}</span>
                                                    : <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{t('Toutes')}</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm(t('Supprimer cette tranche ?'))) return;
                                                        await api.delete(`/api/finance/tranches/${tr.id}`);
                                                        refreshAll();
                                                    }}
                                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                                        <td colSpan={2} className="px-5 py-3 text-xs font-bold text-slate-600 uppercase">{t('Total scolarité')}</td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-900 text-base">{fmt(tranches.reduce((s, tr) => s + tr.montant_xaf, 0))}</td>
                                        <td colSpan={3} />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            <AnimatePresence>
                {payTarget && (
                    <RecordPaymentModal
                        target={payTarget}
                        tranches={payTarget.tranches}
                        onClose={() => setPayTarget(null)}
                        onSuccess={async () => { setPayTarget(null); await refreshAll(); }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {trancheModal && (
                    <NewTrancheModal
                        anneeId={activeYear?.id ?? ''}
                        classes={classes}
                        onClose={() => setTrancheModal(false)}
                        onSuccess={async () => { setTrancheModal(false); await refreshAll(); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Modal d'enregistrement de paiement (espèces / manuel) ────────────────────

const RecordPaymentModal = ({ target, tranches, onClose, onSuccess }: {
    target: EleveRow;
    tranches: Tranche[];
    onClose: () => void;
    onSuccess: () => void;
}) => {
    const { t } = useI18n();
    const [form, setForm] = useState({
        montant_xaf:      target.solde > 0 ? String(Math.round(target.solde)) : '',
        methode_paiement: 'especes',
        reference:        '',
        date_paiement:    new Date().toISOString().split('T')[0],
        notes_interne:    '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');
    const [recu, setRecu]     = useState<RecuData | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const res = await api.post('/api/finance/payments', {
                inscription_id:   target.inscription_id,
                montant_xaf:      form.montant_xaf,
                methode_paiement: form.methode_paiement,
                reference:        form.reference || undefined,
                date_paiement:    form.date_paiement,
                notes_interne:    form.notes_interne || undefined,
            });
            setRecu(res.data.recu as RecuData);
        } catch (err: any) {
            setError(err.response?.data?.error ?? t('Erreur lors de l\'enregistrement.'));
        }
        setSaving(false);
    };

    // ── Écran de succès : reçu téléchargeable ─────────────────────────────────
    if (recu) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-8">
                    <div className="p-6 text-center border-b border-slate-100">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-base font-bold text-emerald-700">{t('Paiement enregistré !')}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {fmt(recu.montant_xaf)} · {target.eleve.nom} {target.eleve.prenom}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-mono">{t('Reçu N°')} {recu.numero_recu}</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <ReceiptPDF recu={recu} />
                        <button onClick={onSuccess}
                            className="w-full py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                            {t('Terminé')}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">{t('Enregistrer un paiement')}</h3>
                            <p className="text-xs text-slate-500">{target.eleve.nom} {target.eleve.prenom}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                        <span className="text-slate-500 font-medium">{t('Solde restant')}</span>
                        <span className={`font-bold ${target.solde > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {target.solde > 0 ? fmt(target.solde) : t('Compte soldé')}
                        </span>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                        </div>
                    )}

                    <FField label={t('Montant (XAF)')} required>
                        <input required type="number" min="1" className={INPUT} placeholder="50000"
                            value={form.montant_xaf} onChange={e => setForm(f => ({ ...f, montant_xaf: e.target.value }))} />
                    </FField>

                    {/* Mode de paiement avec icônes */}
                    <FField label={t('Mode de paiement')} required>
                        <div className="grid grid-cols-2 gap-2">
                            {MODES.map(m => (
                                <button
                                    key={m.value} type="button"
                                    onClick={() => setForm(f => ({ ...f, methode_paiement: m.value }))}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                                        form.methode_paiement === m.value
                                            ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    <Banknote className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-xs">{t(m.label)}</span>
                                </button>
                            ))}
                        </div>
                    </FField>

                    <div className="grid grid-cols-2 gap-4">
                        <FField label={t('Date')}>
                            <input type="date" className={INPUT} value={form.date_paiement}
                                onChange={e => setForm(f => ({ ...f, date_paiement: e.target.value }))} />
                        </FField>
                        <FField label={t('Référence')}>
                            <input className={INPUT} placeholder="ex: VIR-XYZ / N° chèque" value={form.reference}
                                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
                        </FField>
                    </div>

                    {tranches.length > 0 && (
                        <FField label={t('Tranche concernée (info)')}>
                            <input className={INPUT} placeholder={tranches.map(t => t.nom).join(' / ')} disabled />
                        </FField>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                            {t('Annuler')}
                        </button>
                        <button type="submit" disabled={saving} className="flex-[2] py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center justify-center gap-2 disabled:opacity-70 transition-all">
                            {saving
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('Traitement…')}</>
                                : <><CheckCircle2 className="w-4 h-4" /> {t('Enregistrer le paiement')}</>
                            }
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// ── Modal nouvelle tranche ───────────────────────────────────────────────────

const NewTrancheModal = ({ anneeId, classes, onClose, onSuccess }: {
    anneeId: string; classes: Class[];
    onClose: () => void; onSuccess: () => void;
}) => {
    const { t } = useI18n();
    const [form, setForm] = useState({
        nom: '', montant_xaf: '', date_echeance: '', ordre: '1',
        classe_id: '', est_obligatoire: true,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await api.post('/api/finance/tranches', { ...form, annee_id: anneeId });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error ?? t('Erreur.'));
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">{t('Nouvelle tranche de scolarité')}</h3>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="flex items-center gap-2 text-sm text-red-600 px-3 py-2 bg-red-50 rounded-xl"><AlertCircle className="w-4 h-4" />{error}</div>}

                    <div className="grid grid-cols-2 gap-4">
                        <FField label={t('Nom de la tranche')} required>
                            <input required className={INPUT} placeholder="1st instalment" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
                        </FField>
                        <FField label={t('Ordre')}>
                            <input type="number" min="1" className={INPUT} value={form.ordre} onChange={e => setForm(f => ({ ...f, ordre: e.target.value }))} />
                        </FField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FField label={t('Montant (XAF)')} required>
                            <input required type="number" min="1" className={INPUT} placeholder="50000" value={form.montant_xaf} onChange={e => setForm(f => ({ ...f, montant_xaf: e.target.value }))} />
                        </FField>
                        <FField label={t("Date d'échéance")} required>
                            <input required type="date" className={INPUT} value={form.date_echeance} onChange={e => setForm(f => ({ ...f, date_echeance: e.target.value }))} />
                        </FField>
                    </div>

                    <FField label={t('Classe (vide = toutes)')}>
                        <select className={INPUT} value={form.classe_id} onChange={e => setForm(f => ({ ...f, classe_id: e.target.value }))}>
                            <option value="">{t('Toutes les classes')}</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                        </select>
                    </FField>

                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input type="checkbox" checked={form.est_obligatoire} onChange={e => setForm(f => ({ ...f, est_obligatoire: e.target.checked }))}
                            className="w-4 h-4 accent-emerald-600" />
                        <span className="text-sm font-medium text-slate-700">{t('Tranche obligatoire')}</span>
                    </label>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">{t('Annuler')}</button>
                        <button type="submit" disabled={saving} className="flex-[2] py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center justify-center gap-2 disabled:opacity-70 transition-all">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('Créer la tranche')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// ── Mini-composants ──────────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${color}`}>{icon}</div>
        <p className="text-xl font-bold text-slate-900 mb-0.5 leading-tight">{value}</p>
        <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
);

const PayBadge = ({ status }: { status: string }) => {
    const { t } = useI18n();
    const m: Record<string, string> = {
        solde:   'bg-emerald-50 text-emerald-700 border-emerald-200',
        partiel: 'bg-amber-50 text-amber-700 border-amber-200',
        impaye:  'bg-red-50 text-red-600 border-red-200',
    };
    const l: Record<string, string> = { solde: 'Soldé', partiel: 'Partiel', impaye: 'Impayé' };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${m[status] ?? m.impaye}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'solde' ? 'bg-emerald-500' : status === 'partiel' ? 'bg-amber-500' : 'bg-red-400'}`} />
            {t(l[status] ?? status)}
        </span>
    );
};

const FField = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-600">
            {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

const SEL   = 'appearance-none px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-400 font-medium text-slate-700 cursor-pointer';
const INPUT = 'w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all font-medium';

export default FinancePage;
