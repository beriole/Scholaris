import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, Loader2 } from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n/i18n';

const SchoolYearManager = () => {
    const { user } = useAuth();
    const { t } = useI18n();
    const [years, setYears] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        libelle: '',
        date_debut: '',
        date_fin: '',
        est_active: false
    });

    const fetchYears = async () => {
        if (!user?.tenant_id) return;
        try {
            const response = await api.get(`/api/academic/years/${user.tenant_id}`);
            setYears(response.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchYears();
    }, [user]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/api/academic/years', {
                ...formData,
                ecole_id: user?.tenant_id
            });
            setIsModalOpen(false);
            fetchYears();
        } catch (err) {
            alert(t('Erreur lors de la création'));
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-slate-900">{t('Années Scolaires')}</h2>
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">{t('Gestion du cycle de vie académique')}</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
                >
                    <Plus size={18} /> {t('Nouvelle Année')}
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="animate-spin text-emerald-600" size={32} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {years.map((year) => (
                        <motion.div
                            key={year.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`bg-white p-8 rounded-[2.5rem] border ${year.est_active ? 'border-emerald-500 shadow-xl shadow-emerald-500/5' : 'border-slate-100 shadow-sm'} relative overflow-hidden`}
                        >
                            {year.est_active && (
                                <div className="absolute top-0 right-0 px-4 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-2xl">
                                    {t('Active')}
                                </div>
                            )}
                            <Calendar className={`${year.est_active ? 'text-emerald-600' : 'text-slate-400'} mb-4`} size={32} />
                            <h3 className="text-2xl font-black text-slate-900 mb-2">{year.libelle}</h3>
                            <div className="flex flex-col text-sm text-slate-500 font-bold">
                                <span>{t('Du')} {new Date(year.date_debut).toLocaleDateString()}</span>
                                <span>{t('Au')} {new Date(year.date_fin).toLocaleDateString()}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal de création (Simplifié pour la démo) */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.form
                            onSubmit={handleCreate}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl"
                        >
                            <h2 className="text-2xl font-black text-slate-900 mb-6">{t('Ajouter une année')}</h2>
                            <div className="space-y-4">
                                <input
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-bold"
                                    placeholder="Ex: 2026-2027"
                                    value={formData.libelle}
                                    onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="date"
                                        className="px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm"
                                        value={formData.date_debut}
                                        onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                                    />
                                    <input
                                        type="date"
                                        className="px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm"
                                        value={formData.date_fin}
                                        onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                                    />
                                </div>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.est_active}
                                        onChange={(e) => setFormData({ ...formData, est_active: e.target.checked })}
                                        className="w-5 h-5 accent-emerald-600"
                                    />
                                    <span className="text-sm font-bold text-slate-600">{t('Définir comme active')}</span>
                                </label>
                            </div>
                            <div className="flex gap-4 mt-8">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl">{t('Annuler')}</button>
                                <button type="submit" className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/20">{t('Créer')}</button>
                            </div>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SchoolYearManager;
