import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Hash, Layers, Loader2, Trash2, Edit2, X, AlertCircle, ChevronDown } from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n/i18n';

interface Matiere {
    id: string;
    nom: string;
    code: string;
    coefficient: number;
    groupe_matiere_id: string | null;
}

interface Group {
    id: string;
    nom: string;
    matieres: Matiere[];
}

const INPUT = 'w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 font-semibold text-sm transition-all';

const SubjectManager = () => {
    const { user } = useAuth();
    const { t } = useI18n();
    const [groups,  setGroups]  = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [err,     setErr]     = useState('');

    // Modales
    const [groupModal,   setGroupModal]   = useState(false);
    const [subjectModal, setSubjectModal] = useState(false);
    const [deleteModal,  setDeleteModal]  = useState<{ type: 'group' | 'subject'; id: string; nom: string } | null>(null);

    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [editSubject,     setEditSubject]     = useState<Matiere | null>(null);
    const [groupName,       setGroupName]       = useState('');
    const [saving,          setSaving]          = useState(false);

    const [subjectData, setSubjectData] = useState({ code: '', nom: '', coefficient: 1 });

    const fetchGroups = async () => {
        if (!user?.tenant_id) return;
        try {
            const res = await api.get(`/api/academic/subject-groups/${user.tenant_id}`);
            setGroups(res.data ?? []);
        } catch {
            setErr(t('Erreur de chargement'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchGroups(); }, [user]);

    // ── Groupe ──────────────────────────────────────────────────────────────

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setErr('');
        try {
            await api.post('/api/academic/subject-groups', {
                ecole_id:        user?.tenant_id,
                nom:             groupName,
                ordre_affichage: groups.length,
            });
            setGroupName('');
            setGroupModal(false);
            fetchGroups();
        } catch { setErr(t('Erreur lors de la création du groupe')); }
        finally { setSaving(false); }
    };

    const handleDeleteGroup = async (id: string) => {
        setSaving(true);
        try {
            await api.delete(`/api/academic/subject-groups/${id}`);
            setDeleteModal(null);
            fetchGroups();
        } catch { setErr(t('Erreur lors de la suppression')); }
        finally { setSaving(false); }
    };

    // ── Matière ─────────────────────────────────────────────────────────────

    const openCreateSubject = (groupId: string) => {
        setEditSubject(null);
        setSelectedGroupId(groupId);
        setSubjectData({ code: '', nom: '', coefficient: 1 });
        setErr('');
        setSubjectModal(true);
    };

    const openEditSubject = (m: Matiere) => {
        setEditSubject(m);
        setSelectedGroupId(m.groupe_matiere_id ?? '');
        setSubjectData({ code: m.code, nom: m.nom, coefficient: m.coefficient });
        setErr('');
        setSubjectModal(true);
    };

    const handleSaveSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setErr('');
        try {
            if (editSubject) {
                await api.put(`/api/academic/subjects/${editSubject.id}`, subjectData);
            } else {
                await api.post('/api/academic/subjects', {
                    ...subjectData,
                    ecole_id:  user?.tenant_id,
                    groupe_id: selectedGroupId,
                });
            }
            setSubjectModal(false);
            fetchGroups();
        } catch (e: any) {
            setErr(e?.response?.data?.error ?? t('Erreur lors de l\'enregistrement'));
        } finally { setSaving(false); }
    };

    const handleDeleteSubject = async (id: string) => {
        setSaving(true);
        try {
            await api.delete(`/api/academic/subjects/${id}`);
            setDeleteModal(null);
            fetchGroups();
        } catch { setErr(t('Erreur lors de la suppression')); }
        finally { setSaving(false); }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-slate-900">{t('Cours & Matières')}</h2>
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">{t('Définition du programme académique')}</p>
                </div>
                <button onClick={() => { setGroupModal(true); setGroupName(''); setErr(''); }}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20">
                    <Layers size={18} /> {t('Nouveau Groupe')}
                </button>
            </div>

            {err && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <AlertCircle size={14} /> {err}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="animate-spin text-emerald-600" size={32} />
                </div>
            ) : groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                    <Layers size={40} className="text-slate-200" />
                    <p className="text-sm font-medium">{t('Aucun groupe de matières. Créez-en un pour commencer.')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {groups.map((group) => (
                        <motion.div key={group.id}
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">

                            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-emerald-600 shadow-sm">
                                        <Layers size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-900">{group.nom}</h3>
                                        <p className="text-xs text-slate-400">{group.matieres?.length ?? 0} {t('matière(s)')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => openCreateSubject(group.id)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-100 text-emerald-600 text-xs font-black rounded-xl hover:bg-emerald-50 transition-all uppercase tracking-tighter">
                                        <Plus size={13} /> {t('Ajouter une matière')}
                                    </button>
                                    <button onClick={() => setDeleteModal({ type: 'group', id: group.id, nom: group.nom })}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-4">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-left">
                                            <th className="px-4 py-3">{t('Code')}</th>
                                            <th className="px-4 py-3">{t('Matière')}</th>
                                            <th className="px-4 py-3">{t('Coefficient')}</th>
                                            <th className="px-4 py-3 text-right">{t('Actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {group.matieres?.map((sub) => (
                                            <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-4 py-4">
                                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold font-mono">{sub.code}</span>
                                                </td>
                                                <td className="px-4 py-4 text-sm font-black text-slate-700">{sub.nom}</td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-500">
                                                        <Hash size={13} className="text-emerald-400" /> {sub.coefficient}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => openEditSubject(sub)}
                                                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                            title="Modifier">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => setDeleteModal({ type: 'subject', id: sub.id, nom: sub.nom })}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Supprimer">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!group.matieres || group.matieres.length === 0) && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                                                    {t('Aucune matière — cliquez sur « Ajouter une matière ».')}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* ── Modal Groupe ── */}
            <AnimatePresence>
                {groupModal && (
                    <Modal title={t('Nouveau groupe de matières')} onClose={() => setGroupModal(false)}>
                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 ml-1">{t('Nom du groupe')}</label>
                                <input required className={`${INPUT} mt-1`}
                                    placeholder="Ex: Science Subjects"
                                    value={groupName}
                                    onChange={e => setGroupName(e.target.value)} />
                            </div>
                            {err && <p className="text-sm text-red-600">{err}</p>}
                            <ModalButtons onCancel={() => setGroupModal(false)} saving={saving} label={t('Créer')} />
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            {/* ── Modal Matière ── */}
            <AnimatePresence>
                {subjectModal && (
                    <Modal title={editSubject ? `${t('Modifier')} "${editSubject.nom}"` : t('Nouvelle matière')} onClose={() => setSubjectModal(false)}>
                        <form onSubmit={handleSaveSubject} className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1">
                                    <label className="text-xs font-bold uppercase text-slate-400 ml-1">{t('Code')}</label>
                                    <input required className={`${INPUT} mt-1 uppercase`}
                                        placeholder="MAT"
                                        value={subjectData.code}
                                        onChange={e => setSubjectData(s => ({ ...s, code: e.target.value.toUpperCase() }))} />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold uppercase text-slate-400 ml-1">{t('Libellé')}</label>
                                    <input required className={`${INPUT} mt-1`}
                                        placeholder="Mathematics"
                                        value={subjectData.nom}
                                        onChange={e => setSubjectData(s => ({ ...s, nom: e.target.value }))} />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 ml-1">{t('Coefficient par défaut')}</label>
                                <input type="number" required min="1" max="20" className={`${INPUT} mt-1`}
                                    value={subjectData.coefficient}
                                    onChange={e => setSubjectData(s => ({ ...s, coefficient: parseInt(e.target.value) || 1 }))} />
                                <p className="text-[10px] text-slate-400 mt-1 ml-1">{t('Ce coefficient peut être redéfini par classe dans « Affectations ».')}</p>
                            </div>
                            {err && <p className="text-sm text-red-600">{err}</p>}
                            <ModalButtons onCancel={() => setSubjectModal(false)} saving={saving} label={editSubject ? t('Enregistrer') : t('Créer')} />
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            {/* ── Modal Suppression ── */}
            <AnimatePresence>
                {deleteModal && (
                    <Modal title={t('Confirmer la suppression')} onClose={() => setDeleteModal(null)}>
                        <p className="text-sm text-slate-600 mb-6">
                            {t('Supprimer')} <span className="font-bold text-slate-900">"{deleteModal.nom}"</span> ?
                            {deleteModal.type === 'group' && ' ' + t('Toutes les matières du groupe seront également supprimées.')}
                            <br /><span className="text-red-600 text-xs mt-1 block">{t('Cette action est irréversible.')}</span>
                        </p>
                        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteModal(null)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">
                                {t('Annuler')}
                            </button>
                            <button onClick={() => deleteModal.type === 'group'
                                ? handleDeleteGroup(deleteModal.id)
                                : handleDeleteSubject(deleteModal.id)}
                                disabled={saving}
                                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2">
                                {saving && <Loader2 size={14} className="animate-spin" />} {t('Supprimer')}
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    );
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-8 rounded-[2rem] w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm shadow-emerald-600/25">
                            <Layers size={17} className="text-white" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900">{title}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
                        <X size={18} />
                    </button>
                </div>
                {children}
            </motion.div>
        </div>
    );
}

function ModalButtons({ onCancel, saving, label }: { onCancel: () => void; saving: boolean; label: string }) {
    return (
        <div className="flex gap-4 pt-2">
            <button type="button" onClick={onCancel}
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all">
                Annuler
            </button>
            <button type="submit" disabled={saving}
                className="flex-1 py-3.5 bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />} {label}
            </button>
        </div>
    );
}

export default SubjectManager;
