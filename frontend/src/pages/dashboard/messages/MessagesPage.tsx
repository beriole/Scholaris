import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Inbox, Loader2, X, Plus, Trash2, Reply,
    ChevronDown, AlertCircle, Search, Clock,
} from 'lucide-react';
import api from '../../../lib/api';
import { useI18n } from '../../../i18n/i18n';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserRef {
    id:    string;
    email: string;
    role:  string;
    profil_enseignant: { nom: string; prenom: string } | null;
}

interface Message {
    id:               string;
    sujet:            string;
    corps:            string;
    est_lu:           boolean;
    created_at:       string;
    expediteur:       UserRef;
    destinataire:     UserRef;
    reponses?:        Message[];
}

type Tab = 'inbox' | 'sent';

// ── Helpers ───────────────────────────────────────────────────────────────────

const displayName = (u: UserRef) =>
    u.profil_enseignant
        ? `${u.profil_enseignant.prenom} ${u.profil_enseignant.nom}`
        : u.email;

const roleLabel: Record<string, string> = {
    super_admin: 'Super admin',
    admin_ecole: 'Admin',
    enseignant:  'Enseignant',
};

const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
        return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
    const { t } = useI18n();
    const [tab,          setTab]          = useState<Tab>('inbox');
    const [messages,     setMessages]     = useState<Message[]>([]);
    const [selected,     setSelected]     = useState<Message | null>(null);
    const [loading,      setLoading]      = useState(false);
    const [unread,       setUnread]       = useState(0);
    const [search,       setSearch]       = useState('');
    const [showCompose,  setShowCompose]  = useState(false);
    const [contacts,     setContacts]     = useState<UserRef[]>([]);

    // Compose form
    const [composeForm,  setComposeForm]  = useState({ to: '', sujet: '', corps: '' });
    const [sending,      setSending]      = useState(false);
    const [sendErr,      setSendErr]      = useState('');

    // Reply form
    const [replyText,    setReplyText]    = useState('');
    const [replying,     setReplying]     = useState(false);

    const fetchMessages = async (t: Tab) => {
        setLoading(true);
        setSelected(null);
        try {
            const r = await api.get(`/api/messages/${t}`);
            setMessages(r.data.messages ?? []);
            if (t === 'inbox') setUnread(r.data.unreadCount ?? 0);
        } catch { setMessages([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchMessages(tab); }, [tab]);

    useEffect(() => {
        api.get('/api/messages/contacts').then(r => setContacts(r.data ?? [])).catch(() => {});
    }, []);

    const openMessage = async (msg: Message) => {
        if (!msg.reponses) {
            try {
                const r = await api.get(`/api/messages/${msg.id}`);
                setSelected(r.data);
                if (!msg.est_lu && tab === 'inbox') {
                    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, est_lu: true } : m));
                    setUnread(u => Math.max(0, u - 1));
                }
            } catch { setSelected(msg); }
        } else {
            setSelected(msg);
        }
        setReplyText('');
    };

    const handleSend = async () => {
        if (!composeForm.to || !composeForm.sujet || !composeForm.corps) {
            setSendErr(t('Destinataire, sujet et message requis.'));
            return;
        }
        setSending(true);
        setSendErr('');
        try {
            await api.post('/api/messages', {
                destinataire_id: composeForm.to,
                sujet:           composeForm.sujet,
                corps:           composeForm.corps,
            });
            setShowCompose(false);
            setComposeForm({ to: '', sujet: '', corps: '' });
            if (tab === 'sent') fetchMessages('sent');
        } catch (err: any) {
            setSendErr(err?.response?.data?.error ?? t('Erreur.'));
        } finally { setSending(false); }
    };

    const handleReply = async () => {
        if (!selected || !replyText.trim()) return;
        setReplying(true);
        try {
            await api.post('/api/messages', {
                destinataire_id:  selected.expediteur.id === (selected.destinataire.id) ? selected.destinataire.id : selected.expediteur.id,
                sujet:            `Re: ${selected.sujet}`,
                corps:            replyText,
                message_parent_id: selected.id,
            });
            // Refresh thread
            const r = await api.get(`/api/messages/${selected.id}`);
            setSelected(r.data);
            setReplyText('');
        } catch { }
        finally { setReplying(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('Supprimer ce message ?'))) return;
        try {
            await api.delete(`/api/messages/${id}`);
            setMessages(prev => prev.filter(m => m.id !== id));
            if (selected?.id === id) setSelected(null);
        } catch { }
    };

    const filtered = messages.filter(m =>
        m.sujet.toLowerCase().includes(search.toLowerCase()) ||
        displayName(m.expediteur).toLowerCase().includes(search.toLowerCase()) ||
        displayName(m.destinataire).toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
            {/* En-tête */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('Messagerie')}</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{t('Communication interne')}</p>
                </div>
                <button onClick={() => { setShowCompose(true); setSendErr(''); }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700">
                    <Plus size={15} /> {t('Nouveau message')}
                </button>
            </div>

            <div className="flex flex-1 min-h-0 gap-4">
                {/* Panneau gauche */}
                <div className="w-64 shrink-0 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden">
                    {/* Onglets */}
                    <div className="p-3 border-b border-slate-100 space-y-0.5">
                        <SideBtn active={tab === 'inbox'} onClick={() => setTab('inbox')}
                            icon={<Inbox size={15} />}
                            label={t('Boîte de réception')}
                            badge={unread > 0 ? unread : undefined} />
                        <SideBtn active={tab === 'sent'} onClick={() => setTab('sent')}
                            icon={<Send size={15} />}
                            label={t('Envoyés')} />
                    </div>

                    {/* Recherche */}
                    <div className="px-3 py-2 border-b border-slate-100">
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)}
                                placeholder={t('Rechercher…')}
                                className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500 outline-none" />
                        </div>
                    </div>

                    {/* Liste messages */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 size={20} className="animate-spin text-emerald-600" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400">
                                {search ? t('Aucun résultat') : t('Aucun message')}
                            </div>
                        ) : (
                            filtered.map(m => (
                                <button key={m.id} onClick={() => openMessage(m)}
                                    className={`w-full text-left px-3 py-3 hover:bg-slate-50 transition-all ${selected?.id === m.id ? 'bg-emerald-50/60 border-l-2 border-emerald-500' : ''}`}>
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className={`text-xs truncate ${tab === 'inbox' && !m.est_lu ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                                            {tab === 'inbox' ? displayName(m.expediteur) : displayName(m.destinataire)}
                                        </span>
                                        <span className="text-[10px] text-slate-400 shrink-0">{fmtDate(m.created_at)}</span>
                                    </div>
                                    <p className={`text-xs truncate ${tab === 'inbox' && !m.est_lu ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                                        {m.sujet}
                                    </p>
                                    {tab === 'inbox' && !m.est_lu && (
                                        <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Panneau détail */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden min-w-0">
                    {!selected ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <Inbox size={40} className="text-slate-200" />
                            <p className="text-sm">{t('Sélectionnez un message')}</p>
                        </div>
                    ) : (
                        <>
                            {/* Header message */}
                            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <h2 className="text-base font-bold text-slate-900 truncate">{selected.sujet}</h2>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-500">
                                        <span>{t('De :')} <span className="font-semibold text-slate-700">{displayName(selected.expediteur)}</span>
                                            <span className="ml-1 text-slate-400">({t(roleLabel[selected.expediteur.role] ?? selected.expediteur.role)})</span>
                                        </span>
                                        <span>{t('À :')} <span className="font-semibold text-slate-700">{displayName(selected.destinataire)}</span></span>
                                        <span className="flex items-center gap-1 text-slate-400">
                                            <Clock size={11} /> {new Date(selected.created_at).toLocaleString('fr-FR')}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(selected.id)}
                                    className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all shrink-0">
                                    <Trash2 size={15} />
                                </button>
                            </div>

                            {/* Corps + réponses */}
                            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                                <MessageBubble msg={selected} isFirst />
                                {(selected.reponses ?? []).map(r => (
                                    <MessageBubble key={r.id} msg={r} />
                                ))}
                            </div>

                            {/* Zone de réponse */}
                            <div className="border-t border-slate-100 px-4 py-3">
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 relative">
                                        <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                                            rows={2}
                                            placeholder={t('Écrire une réponse…')}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <button onClick={handleReply}
                                        disabled={replying || !replyText.trim()}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 shrink-0">
                                        {replying ? <Loader2 size={14} className="animate-spin" /> : <Reply size={14} />}
                                        {t('Répondre')}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Modale composition ───────────────────────────────────────── */}
            <AnimatePresence>
                {showCompose && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
                        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-slate-800">{t('Nouveau message')}</h2>
                                <button onClick={() => setShowCompose(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                                    <X size={16} />
                                </button>
                            </div>

                            {sendErr && (
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    <AlertCircle size={14} className="shrink-0" /> {sendErr}
                                </div>
                            )}

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">{t('Destinataire *')}</label>
                                    <div className="relative">
                                        <select value={composeForm.to} onChange={e => setComposeForm(f => ({ ...f, to: e.target.value }))}
                                            className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                                            <option value="">{t('-- Choisir un destinataire --')}</option>
                                            {contacts.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {displayName(c)} ({t(roleLabel[c.role] ?? c.role)})
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">{t('Sujet *')}</label>
                                    <input value={composeForm.sujet} onChange={e => setComposeForm(f => ({ ...f, sujet: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">{t('Message *')}</label>
                                    <textarea value={composeForm.corps} onChange={e => setComposeForm(f => ({ ...f, corps: e.target.value }))}
                                        rows={5} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setShowCompose(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
                                    {t('Annuler')}
                                </button>
                                <button onClick={handleSend} disabled={sending}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                                    {sending && <Loader2 size={13} className="animate-spin" />}
                                    <Send size={13} /> {t('Envoyer')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function SideBtn({ active, onClick, icon, label, badge }: {
    active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number;
}) {
    return (
        <button onClick={onClick}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
            {icon} <span className="flex-1 text-left">{label}</span>
            {badge !== undefined && (
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {badge}
                </span>
            )}
        </button>
    );
}

function MessageBubble({ msg, isFirst = false }: { msg: Message; isFirst?: boolean }) {
    const { t } = useI18n();
    return (
        <div className={`flex gap-3 ${isFirst ? '' : 'pl-4 border-l-2 border-slate-100'}`}>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                {displayName(msg.expediteur)[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-slate-800">{displayName(msg.expediteur)}</span>
                    <span className="text-xs text-slate-400 font-medium">{t(roleLabel[msg.expediteur.role] ?? msg.expediteur.role)}</span>
                    <span className="text-xs text-slate-400 ml-auto">{fmtDate(msg.created_at)}</span>
                </div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {msg.corps}
                </div>
            </div>
        </div>
    );
}
