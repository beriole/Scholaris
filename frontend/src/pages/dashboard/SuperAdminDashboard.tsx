import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users, School, CreditCard, TrendingUp, Plus, Search,
    MoreVertical, LogOut, BookOpen, Settings, Bell, ChevronDown
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import AddTenantModal from '../../components/modals/AddTenantModal';
import { useI18n } from '../../i18n/i18n';

const SuperAdminDashboard = () => {
    const { user, logout } = useAuth();
    const { t } = useI18n();
    const [statsData, setStatsData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [search, setSearch] = useState('');

    const fetchStats = async () => {
        try {
            const res = await api.get('/api/tenants/stats');
            setStatsData(res.data);
        } catch {
            // stats non critiques
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);

    const tenants: any[] = statsData?.recentTenants || [];
    const filtered = tenants.filter((t) =>
        t.nom?.toLowerCase().includes(search.toLowerCase()) ||
        t.sous_domaine?.toLowerCase().includes(search.toLowerCase())
    );

    const STATS = [
        {
            label: 'Établissements',
            value: statsData?.totalTenants ?? '—',
            icon: <School className="w-4 h-4" />,
            delta: null,
            color: 'text-blue-600 bg-blue-50',
        },
        {
            label: 'Utilisateurs',
            value: statsData?.totalUsers ?? '—',
            icon: <Users className="w-4 h-4" />,
            delta: null,
            color: 'text-emerald-600 bg-emerald-50',
        },
        {
            label: 'Revenus (XAF)',
            value: statsData?.totalRevenue ? Number(statsData.totalRevenue).toLocaleString('fr-FR') : '—',
            icon: <CreditCard className="w-4 h-4" />,
            delta: null,
            color: 'text-violet-600 bg-violet-50',
        },
        {
            label: 'Rétention',
            value: '100%',
            icon: <TrendingUp className="w-4 h-4" />,
            delta: null,
            color: 'text-amber-600 bg-amber-50',
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">

            {/* ── Top Bar ────────────────────────────────────────────────────── */}
            <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-bold text-sm text-slate-900">Scholaris</span>
                    <span className="text-slate-300 text-xs font-medium ml-1 px-2 py-0.5 rounded-full bg-slate-100">{t('Super Admin')}</span>
                </div>

                <div className="flex items-center gap-3">
                    <button className="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                        <Bell className="w-4 h-4" />
                    </button>
                    <button className="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                        <Settings className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-slate-200 mx-1" />
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        {t('Déconnexion')}
                    </button>
                </div>
            </header>

            {/* ── Content ────────────────────────────────────────────────────── */}
            <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">

                {/* Page header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{t("Vue d'ensemble")}</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {t('Bienvenue,')} <span className="font-semibold">{user?.email.split('@')[0]}</span> {t('— plateforme Scholaris')}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> {t('Nouvel établissement')}
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {STATS.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="bg-white rounded-xl border border-slate-200 p-5"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                                    {stat.icon}
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-slate-900 mb-0.5">
                                {loading ? <span className="inline-block w-12 h-5 bg-slate-100 rounded animate-pulse" /> : stat.value}
                            </p>
                            <p className="text-xs font-medium text-slate-500">{t(stat.label)}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Tenants Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h2 className="text-sm font-semibold text-slate-900">{t('Établissements')}</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder={t('Rechercher...')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all w-52"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 flex flex-col items-center justify-center gap-3">
                            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-slate-400">{t('Chargement...')}</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-16 text-center">
                            <School className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm font-medium text-slate-400">
                                {search ? t('Aucun résultat pour cette recherche.') : t('Aucun établissement pour le moment.')}
                            </p>
                            {!search && (
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                                >
                                    <Plus className="w-3.5 h-3.5" /> {t('Créer le premier établissement')}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/60">
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Établissement')}</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Sous-domaine')}</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Plan')}</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Statut')}</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Utilisateurs')}</th>
                                        <th className="px-6 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map((tenant) => (
                                        <tr key={tenant.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
                                                        {tenant.nom?.charAt(0)?.toUpperCase() ?? '?'}
                                                    </div>
                                                    <span className="font-semibold text-slate-900">{tenant.nom}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs text-slate-500">{tenant.sous_domaine}.scholaris.cm</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <PlanBadge plan={tenant.plan_abonnement} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={tenant.statut} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-slate-600">{tenant.userCount ?? 0}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            <AddTenantModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchStats}
            />
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const { t } = useI18n();
    const map: Record<string, string> = {
        actif: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        suspendu: 'bg-red-50 text-red-600 border border-red-200',
        expire: 'bg-slate-100 text-slate-500 border border-slate-200',
    };
    const labels: Record<string, string> = { actif: 'Actif', suspendu: 'Suspendu', expire: 'Expiré' };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] ?? map.expire}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'actif' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {t(labels[status] ?? status)}
        </span>
    );
};

const PlanBadge = ({ plan }: { plan: string }) => {
    const map: Record<string, string> = {
        gratuit: 'bg-slate-100 text-slate-500',
        standard: 'bg-blue-50 text-blue-600',
        premium: 'bg-violet-50 text-violet-600',
        enterprise: 'bg-amber-50 text-amber-700',
    };
    return (
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${map[plan] ?? map.gratuit}`}>
            {plan}
        </span>
    );
};

export default SuperAdminDashboard;
