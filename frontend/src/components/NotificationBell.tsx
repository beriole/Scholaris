import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

interface Notif {
    id:         string;
    type:       string;
    titre:      string;
    contenu:    string;
    est_lue:    boolean;
    created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
    message:         '💬',
    bulletin_publie: '📄',
    absence:         '⚠️',
    note:            '📝',
    annonce:         '📣',
};

const fmtAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'à l\'instant';
    if (m < 60) return `il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `il y a ${h}h`;
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

export default function NotificationBell() {
    const [open,    setOpen]    = useState(false);
    const [notifs,  setNotifs]  = useState<Notif[]>([]);
    const [unread,  setUnread]  = useState(0);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const fetchNotifs = async () => {
        setLoading(true);
        try {
            const r = await api.get('/api/notifications?limit=15');
            setNotifs(r.data.notifications ?? []);
            setUnread(r.data.unreadCount   ?? 0);
        } catch {}
        finally { setLoading(false); }
    };

    // Polling léger toutes les 30 sec
    useEffect(() => {
        fetchNotifs();
        const id = setInterval(fetchNotifs, 30000);
        return () => clearInterval(id);
    }, []);

    // Fermer au clic extérieur
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const markOne = async (id: string) => {
        try {
            await api.put(`/api/notifications/${id}/read`);
            setNotifs(prev => prev.map(n => n.id === id ? { ...n, est_lue: true } : n));
            setUnread(u => Math.max(0, u - 1));
        } catch {}
    };

    const markAll = async () => {
        try {
            await api.put('/api/notifications/read-all');
            setNotifs(prev => prev.map(n => ({ ...n, est_lue: true })));
            setUnread(0);
        } catch {}
    };

    return (
        <div className="relative" ref={ref}>
            <button onClick={() => { setOpen(o => !o); if (!open) fetchNotifs(); }}
                className="relative p-2 rounded-lg hover:bg-slate-100 transition-all text-slate-500 hover:text-slate-700">
                <Bell size={18} />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -8 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                            <span className="text-sm font-bold text-slate-800">Notifications</span>
                            <div className="flex items-center gap-1">
                                {unread > 0 && (
                                    <button onClick={markAll} title="Tout marquer comme lu"
                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                                        <CheckCheck size={14} />
                                    </button>
                                )}
                                <button onClick={() => setOpen(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Liste */}
                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                            {loading && notifs.length === 0 ? (
                                <div className="py-8 flex justify-center text-slate-400 text-sm">Chargement…</div>
                            ) : notifs.length === 0 ? (
                                <div className="py-8 flex flex-col items-center gap-2 text-slate-400">
                                    <BellOff size={24} className="text-slate-300" />
                                    <span className="text-sm">Aucune notification</span>
                                </div>
                            ) : (
                                notifs.map(n => (
                                    <div key={n.id}
                                        className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-all ${!n.est_lue ? 'bg-emerald-50/40' : ''}`}>
                                        <span className="text-base mt-0.5">{TYPE_ICONS[n.type] ?? '🔔'}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs leading-snug truncate ${!n.est_lue ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                                                {n.titre}
                                            </p>
                                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{n.contenu}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">{fmtAgo(n.created_at)}</p>
                                        </div>
                                        {!n.est_lue && (
                                            <button onClick={() => markOne(n.id)} title="Marquer comme lu"
                                                className="p-1 text-slate-300 hover:text-emerald-500 shrink-0 rounded">
                                                <Check size={13} />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {notifs.length > 0 && (
                            <div className="px-4 py-2.5 border-t border-slate-100 text-center">
                                <span className="text-xs text-slate-400">{unread > 0 ? `${unread} non lue(s)` : 'Tout est lu'}</span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
