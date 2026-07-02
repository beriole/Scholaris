import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart2, Users, TrendingUp, Wallet, Loader2,
    ChevronDown, AlertCircle, Download, Award,
} from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n/i18n';

interface Year    { id: string; libelle: string; est_active: boolean; }
interface Period  { id: string; nom: string; ordre: number; }
interface AcaRow  {
    id: string; nom: string; niveau: string;
    stats: { effectif: number; moy_classe: number; max: number; min: number; admis: number; taux_reussite: number } | null;
}
interface AttRow  {
    id: string; nom: string; niveau: string;
    stats: { total_seances: number; absents: number; retards: number; exclu: number; taux_presence: number };
    top_absents: { eleve: { nom: string; prenom: string; matricule: string } | null; absences: number }[];
}
interface FinRow  {
    id: string; nom: string; niveau: string;
    effectif: number; total_du: number; total_paye: number; taux_recouvrement: number;
}
interface FinGlobal { confirme_montant: number; confirme_count: number; attente_montant: number; attente_count: number; }

type Tab = 'academic' | 'attendance' | 'finance';

export default function ReportsPage() {
    const { user } = useAuth();
    const { t } = useI18n();
    const [tab,      setTab]      = useState<Tab>('academic');
    const [years,    setYears]    = useState<Year[]>([]);
    const [periods,  setPeriods]  = useState<Period[]>([]);
    const [selYear,  setSelYear]  = useState('');
    const [selPeriod,setSelPeriod]= useState('');
    const [loading,  setLoading]  = useState(false);

    const [acadData,  setAcadData]  = useState<AcaRow[]>([]);
    const [attendData,setAttendData]= useState<AttRow[]>([]);
    const [finData,   setFinData]   = useState<FinRow[]>([]);
    const [finGlobal, setFinGlobal] = useState<FinGlobal | null>(null);

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
        api.get(`/api/evaluations/sequences/year/${selYear}`)
            .then(r => setPeriods(r.data?.sequences ?? []))
            .catch(() => {});
    }, [selYear]);

    const fetchReport = async () => {
        if (!selYear) return;
        setLoading(true);
        try {
            if (tab === 'academic') {
                const r = await api.get('/api/reports/academic', { params: { annee_id: selYear, ...(selPeriod ? { periode_id: selPeriod } : {}) } });
                setAcadData(r.data ?? []);
            } else if (tab === 'attendance') {
                const r = await api.get('/api/reports/attendance', { params: { annee_id: selYear } });
                setAttendData(r.data ?? []);
            } else {
                const r = await api.get('/api/reports/finance', { params: { annee_id: selYear } });
                setFinData(r.data?.par_classe ?? []);
                setFinGlobal(r.data?.global ?? null);
            }
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchReport(); }, [tab, selYear, selPeriod]);

    const fmtXAF = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' XAF';
    const pct    = (n: number) => `${n}%`;

    const bar = (value: number, max = 100, color = 'bg-emerald-500') => (
        <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(value, max)}%` }} />
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">{t('Rapports & Statistiques')}</h1>
                <p className="text-slate-500 text-sm mt-1">{t('Analyse des performances académiques, présences et finances')}</p>
            </div>

            {/* Onglets */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {([
                    { key: 'academic',   icon: BarChart2, label: 'Académique' },
                    { key: 'attendance', icon: Users,     label: 'Présences' },
                    { key: 'finance',    icon: Wallet,    label: 'Finances' },
                ] as { key: Tab; icon: any; label: string }[]).map(({ key, icon: Icon, label }) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Icon size={14} /> {t(label)}
                    </button>
                ))}
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap gap-3 items-end">
                <SelField label={t('Année scolaire')} value={selYear} onChange={setSelYear}>
                    <option value="">{t('-- Année --')}</option>
                    {years.map(y => <option key={y.id} value={y.id}>{y.libelle}</option>)}
                </SelField>
                {tab === 'academic' && (
                    <SelField label={t('Séquence (optionnel)')} value={selPeriod} onChange={setSelPeriod}>
                        <option value="">{t('Toutes séquences')}</option>
                        {periods.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                    </SelField>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-emerald-600" /></div>
            ) : (
                <>
                    {/* ── Académique ── */}
                    {tab === 'academic' && (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                <p className="text-sm font-semibold text-slate-700">{t('Résultats par classe')}</p>
                                <span className="text-xs text-slate-400">{acadData.filter(r => r.stats).length} {t('classe(s) avec données')}</span>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        {['Classe','Effectif','Moy. classe','Max','Min','Admis','Taux réussite'].map(h => (
                                            <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">{t(h)}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {acadData.length === 0 ? (
                                        <tr><td colSpan={7} className="py-12 text-center text-slate-400 text-sm">{t('Aucune donnée disponible')}</td></tr>
                                    ) : acadData.map((r, i) => (
                                        <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                                            className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-semibold text-slate-800">{r.nom}</td>
                                            {r.stats ? (
                                                <>
                                                    <td className="px-4 py-3 text-slate-500">{r.stats.effectif}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`font-bold ${r.stats.moy_classe >= 10 ? 'text-emerald-600' : 'text-red-500'}`}>{r.stats.moy_classe.toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-amber-600 font-semibold">{r.stats.max.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-red-500">{r.stats.min.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-slate-600">{r.stats.admis}/{r.stats.effectif}</td>
                                                    <td className="px-4 py-3 min-w-[120px]">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs font-bold ${r.stats.taux_reussite >= 50 ? 'text-emerald-600' : 'text-red-500'}`}>{r.stats.taux_reussite}%</span>
                                                            <div className="flex-1">{bar(r.stats.taux_reussite, 100, r.stats.taux_reussite >= 50 ? 'bg-emerald-500' : 'bg-red-400')}</div>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <td colSpan={6} className="px-4 py-3 text-slate-300 text-xs italic">{t('Pas de bulletins générés')}</td>
                                            )}
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── Présences ── */}
                    {tab === 'attendance' && (
                        <div className="space-y-4">
                            {attendData.length === 0 ? (
                                <div className="flex flex-col items-center py-16 text-slate-400 gap-2">
                                    <Users size={36} className="text-slate-200" />
                                    <p className="text-sm">{t('Aucune donnée de présence disponible.')}</p>
                                </div>
                            ) : attendData.map((r, i) => (
                                <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                    className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-slate-800">{r.nom} <span className="text-slate-400 font-normal text-sm">· {r.niveau}</span></h3>
                                        <span className={`text-sm font-bold ${r.stats.taux_presence >= 80 ? 'text-emerald-600' : r.stats.taux_presence >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                                            {r.stats.taux_presence}% {t('présence')}
                                        </span>
                                    </div>
                                    {bar(r.stats.taux_presence, 100, r.stats.taux_presence >= 80 ? 'bg-emerald-500' : r.stats.taux_presence >= 60 ? 'bg-amber-500' : 'bg-red-400')}
                                    <div className="grid grid-cols-4 gap-3 text-center">
                                        {[
                                            { label: 'Séances', val: r.stats.total_seances, color: 'text-slate-700' },
                                            { label: 'Absences', val: r.stats.absents, color: 'text-red-600' },
                                            { label: 'Retards', val: r.stats.retards, color: 'text-amber-600' },
                                            { label: 'Exclusions', val: r.stats.exclu, color: 'text-purple-600' },
                                        ].map(item => (
                                            <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                                                <p className={`text-xl font-bold ${item.color}`}>{item.val}</p>
                                                <p className="text-xs text-slate-400 font-medium">{t(item.label)}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {r.top_absents.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('Top absentéisme non justifié')}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {r.top_absents.map((ta, j) => ta.eleve && (
                                                    <span key={j} className="px-2.5 py-1 bg-red-50 border border-red-100 text-red-700 text-xs rounded-full font-medium">
                                                        {ta.eleve.prenom} {ta.eleve.nom} · {ta.absences} {t('abs.')}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* ── Finances ── */}
                    {tab === 'finance' && (
                        <div className="space-y-5">
                            {/* KPIs globaux */}
                            {finGlobal && (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Total recouvré', val: fmtXAF(finGlobal.confirme_montant), sub: `${finGlobal.confirme_count} ${t('paiement(s)')}`, color: 'text-emerald-600' },
                                        { label: 'En attente',     val: fmtXAF(finGlobal.attente_montant),  sub: `${finGlobal.attente_count} ${t('paiement(s)')}`,  color: 'text-amber-600' },
                                        { label: 'Total global',   val: fmtXAF(finGlobal.confirme_montant + finGlobal.attente_montant), sub: t('paiements connus'), color: 'text-slate-800' },
                                        { label: 'Taux global', val: finGlobal.confirme_montant + finGlobal.attente_montant > 0 ? `${Math.round(finGlobal.confirme_montant / (finGlobal.confirme_montant + finGlobal.attente_montant) * 100)}%` : '—', sub: t('de recouvrement'), color: 'text-blue-600' },
                                    ].map(k => (
                                        <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4">
                                            <p className="text-xs text-slate-400 font-medium mb-1">{t(k.label)}</p>
                                            <p className={`text-xl font-bold ${k.color}`}>{k.val}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Par classe */}
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100">
                                    <p className="text-sm font-semibold text-slate-700">{t('Recouvrement par classe')}</p>
                                </div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            {['Classe','Effectif','Montant dû','Montant payé','Taux'].map(h => (
                                                <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">{t(h)}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {finData.length === 0 ? (
                                            <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">{t('Aucune donnée')}</td></tr>
                                        ) : finData.map((r, i) => (
                                            <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                                                className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-semibold text-slate-800">{r.nom}</td>
                                                <td className="px-4 py-3 text-slate-500">{r.effectif}</td>
                                                <td className="px-4 py-3 text-slate-600">{fmtXAF(r.total_du)}</td>
                                                <td className="px-4 py-3 text-emerald-600 font-semibold">{fmtXAF(r.total_paye)}</td>
                                                <td className="px-4 py-3 min-w-[120px]">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-bold ${r.taux_recouvrement >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>{r.taux_recouvrement}%</span>
                                                        <div className="flex-1">{bar(r.taux_recouvrement, 100, r.taux_recouvrement >= 70 ? 'bg-emerald-500' : 'bg-amber-400')}</div>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function SelField({ label, value, onChange, children }: {
    label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">{label}</label>
            <div className="relative">
                <select value={value} onChange={e => onChange(e.target.value)}
                    className="appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                    {children}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
        </div>
    );
}
