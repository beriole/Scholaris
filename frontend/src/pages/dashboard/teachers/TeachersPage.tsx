import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GraduationCap, Plus, Search, X, Loader2,
    AlertCircle, UserMinus, Mail, Phone, BookOpen, Info
} from 'lucide-react';
import api from '../../../lib/api';

interface Teacher {
    id: string;
    matricule: string;
    nom: string;
    prenom: string;
    specialite: string | null;
    telephone: string | null;
    utilisateur: { email: string; est_actif: boolean } | null;
    affectations: { matiere: { nom: string; code: string }; classe: { nom: string } }[];
    classes_titulaires: { id: string; nom: string }[];
}

const EMPTY_FORM = {
    nom: '',
    prenom: '',
    specialite: '',
    telephone: '',
    email: '',
};

const TeachersPage = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Teacher | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [newTempPassword, setNewTempPassword] = useState('');

    const fetchTeachers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/teachers');
            setTeachers(res.data);
        } catch {
            // silencieux
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTeachers(); }, []);

    const openAdd = () => {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setNewTempPassword('');
        setError('');
        setIsModalOpen(true);
    };

    const openEdit = (t: Teacher) => {
        setEditTarget(t);
        setForm({
            matricule: t.matricule,
            nom: t.nom,
            prenom: t.prenom,
            specialite: t.specialite ?? '',
            telephone: t.telephone ?? '',
            email: t.utilisateur?.email ?? '',
        });
        setNewTempPassword('');
        setError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            if (editTarget) {
                await api.put(`/api/teachers/${editTarget.id}`, form);
                setIsModalOpen(false);
                fetchTeachers();
            } else {
                const res = await api.post('/api/teachers', form);
                setNewTempPassword(res.data.temp_password ?? '');
                fetchTeachers();
            }
        } catch (err: any) {
            setError(err.response?.data?.error ?? 'Une erreur est survenue.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeactivate = async (id: string) => {
        if (!confirm('Désactiver l\'accès de cet enseignant ?')) return;
        try {
            await api.patch(`/api/teachers/${id}/deactivate`);
            fetchTeachers();
        } catch { /* silencieux */ }
    };

    const displayed = teachers.filter(t => {
        const q = search.toLowerCase();
        return (
            !q ||
            t.nom.toLowerCase().includes(q) ||
            t.prenom.toLowerCase().includes(q) ||
            t.matricule.toLowerCase().includes(q) ||
            (t.specialite ?? '').toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Enseignants</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {loading ? '…' : `${teachers.length} enseignant${teachers.length !== 1 ? 's' : ''}`}
                    </p>
                </div>
                <button
                    onClick={openAdd}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-sm shrink-0"
                >
                    <Plus className="w-4 h-4" /> Ajouter un enseignant
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Rechercher…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center gap-3 py-20">
                        <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-slate-400">Chargement…</span>
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="py-20 text-center">
                        <GraduationCap className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-400">
                            {search ? 'Aucun résultat.' : 'Aucun enseignant enregistré.'}
                        </p>
                        {!search && (
                            <button onClick={openAdd} className="mt-3 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                                + Ajouter le premier enseignant
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Enseignant</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Matricule</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Spécialité</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Matières assignées</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Compte</th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {displayed.map((t, i) => (
                                    <motion.tr
                                        key={t.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="hover:bg-slate-50/60 transition-colors"
                                    >
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                                                    {t.nom.charAt(0)}{t.prenom.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{t.nom} {t.prenom}</p>
                                                    {t.telephone && (
                                                        <p className="text-xs text-slate-400 flex items-center gap-1">
                                                            <Phone className="w-2.5 h-2.5" /> {t.telephone}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{t.matricule}</span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="text-slate-600">{t.specialite ?? <span className="text-slate-300">—</span>}</span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex flex-wrap gap-1">
                                                {t.affectations.length === 0 ? (
                                                    <span className="text-slate-300 text-xs">Non assigné</span>
                                                ) : (
                                                    t.affectations.slice(0, 3).map((a, j) => (
                                                        <span key={j} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
                                                            {a.matiere.code} · {a.classe.nom}
                                                        </span>
                                                    ))
                                                )}
                                                {t.affectations.length > 3 && (
                                                    <span className="text-xs text-slate-400">+{t.affectations.length - 3}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {t.utilisateur ? (
                                                <div>
                                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${t.utilisateur.est_actif ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${t.utilisateur.est_actif ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                        {t.utilisateur.est_actif ? 'Actif' : 'Désactivé'}
                                                    </span>
                                                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                        <Mail className="w-2.5 h-2.5" /> {t.utilisateur.email}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openEdit(t)}
                                                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                                                >
                                                    Modifier
                                                </button>
                                                <button
                                                    onClick={() => handleDeactivate(t.id)}
                                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <UserMinus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
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
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <GraduationCap className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        {editTarget ? 'Modifier l\'enseignant' : 'Nouvel enseignant'}
                                    </h3>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Success — temp password */}
                            {newTempPassword ? (
                                <div className="p-6 space-y-4">
                                    <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                        <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-emerald-800 mb-1">Enseignant créé avec succès</p>
                                            <p className="text-xs text-emerald-700">Communiquez ce mot de passe temporaire à l'enseignant :</p>
                                            <code className="block mt-2 px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm font-mono text-emerald-800 font-bold">
                                                {newTempPassword}
                                            </code>
                                            <p className="text-xs text-emerald-600 mt-2">Il pourra le changer via "Mot de passe oublié".</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsModalOpen(false)} className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all">
                                        Fermer
                                    </button>
                                </div>
                            ) : (
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

                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Nom" required>
                                            <input required className={INPUT} placeholder="NGUEMA" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
                                        </Field>
                                        <Field label="Prénom" required>
                                            <input required className={INPUT} placeholder="Paul" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
                                        </Field>
                                    </div>

                                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                                        <span className="text-xs text-emerald-700 font-medium">🎫 Matricule généré automatiquement à la création</span>
                                    </div>

                                    <Field label="Spécialité">
                                        <input className={INPUT} placeholder="Mathématiques" value={form.specialite} onChange={e => setForm(f => ({ ...f, specialite: e.target.value }))} />
                                    </Field>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Téléphone">
                                            <input className={INPUT} placeholder="6XXXXXXXX" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
                                        </Field>
                                        <Field label={editTarget ? "Email (lecture seule)" : "Email (accès plateforme)"} required={!editTarget}>
                                            <input
                                                required={!editTarget}
                                                type="email"
                                                readOnly={!!editTarget}
                                                className={`${INPUT} ${editTarget ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                                                placeholder="prof@ecole.cm"
                                                value={form.email}
                                                onChange={e => !editTarget && setForm(f => ({ ...f, email: e.target.value }))}
                                            />
                                        </Field>
                                    </div>

                                    {!editTarget && (
                                        <p className="text-xs text-slate-400 flex items-start gap-1.5">
                                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                            Un mot de passe temporaire sera généré et affiché après la création.
                                        </p>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                                            Annuler
                                        </button>
                                        <button type="submit" disabled={saving} className="flex-[2] py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70">
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editTarget ? 'Enregistrer' : 'Créer l\'enseignant')}
                                        </button>
                                    </div>
                                </form>
                            )}
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

export default TeachersPage;
