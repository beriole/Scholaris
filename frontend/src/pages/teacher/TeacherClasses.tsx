import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardList, UserCheck, BookOpen, Hash } from 'lucide-react';
import { useTeacher } from './TeacherLayout';

export default function TeacherClasses() {
    const { affectations } = useTeacher();
    const navigate = useNavigate();

    // Regrouper par classe
    const byClasse = affectations.reduce<Record<string, { nom: string; niveau: string; id: string; items: typeof affectations }>>((acc, a) => {
        if (!acc[a.classe.id]) acc[a.classe.id] = { nom: a.classe.nom, niveau: a.classe.niveau, id: a.classe.id, items: [] };
        acc[a.classe.id].items.push(a);
        return acc;
    }, {});
    const groups = Object.values(byClasse);

    return (
        <div className="space-y-6 max-w-6xl">
            <div>
                <h1 className="text-xl font-black text-slate-900">Mes classes & matières</h1>
                <p className="text-sm text-slate-400 mt-0.5">Saisissez les notes ou faites l'appel pour chacun de vos cours.</p>
            </div>

            {groups.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center">
                    <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">Aucune affectation. L'administration doit vous affecter à des matières.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-5">
                    {groups.map((g, gi) => (
                        <motion.div key={g.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 }}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                                <p className="font-black text-base">{g.nom}</p>
                                <p className="text-xs text-slate-300">{g.niveau} · {g.items.length} matière(s)</p>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {g.items.map(a => (
                                    <div key={a.id} className="flex items-center gap-3 px-5 py-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
                                            {a.matiere.code}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{a.matiere.nom}</p>
                                            <p className="text-xs text-slate-400 flex items-center gap-1">
                                                <Hash className="w-3 h-3" /> coef. {a.coefficient ?? a.matiere.coefficient}
                                            </p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-1.5">
                                            <button onClick={() => navigate(`/prof/grades?classe_id=${a.classe.id}&matiere_id=${a.matiere.id}`)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-all">
                                                <ClipboardList className="w-3.5 h-3.5" /> Notes
                                            </button>
                                            <button onClick={() => navigate(`/prof/attendance?classe_id=${a.classe.id}&matiere_id=${a.matiere.id}`)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-all">
                                                <UserCheck className="w-3.5 h-3.5" /> Appel
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
