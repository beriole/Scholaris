import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Plus, Search, X, Loader2, ChevronDown,
    GraduationCap, AlertCircle, UserX, MoreHorizontal, Upload, User, Download
} from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { uploadImageFile } from '../../../lib/uploadImage';
import { downloadClassRoster } from '../../../lib/classPdf';
import { useI18n } from '../../../i18n/i18n';

interface Student {
    id: string;
    matricule: string;
    nom: string;
    prenom: string;
    sexe: string | null;
    statut: string;
    date_naissance: string;
    photo_url?: string | null;
    inscriptions: {
        id: string;
        classe: { id: string; nom: string; niveau: string } | null;
        annee: { id: string; libelle: string; est_active: boolean } | null;
    }[];
}

const EMPTY_FORM = {
    nom: '',
    prenom: '',
    date_naissance: '',
    lieu_naissance: '',
    sexe: '',
    nationalite: 'Camerounaise',
    classe_id: '',
    annee_id: '',
    photo_url: '',
};

const StudentsPage = () => {
    const { user } = useAuth();
    const { t } = useI18n();
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [years, setYears] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [filterClasse, setFilterClasse] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Student | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [activeYear, setActiveYear] = useState<any>(null);
    const [photoUploading, setPhotoUploading] = useState(false);
    const [school, setSchool] = useState<{ nom: string; logo_url?: string | null; ville?: string | null; telephone?: string | null }>({ nom: 'Mon Établissement' });
    const [downloading, setDownloading] = useState(false);

    const handlePhotoFile = async (file?: File) => {
        if (!file) return;
        setPhotoUploading(true); setError('');
        try {
            const url = await uploadImageFile(file, 'photo');
            setForm(f => ({ ...f, photo_url: url }));
        } catch (e: any) {
            setError(e?.response?.data?.error ?? e?.message ?? t('Erreur lors de l\'upload de la photo.'));
        } finally { setPhotoUploading(false); }
    };

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [studRes, yearsRes] = await Promise.all([
                api.get('/api/students'),
                api.get(`/api/academic/years/${user?.tenant_id}`),
            ]);
            setStudents(studRes.data);
            setYears(yearsRes.data);

            const ay = yearsRes.data.find((y: any) => y.est_active);
            setActiveYear(ay ?? null);

            if (ay) {
                const clsRes = await api.get(`/api/academic/classes/${ay.id}`);
                setClasses(clsRes.data);
            }
        } catch {
            // silencieux
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, [user]);

    useEffect(() => {
        api.get('/api/settings/school')
            .then(r => setSchool({
                nom: r.data.ecole?.nom ?? 'Mon Établissement',
                logo_url: r.data.ecole?.logo_url ?? null,
                ville: r.data.ecole?.ville ?? null,
                telephone: r.data.ecole?.telephone ?? null,
            }))
            .catch(() => {});
    }, []);

    const handleDownloadRoster = async () => {
        if (!displayed.length) return;
        setDownloading(true);
        try {
            const classeName = filterClasse
                ? (classes.find(c => c.id === filterClasse)?.nom ?? 'Classe')
                : t('Tous les élèves');
            await downloadClassRoster(
                displayed.map(s => ({
                    matricule: s.matricule, nom: s.nom, prenom: s.prenom,
                    sexe: s.sexe, date_naissance: s.date_naissance, statut: s.statut,
                })),
                school, classeName, activeYear?.libelle ?? '',
            );
        } catch (e) { console.error(e); }
        finally { setDownloading(false); }
    };

    const handleYearChange = async (yearId: string) => {
        const y = years.find(y => y.id === yearId);
        setActiveYear(y ?? null);
        setFilterClasse('');
        if (yearId) {
            const res = await api.get(`/api/academic/classes/${yearId}`);
            setClasses(res.data);
        } else {
            setClasses([]);
        }
    };

    const openAdd = () => {
        setEditTarget(null);
        setForm({
            ...EMPTY_FORM,
            annee_id: activeYear?.id ?? '',
        });
        setError('');
        setIsModalOpen(true);
    };

    const openEdit = (s: Student) => {
        setEditTarget(s);
        setForm({
            matricule: s.matricule,
            nom: s.nom,
            prenom: s.prenom,
            date_naissance: s.date_naissance?.split('T')[0] ?? '',
            lieu_naissance: '',
            sexe: s.sexe ?? '',
            nationalite: 'Camerounaise',
            classe_id: s.inscriptions[0]?.classe?.id ?? '',
            annee_id: s.inscriptions[0]?.annee?.id ?? '',
            photo_url: s.photo_url ?? '',
        });
        setError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            if (editTarget) {
                await api.put(`/api/students/${editTarget.id}`, form);
            } else {
                await api.post('/api/students', form);
            }
            setIsModalOpen(false);
            fetchAll();
        } catch (err: any) {
            setError(err.response?.data?.error ?? t('Une erreur est survenue.'));
        } finally {
            setSaving(false);
        }
    };

    const handleArchive = async (id: string) => {
        if (!confirm(t('Archiver cet élève ?'))) return;
        try {
            await api.patch(`/api/students/${id}/archive`);
            fetchAll();
        } catch { /* silencieux */ }
    };

    const displayed = students.filter(s => {
        const q = search.toLowerCase();
        const matchSearch =
            !q ||
            s.nom.toLowerCase().includes(q) ||
            s.prenom.toLowerCase().includes(q) ||
            s.matricule.toLowerCase().includes(q);
        const matchClasse =
            !filterClasse || s.inscriptions[0]?.classe?.id === filterClasse;
        return matchSearch && matchClasse;
    });

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">{t('Élèves')}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {loading ? '…' : `${students.length} ${t('élève(s) inscrit(s)')}`}
                        {activeYear && <span className="ml-2 text-emerald-600 font-semibold">· {activeYear.libelle}</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleDownloadRoster}
                        disabled={downloading || displayed.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50"
                    >
                        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {t('Télécharger la liste')}
                    </button>
                    <button
                        onClick={openAdd}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> {t('Ajouter un élève')}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder={t('Rechercher par nom ou matricule…')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all"
                    />
                </div>

                {years.length > 0 && (
                    <div className="relative">
                        <select
                            value={activeYear?.id ?? ''}
                            onChange={e => handleYearChange(e.target.value)}
                            className="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-400 font-medium text-slate-700"
                        >
                            {years.map(y => (
                                <option key={y.id} value={y.id}>
                                    {y.libelle}{y.est_active ? ' ✦' : ''}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                )}

                {classes.length > 0 && (
                    <div className="relative">
                        <select
                            value={filterClasse}
                            onChange={e => setFilterClasse(e.target.value)}
                            className="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-400 font-medium text-slate-700"
                        >
                            <option value="">{t('Toutes les classes')}</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.nom}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center gap-3 py-20">
                        <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-slate-400">{t('Chargement…')}</span>
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="py-20 text-center">
                        <GraduationCap className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-400">
                            {search || filterClasse ? t('Aucun résultat.') : t('Aucun élève inscrit pour le moment.')}
                        </p>
                        {!search && !filterClasse && (
                            <button onClick={openAdd} className="mt-3 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                                {t('+ Ajouter le premier élève')}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Élève')}</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Matricule')}</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Classe')}</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Niveau')}</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Statut')}</th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {displayed.map((s, i) => {
                                    const insc = s.inscriptions[0];
                                    return (
                                        <motion.tr
                                            key={s.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="hover:bg-slate-50/60 transition-colors"
                                        >
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                                                        {s.nom.charAt(0)}{s.prenom.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{s.nom} {s.prenom}</p>
                                                        {s.sexe && <p className="text-xs text-slate-400">{s.sexe === 'M' ? t('Masculin') : t('Féminin')}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{s.matricule}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="font-medium text-slate-700">{insc?.classe?.nom ?? <span className="text-slate-300">—</span>}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="text-slate-500">{insc?.classe?.niveau ?? '—'}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <StatusBadge status={s.statut} />
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => openEdit(s)}
                                                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                                                    >
                                                        {t('Modifier')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleArchive(s.id)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <UserX className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                        >
                            {/* Modal header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                                        <GraduationCap className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        {editTarget ? t('Modifier l\'élève') : t('Nouvel élève')}
                                    </h3>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm"
                                        >
                                            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Photo de l'élève */}
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                        {form.photo_url
                                            ? <img src={form.photo_url} alt="élève" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            : <User size={24} className="text-slate-300" />}
                                    </div>
                                    <div>
                                        <div className="flex gap-2">
                                            <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 cursor-pointer transition-all">
                                                {photoUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                                {form.photo_url ? t('Changer la photo') : t('Ajouter une photo')}
                                                <input type="file" accept="image/*" className="hidden" disabled={photoUploading}
                                                    onChange={e => handlePhotoFile(e.target.files?.[0])} />
                                            </label>
                                            {form.photo_url && (
                                                <button type="button" onClick={() => setForm(f => ({ ...f, photo_url: '' }))}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-500 text-sm font-semibold rounded-lg hover:bg-red-50 hover:text-red-600 transition-all">
                                                    <X size={14} /> {t('Retirer')}
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-1.5">{t('JPG/PNG · max 4 Mo · figure sur le bulletin.')}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Field label={t('Nom')} required>
                                        <input required className={INPUT} placeholder="TAGNE" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
                                    </Field>
                                    <Field label={t('Prénom')} required>
                                        <input required className={INPUT} placeholder="Jean-Pierre" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
                                    </Field>
                                </div>

                                <div className="col-span-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                                    <span className="text-xs text-emerald-700 font-medium">🎫 {t('Matricule généré automatiquement à la création')}</span>
                                </div>

                                <Field label={t('Sexe')}>
                                    <select className={INPUT} value={form.sexe} onChange={e => setForm(f => ({ ...f, sexe: e.target.value }))}>
                                        <option value="">—</option>
                                        <option value="M">{t('Masculin')}</option>
                                        <option value="F">{t('Féminin')}</option>
                                    </select>
                                </Field>

                                <div className="grid grid-cols-2 gap-4">
                                    <Field label={t('Date de naissance')} required>
                                        <input required type="date" className={INPUT} value={form.date_naissance} onChange={e => setForm(f => ({ ...f, date_naissance: e.target.value }))} />
                                    </Field>
                                    <Field label={t('Lieu de naissance')} required>
                                        <input required className={INPUT} placeholder="Yaoundé" value={form.lieu_naissance} onChange={e => setForm(f => ({ ...f, lieu_naissance: e.target.value }))} />
                                    </Field>
                                </div>

                                {!editTarget && classes.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('Inscription (optionnel)')}</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label={t('Année scolaire')}>
                                                <select className={INPUT} value={form.annee_id} onChange={e => setForm(f => ({ ...f, annee_id: e.target.value }))}>
                                                    <option value="">—</option>
                                                    {years.map(y => <option key={y.id} value={y.id}>{y.libelle}</option>)}
                                                </select>
                                            </Field>
                                            <Field label={t('Classe')}>
                                                <select className={INPUT} value={form.classe_id} onChange={e => setForm(f => ({ ...f, classe_id: e.target.value }))}>
                                                    <option value="">—</option>
                                                    {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                                                </select>
                                            </Field>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                                        {t('Annuler')}
                                    </button>
                                    <button type="submit" disabled={saving} className="flex-[2] py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70">
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editTarget ? t('Enregistrer') : t('Ajouter l\'élève'))}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const INPUT = 'w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all font-medium';

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-600">
            {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

const StatusBadge = ({ status }: { status: string }) => {
    const { t } = useI18n();
    const map: Record<string, string> = {
        actif: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        exclu: 'bg-red-50 text-red-600 border border-red-200',
        transfere: 'bg-blue-50 text-blue-600 border border-blue-200',
        diplome: 'bg-amber-50 text-amber-700 border border-amber-200',
    };
    const labels: Record<string, string> = { actif: 'Actif', exclu: 'Archivé', transfere: 'Transféré', diplome: 'Diplômé' };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? map.actif}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'actif' ? 'bg-emerald-500' : 'bg-red-400'}`} />
            {t(labels[status] ?? status)}
        </span>
    );
};

export default StudentsPage;
