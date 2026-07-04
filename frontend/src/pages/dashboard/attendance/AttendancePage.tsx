import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserCheck, UserX, Clock, AlertTriangle, BarChart3,
    Search, Loader2, CheckCircle2, X, ChevronDown,
    Calendar, Users, FileText,
} from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n/i18n';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Year    { id: string; libelle: string; est_active: boolean; }
interface Class   { id: string; nom: string; niveau: string; }
interface Matiere { id: string; nom: string; code: string; }

interface InscriptionRow {
    inscription_id: string;
    eleve_id: string;
    eleve: { id: string; nom: string; prenom: string; matricule: string; sexe: string };
}

interface PresenceRecord {
    id: string;
    eleve_id: string;
    matiere_id: string;
    date_seance: string;
    heure_debut: string;
    heure_fin: string;
    statut: 'present' | 'absent' | 'retard' | 'exclu';
    justifiee: boolean;
    eleve:   { nom: string; prenom: string; matricule: string };
    matiere: { nom: string; code: string };
}

interface StatRow {
    eleve_id: string;
    eleve: { nom: string; prenom: string; matricule: string; sexe: string };
    stats: { present: number; absent: number; retard: number; exclu: number; justifiee: number;
             heures_absence: number; heures_absence_just: number };
    total_seances: number;
}

interface Justification {
    id: string;
    motif: string;
    statut: 'en_attente' | 'acceptee' | 'refusee';
    created_at: string;
    presence: {
        date_seance: string;
        heure_debut: string;
        statut: string;
        eleve:   { nom: string; prenom: string; matricule: string };
        matiere: { nom: string };
    };
}

type Tab = 'saisie' | 'historique' | 'stats' | 'justifications';

