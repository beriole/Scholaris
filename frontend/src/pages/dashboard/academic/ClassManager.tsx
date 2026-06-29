import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Plus, Users, Wallet, Loader2, X } from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

const ClassManager = () => {
    const { user } = useAuth();
    const [classes, setClasses] = useState<any[]>([]);
    const [years, setYears] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        nom: '',
        niveau: 'Lycée',
        serie: '',
        capacite_max: 40,
        frais_scolarite_xaf: 50000
    });

    const fetchData = async () => {
        if (!user?.tenant_id) return;
        try {
            // Fetch Years first to have a context
            const yearsRes = await api.get(`/api/academic/years/${user.tenant_id}`);
            setYears(yearsRes.data);

            const activeYear = yearsRes.data.find((y: any) => y.est_active);
            if (activeYear) {
                setSelectedYear(activeYear.id);
                const classesRes = await api.get(`/api/academic/classes/${activeYear.id}`);
                setClasses(classesRes.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleYearChange = async (yearId: string) => {
        setSelectedYear(yearId);
        setLoading(true);
        try {
            const res = await api.get(`/api/academic/classes/${yearId}`);
            setClasses(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedYear) return alert('Veuillez sélectionner une année');

        try {
            await api.post('/api/academic/classes', {
                ...formData,
                ecole_id: user?.tenant_id,
                annee_id: selectedYear
            });
            setIsModalOpen(false);
            handleYearChange(selectedYear);
        } catch (err) {
            alert('Erreur creation');
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-xl font-black text-slate-900">Gestion des Classes</h2>
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Configuration des niveaux et frais</p>
                </div>

                <div className="flex items-center gap-4">
                    <select
                        value={selectedYear}
                        onChange={(e) => handleYearChange(e.target.value)}
                        className="px-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 shadow-sm"
                    >
                        {years.map(y => (
                            <option key={y.id} value={y.id}>{y.libelle} {y.est_active ? '(Active)' : ''}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
                    >
                        <Plus size={18} /> Nouvelle Classe
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="animate-spin text-emerald-600" size={32} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((cls) => (
                        <motion.div
                            key={cls.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl hover:shadow-slate-200/50 transition-all"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                    <Layers size={24} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                                    {cls.niveau}
                                </span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-1">{cls.nom}</h3>
                            <p className="text-sm font-bold text-slate-400 mb-6">{cls.serie || 'Tronc commun'}</p>

                            <div className="space-y-3 pt-6 border-t border-slate-50">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-medium">Capacité</span>
                                    <span className="font-bold text-slate-700 flex items-center gap-1"><Users size={14} /> {cls.capacite_max}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-medium">Frais Scolaires</span>
                                    <span className="font-bold text-emerald-600 flex items-center gap-1"><Wallet size={14} /> {cls.frais_scolarite_xaf?.toLocaleString()} XAF</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {classes.length === 0 && !loading && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                            <Layers size={48} className="text-slate-200 mb-4" />
                            <p className="text-slate-400 font-bold">Aucune classe pour cette année.</p>
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.form
                            onSubmit={handleCreate}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-10 rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-slate-900 leading-tight">Ajouter une classe</h2>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-400 ml-1">Nom de la classe</label>
                                    <input
                                        required
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-bold"
                                        placeholder="Ex: Terminale C2"
                                        value={formData.nom}
                                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-slate-400 ml-1">Niveau</label>
                                        <select
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-bold"
                                            value={formData.niveau}
                                            onChange={(e) => setFormData({ ...formData, niveau: e.target.value })}
                                        >
                                            <option>Maternelle</option>
                                            <option>Primaire</option>
                                            <option>Collège</option>
                                            <option>Lycée</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-slate-400 ml-1">Série / Spéc.</label>
                                        <input
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-bold"
                                            placeholder="Ex: TI, C, D"
                                            value={formData.serie}
                                            onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-slate-400 ml-1">Capacité</label>
                                        <input
                                            type="number"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-bold"
                                            value={formData.capacite_max}
                                            onChange={(e) => setFormData({ ...formData, capacite_max: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-slate-400 ml-1">Scolarité (XAF)</label>
                                        <input
                                            type="number"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-bold"
                                            value={formData.frais_scolarite_xaf}
                                            onChange={(e) => setFormData({ ...formData, frais_scolarite_xaf: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl mt-10 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">
                                Créer la classe
                            </button>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ClassManager;