const STATUT_COLORS: Record<string, string> = {
    present: 'bg-emerald-100 text-emerald-700',
    absent:  'bg-red-100    text-red-700',
    retard:  'bg-amber-100  text-amber-700',
    exclu:   'bg-slate-100  text-slate-600',
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
    const { user } = useAuth();
    const { t } = useI18n();
    const [tab, setTab] = useState<Tab>('saisie');

    // Sélecteurs
    const [years,    setYears]    = useState<Year[]>([]);
    const [classes,  setClasses]  = useState<Class[]>([]);
    const [matieres, setMatieres] = useState<Matiere[]>([]);

    const [selectedYear,    setSelectedYear]    = useState('');
    const [selectedClass,   setSelectedClass]   = useState('');
    const [selectedMatiere, setSelectedMatiere] = useState('');
    const [dateSeance,      setDateSeance]      = useState(() => new Date().toISOString().slice(0, 10));
    const [heureDebut,      setHeureDebut]      = useState('07:30');
    const [heureFin,        setHeureFin]        = useState('09:00');

    // Onglet Saisie
    const [inscriptions, setInscriptions] = useState<InscriptionRow[]>([]);
    const [entries,      setEntries]      = useState<Record<string, 'present' | 'absent' | 'retard' | 'exclu'>>({});
    const [loadingInsc,  setLoadingInsc]  = useState(false);
    const [saving,       setSaving]       = useState(false);
    const [savedMsg,     setSavedMsg]     = useState('');

    // Onglet Historique
    const [presences,   setPresences]   = useState<PresenceRecord[]>([]);
    const [searchHist,  setSearchHist]  = useState('');
    const [loadingHist, setLoadingHist] = useState(false);

    // Onglet Stats
    const [statRows,     setStatRows]     = useState<StatRow[]>([]);
    const [totalHeuresAbs, setTotalHeuresAbs] = useState(0);
    const [loadingStats, setLoadingStats] = useState(false);

    // Onglet Justifications
    const [justifications,   setJustifications]   = useState<Justification[]>([]);
    const [loadingJustif,    setLoadingJustif]    = useState(false);
    const [justifFilter,     setJustifFilter]     = useState<'en_attente' | 'acceptee' | 'refusee' | ''>('en_attente');
    const [processingJustif, setProcessingJustif] = useState<string | null>(null);

    // ── Données initiales ─────────────────────────────────────────────────────

    useEffect(() => {
        const tenantId = user?.tenant_id;
        if (!tenantId) return;
        api.get(`/api/academic/years/${tenantId}`).then(r => {
            const list: Year[] = r.data ?? [];
            setYears(list);
            const active = list.find(y => y.est_active);
            if (active) setSelectedYear(active.id);
        }).catch(() => {});
    }, [user?.tenant_id]);

    useEffect(() => {
        if (!selectedYear) return;
        api.get(`/api/evaluations/sequences/year/${selectedYear}`).then(r => {
            setClasses(r.data?.classes ?? []);
            setSelectedClass('');
        }).catch(() => {});

        const tenantId = user?.tenant_id;
        if (!tenantId) return;
        api.get(`/api/academic/subject-groups/${tenantId}`).then(r => {
            const groups = r.data ?? [];
            const all: Matiere[] = [];
            for (const g of groups) all.push(...(g.matieres ?? []));
            setMatieres(all);
        }).catch(() => {});
    }, [selectedYear, user?.tenant_id]);

    // ── Onglet Saisie : charger les élèves ───────────────────────────────────

    const loadInscriptions = useCallback(async () => {
        if (!selectedClass) return;
        setLoadingInsc(true);
        try {
            const r = await api.get(`/api/students/class/${selectedClass}`);
            const insc: InscriptionRow[] = r.data ?? [];
            setInscriptions(insc);

            // Pré-remplir depuis la session existante
            if (selectedMatiere && dateSeance && heureDebut) {
                try {
                    const existing = await api.get('/api/attendance/session', {
                        params: { classe_id: selectedClass, matiere_id: selectedMatiere, date_seance: dateSeance, heure_debut: heureDebut },
                    });
                    const map: Record<string, 'present' | 'absent' | 'retard' | 'exclu'> = {};
                    for (const p of (existing.data ?? [])) map[p.eleve_id] = p.statut;
                    for (const i of insc) if (!map[i.eleve_id]) map[i.eleve_id] = 'present';
                    setEntries(map);
                    return;
                } catch {}
            }

            // Défaut : tous présents
            const map: Record<string, 'present' | 'absent' | 'retard' | 'exclu'> = {};
            for (const i of insc) map[i.eleve_id] = 'present';
            setEntries(map);
        } catch {
            setInscriptions([]);
        } finally {
            setLoadingInsc(false);
        }
    }, [selectedClass, selectedMatiere, selectedYear, dateSeance, heureDebut]);

    useEffect(() => {
        if (tab === 'saisie') loadInscriptions();
    }, [tab, selectedClass, selectedMatiere, dateSeance, loadInscriptions]);

    // ── Onglet Historique ─────────────────────────────────────────────────────

    useEffect(() => {
        if (tab !== 'historique' || !selectedClass) return;
        setLoadingHist(true);
        api.get('/api/attendance/class', {
            params: { classe_id: selectedClass, matiere_id: selectedMatiere || undefined },
        }).then(r => setPresences(r.data ?? [])).catch(() => setPresences([])).finally(() => setLoadingHist(false));
    }, [tab, selectedClass, selectedMatiere]);

    // ── Onglet Stats ──────────────────────────────────────────────────────────

    useEffect(() => {
        if (tab !== 'stats' || !selectedClass) return;
        setLoadingStats(true);
        api.get('/api/attendance/stats', {
            params: { classe_id: selectedClass, annee_id: selectedYear || undefined, matiere_id: selectedMatiere || undefined },
        }).then(r => {
            setStatRows(r.data?.rows ?? []);
            setTotalHeuresAbs(r.data?.total_heures_absence ?? 0);
        }).catch(() => { setStatRows([]); setTotalHeuresAbs(0); }).finally(() => setLoadingStats(false));
    }, [tab, selectedClass, selectedYear, selectedMatiere]);

    // ── Onglet Justifications ─────────────────────────────────────────────────

    const loadJustifications = useCallback(async () => {
        setLoadingJustif(true);
        try {
            const r = await api.get('/api/attendance/justifications', {
                params: { classe_id: selectedClass || undefined, statut: justifFilter || undefined },
            });
            setJustifications(r.data ?? []);
        } catch {
            setJustifications([]);
        } finally {
            setLoadingJustif(false);
        }
    }, [selectedClass, justifFilter]);

    useEffect(() => {
        if (tab === 'justifications') loadJustifications();
    }, [tab, justifFilter, loadJustifications]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleSetAll = (statut: 'present' | 'absent') => {
        const map: typeof entries = {};
        for (const i of inscriptions) map[i.eleve_id] = statut;
        setEntries(map);
    };

    const handleSaveSession = async () => {
        if (!selectedClass || !selectedMatiere || !dateSeance) {
            alert(t('Sélectionnez une classe, une matière et une date.'));
            return;
        }
        setSaving(true);
        try {
            const payload = {
                classe_id:   selectedClass,
                matiere_id:  selectedMatiere,
                date_seance: dateSeance,
                heure_debut: heureDebut,
                heure_fin:   heureFin,
                entries: inscriptions.map(i => ({ eleve_id: i.eleve_id, statut: entries[i.eleve_id] ?? 'present' })),
            };
            const r = await api.post('/api/attendance/session', payload);
            setSavedMsg(r.data.message ?? t('Séance enregistrée.'));
            setTimeout(() => setSavedMsg(''), 3500);
        } catch (err: any) {
            alert(err?.response?.data?.error ?? t('Erreur lors de la sauvegarde.'));
        } finally {
            setSaving(false);
        }
    };

    const handleJustifAction = async (id: string, statut: 'acceptee' | 'refusee') => {
        setProcessingJustif(id);
        try {
            await api.put(`/api/attendance/justifications/${id}`, { statut });
            loadJustifications();
        } catch (err: any) {
            alert(err?.response?.data?.error ?? t('Erreur.'));
        } finally {
            setProcessingJustif(null);
        }
    };

    // ── Dérivés ───────────────────────────────────────────────────────────────

    const countByStatut = (s: string) => inscriptions.filter(i => (entries[i.eleve_id] ?? 'present') === s).length;

    const filteredPresences = presences.filter(p => {
        const q = searchHist.toLowerCase();
        return !q || p.eleve.nom.toLowerCase().includes(q) || p.eleve.prenom.toLowerCase().includes(q) || p.eleve.matricule.includes(q);
    });

    const tabs: { id: Tab; label: string; icon: JSX.Element }[] = [
        { id: 'saisie',         label: 'Saisie',         icon: <UserCheck size={16} /> },
        { id: 'historique',     label: 'Historique',     icon: <Calendar  size={16} /> },
        { id: 'stats',          label: 'Statistiques',   icon: <BarChart3 size={16} /> },
        { id: 'justifications', label: 'Justifications', icon: <FileText  size={16} /> },
    ];

    // ── Rendu ─────────────────────────────────────────────────────────────────

    return (
        <div className="p-6 space-y-6">
            {/* En-tête */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">{t('Présences & Absences')}</h1>
                <p className="text-slate-500 text-sm mt-1">{t('Saisie des présences et suivi des absences par classe')}</p>
            </div>

            {/* Sélecteurs globaux */}
            <div className="flex flex-wrap gap-3 items-end">
                <Select value={selectedYear}    onChange={e => setSelectedYear(e.target.value)}    label={t('Année scolaire')}>
                    <option value="">{t('-- Année --')}</option>
                    {years.map(y => <option key={y.id} value={y.id}>{y.libelle}</option>)}
                </Select>
                <Select value={selectedClass}   onChange={e => setSelectedClass(e.target.value)}   label={t('Classe')} className="min-w-[160px]">
                    <option value="">{t('-- Classe --')}</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>)}
                </Select>
                <Select value={selectedMatiere} onChange={e => setSelectedMatiere(e.target.value)} label={t('Matière')} className="min-w-[180px]">
                    <option value="">{t('-- Toutes matières --')}</option>
                    {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </Select>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500 font-medium">{t('Date')}</label>
                    <input type="date" value={dateSeance} onChange={e => setDateSeance(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none bg-white" />
                </div>
            </div>

            {/* Onglets */}
            <div className="flex gap-1 border-b border-slate-200">
                {tabs.map(tb => (
                    <button key={tb.id} onClick={() => setTab(tb.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                            tab === tb.id
                                ? 'bg-white text-emerald-600 border-b-2 border-emerald-500'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}>
                        {tb.icon}{t(tb.label)}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">

                {/* ══ SAISIE ══════════════════════════════════════════════════ */}
                {tab === 'saisie' && (
                    <motion.div key="saisie" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                        {/* Barre horaire */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-end gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-500 font-medium">{t('Heure début')}</label>
                                <input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)}
                                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-500 font-medium">{t('Heure fin')}</label>
                                <input type="time" value={heureFin} onChange={e => setHeureFin(e.target.value)}
                                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div className="flex-1" />
                            <div className="flex gap-2">
                                <button onClick={() => handleSetAll('present')}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm hover:bg-emerald-100 font-medium">
                                    <UserCheck size={14} /> {t('Tous présents')}
                                </button>
                                <button onClick={() => handleSetAll('absent')}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100 font-medium">
                                    <UserX size={14} /> {t('Tous absents')}
                                </button>
                            </div>
                            {inscriptions.length > 0 && (
                                <div className="flex gap-4 text-sm ml-2">
                                    <span className="text-emerald-600 font-semibold">{countByStatut('present')} {t('présents')}</span>
                                    <span className="text-red-600    font-semibold">{countByStatut('absent')} {t('absents')}</span>
                                    <span className="text-amber-600  font-semibold">{countByStatut('retard')} {t('retards')}</span>
                                </div>
                            )}
                        </div>

                        {/* Tableau élèves */}
                        {!selectedClass ? (
                            <EmptyState icon={<Users size={40} />} message={t('Sélectionnez une classe pour saisir les présences.')} />
                        ) : loadingInsc ? (
                            <LoadingState />
                        ) : inscriptions.length === 0 ? (
                            <EmptyState icon={<Users size={40} />} message={t('Aucun élève inscrit dans cette classe.')} />
                        ) : (
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-slate-500 font-medium w-8">#</th>
                                            <th className="text-left px-4 py-3 text-slate-500 font-medium">{t('Matricule')}</th>
                                            <th className="text-left px-4 py-3 text-slate-500 font-medium">{t('Nom & Prénom')}</th>
                                            <th className="text-center px-4 py-3 text-slate-500 font-medium">{t('Statut')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {inscriptions.map((insc, idx) => {
                                            const statut = entries[insc.eleve_id] ?? 'present';
                                            return (
                                                <tr key={insc.eleve_id} className="hover:bg-slate-50/70">
                                                    <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{insc.eleve.matricule}</td>
                                                    <td className="px-4 py-3 font-medium text-slate-700">
                                                        {insc.eleve.nom} <span className="text-slate-500 font-normal">{insc.eleve.prenom}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-center gap-1.5 flex-wrap">
                                                            {(['present', 'absent', 'retard', 'exclu'] as const).map(s => (
                                                                <button key={s} onClick={() => setEntries(prev => ({ ...prev, [insc.eleve_id]: s }))}
                                                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                                                                        statut === s
                                                                            ? STATUT_COLORS[s] + ' ring-2 ring-offset-1 ' + (s === 'present' ? 'ring-emerald-300' : s === 'absent' ? 'ring-red-300' : s === 'retard' ? 'ring-amber-300' : 'ring-slate-300')
                                                                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                                                    }`}>
                                                                    {s === 'present' ? <UserCheck size={11} /> : s === 'absent' ? <UserX size={11} /> : s === 'retard' ? <Clock size={11} /> : <AlertTriangle size={11} />}
                                                                    {t(s)}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {inscriptions.length > 0 && (
                            <div className="flex justify-end items-center gap-4">
                                {savedMsg && (
                                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                                        <CheckCircle2 size={16} /> {savedMsg}
                                    </motion.span>
                                )}
                                <button onClick={handleSaveSession} disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium disabled:opacity-50 transition-colors">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                                    {t('Enregistrer la séance')}
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ══ HISTORIQUE ══════════════════════════════════════════════ */}
                {tab === 'historique' && (
                    <motion.div key="historique" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={searchHist} onChange={e => setSearchHist(e.target.value)}
                                    placeholder="Search a student…"
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                        </div>

                        {!selectedClass ? (
                            <EmptyState icon={<Calendar size={40} />} message={t("Sélectionnez une classe pour voir l'historique.")} />
                        ) : loadingHist ? (
                            <LoadingState />
                        ) : filteredPresences.length === 0 ? (
                            <EmptyState icon={<Calendar size={40} />} message={t('Aucune séance enregistrée.')} />
                        ) : (
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-medium text-slate-500">{t('Date')}</th>
                                            <th className="text-left px-4 py-3 font-medium text-slate-500">{t('Horaire')}</th>
                                            <th className="text-left px-4 py-3 font-medium text-slate-500">{t('Élève')}</th>
                                            <th className="text-left px-4 py-3 font-medium text-slate-500">{t('Matière')}</th>
                                            <th className="text-center px-4 py-3 font-medium text-slate-500">{t('Statut')}</th>
                                            <th className="text-center px-4 py-3 font-medium text-slate-500">{t('Justif.')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredPresences.map(p => (
                                            <tr key={p.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-2.5 text-slate-600">
                                                    {new Date(p.date_seance).toLocaleDateString('fr-FR')}
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                                                    {new Date(p.heure_debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                    {' – '}
                                                    {new Date(p.heure_fin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-4 py-2.5 font-medium text-slate-700">
                                                    {p.eleve.nom} {p.eleve.prenom}
                                                    <span className="ml-1.5 text-xs font-mono text-slate-400">{p.eleve.matricule}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-500">{p.matiere.nom}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUT_COLORS[p.statut]}`}>
                                                        {p.statut}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-center text-xs">
                                                    {p.statut !== 'present'
                                                        ? <span className={p.justifiee ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                                                            {p.justifiee ? t('✓ Oui') : '–'}
                                                          </span>
                                                        : null}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ══ STATISTIQUES ════════════════════════════════════════════ */}
                {tab === 'stats' && (
                    <motion.div key="stats" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {!selectedClass ? (
                            <EmptyState icon={<BarChart3 size={40} />} message={t('Sélectionnez une classe pour voir les statistiques.')} />
                        ) : loadingStats ? (
                            <LoadingState />
                        ) : statRows.length === 0 ? (
                            <EmptyState icon={<BarChart3 size={40} />} message={t('Aucune donnée de présence pour cette classe.')} />
                        ) : (
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="font-semibold text-slate-700 text-sm">{t('Bilan des absences')} — {statRows.length} {t('élève(s)')}</h3>
                                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                                        {t('Total :')} {totalHeuresAbs} {t("h d'absence")}
                                    </span>
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50/60 border-b border-slate-100">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-medium text-slate-500">{t('Élève')}</th>
                                            <th className="text-center px-3 py-3 font-medium text-emerald-600">{t('Présent')}</th>
                                            <th className="text-center px-3 py-3 font-medium text-red-600">{t('Absent')}</th>
                                            <th className="text-center px-3 py-3 font-medium text-amber-600">{t('Retard')}</th>
                                            <th className="text-center px-3 py-3 font-medium text-slate-500">{t('Exclu')}</th>
                                            <th className="text-center px-3 py-3 font-medium text-slate-500">{t('Justifiées')}</th>
                                            <th className="text-center px-3 py-3 font-medium text-red-600">{t("Heures d'abs.")}</th>
                                            <th className="px-4 py-3 font-medium text-slate-500">{t('Taux présence')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {[...statRows].sort((a, b) => a.eleve.nom.localeCompare(b.eleve.nom)).map(row => {
                                            const total = row.total_seances;
                                            const taux  = total > 0 ? Math.round((row.stats.present / total) * 100) : 0;
                                            const bar   = taux >= 90 ? 'bg-emerald-500' : taux >= 75 ? 'bg-amber-500' : 'bg-red-500';
                                            const txt   = taux >= 90 ? 'text-emerald-600' : taux >= 75 ? 'text-amber-600' : 'text-red-600';
                                            return (
                                                <tr key={row.eleve_id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-medium text-slate-700">
                                                        {row.eleve.nom} <span className="font-normal text-slate-500">{row.eleve.prenom}</span>
                                                        <span className="ml-2 text-xs font-mono text-slate-400">{row.eleve.matricule}</span>
                                                    </td>
                                                    <td className="px-3 py-3 text-center font-semibold text-emerald-600">{row.stats.present}</td>
                                                    <td className="px-3 py-3 text-center font-semibold text-red-600">{row.stats.absent}</td>
                                                    <td className="px-3 py-3 text-center font-semibold text-amber-600">{row.stats.retard}</td>
                                                    <td className="px-3 py-3 text-center text-slate-500">{row.stats.exclu}</td>
                                                    <td className="px-3 py-3 text-center text-slate-500">{row.stats.justifiee}</td>
                                                    <td className="px-3 py-3 text-center font-semibold text-red-600">
                                                        {row.stats.heures_absence > 0 ? `${row.stats.heures_absence} h` : '–'}
                                                        {row.stats.heures_absence_just > 0 && (
                                                            <span className="block text-[10px] font-normal text-emerald-600">
                                                                {t('dont')} {row.stats.heures_absence_just} {t('h just.')}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                                                <div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${taux}%` }} />
                                                            </div>
                                                            <span className={`text-xs font-semibold w-9 text-right ${txt}`}>{taux}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ══ JUSTIFICATIONS ══════════════════════════════════════════ */}
                {tab === 'justifications' && (
                    <motion.div key="justifications" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                        <div className="flex gap-2">
                            {([['en_attente', 'En attente'], ['acceptee', 'Acceptées'], ['refusee', 'Refusées'], ['', 'Toutes']] as const).map(([val, label]) => (
                                <button key={val} onClick={() => setJustifFilter(val as any)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                        justifFilter === val ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}>{t(label)}</button>
                            ))}
                        </div>

                        {loadingJustif ? (
                            <LoadingState />
                        ) : justifications.length === 0 ? (
                            <EmptyState icon={<FileText size={40} />} message={t('Aucune justification pour les filtres sélectionnés.')} />
                        ) : (
                            <div className="space-y-3">
                                {justifications.map(j => (
                                    <div key={j.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="font-semibold text-slate-700">{j.presence.eleve.nom} {j.presence.eleve.prenom}</span>
                                                <span className="text-xs font-mono text-slate-400">{j.presence.eleve.matricule}</span>
                                                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                                                    j.statut === 'en_attente' ? 'bg-amber-100 text-amber-700'   :
                                                    j.statut === 'acceptee'   ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>{j.statut.replace('_', ' ')}</span>
                                            </div>
                                            <div className="text-sm text-slate-500 space-y-0.5">
                                                <p><span className="font-medium text-slate-600">{t('Matière')} :</span> {j.presence.matiere.nom}</p>
                                                <p><span className="font-medium text-slate-600">{t('Date')} :</span> {new Date(j.presence.date_seance).toLocaleDateString('fr-FR')} — <span className="capitalize">{t(j.presence.statut)}</span></p>
                                                <p><span className="font-medium text-slate-600">{t('Motif :')}</span> {j.motif}</p>
                                            </div>
                                        </div>
                                        {j.statut === 'en_attente' && (
                                            <div className="flex gap-2 shrink-0">
                                                <button onClick={() => handleJustifAction(j.id, 'acceptee')} disabled={processingJustif === j.id}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">
                                                    {processingJustif === j.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                                    {t('Accepter')}
                                                </button>
                                                <button onClick={() => handleJustifAction(j.id, 'refusee')} disabled={processingJustif === j.id}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50">
                                                    <X size={12} /> {t('Refuser')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Composants utilitaires ────────────────────────────────────────────────────

function Select({ value, onChange, label, children, className = '' }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    label: string;
    children: React.ReactNode;
    className?: string;
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

function LoadingState() {
    return (
        <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-emerald-600" />
        </div>
    );
}

function EmptyState({ icon, message }: { icon: JSX.Element; message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <div className="text-slate-300">{icon}</div>
            <p className="text-sm text-center">{message}</p>
        </div>
    );
}
