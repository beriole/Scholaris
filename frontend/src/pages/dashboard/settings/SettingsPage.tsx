import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    School, User, Lock, Save, Loader2, CheckCircle2, AlertCircle,
    Building2, MapPin, Phone, Globe, ChevronDown, Calendar, Upload, X,
} from 'lucide-react';
import api from '../../../lib/api';
import { uploadImageFile } from '../../../lib/uploadImage';
import { useI18n } from '../../../i18n/i18n';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EcoleData {
    id:                string;
    nom:               string;
    code:              string;
    adresse:           string | null;
    ville:             string | null;
    region:            string | null;
    telephone:         string | null;
    logo_url:          string | null;
    systeme_notation:  string;
    annee_active:      { id: string; libelle: string } | null;
}

interface TenantData {
    nom:              string;
    sous_domaine:     string;
    plan_abonnement:  string;
    devise:           string;
    date_expiration:  string | null;
}

interface ProfileData {
    id:                string;
    email:             string;
    role:              string;
    langue_preference: string;
    nom:               string | null;
    prenom:            string | null;
    telephone:         string | null;
    created_at:        string;
}

interface Year { id: string; libelle: string; est_active: boolean; }

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
    const { t } = useI18n();
    const [tab, setTab] = useState<'school' | 'profile' | 'password'>('school');

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">{t('Paramètres')}</h1>
                <p className="text-slate-500 text-sm mt-1">{t('Configuration de votre établissement et de votre compte')}</p>
            </div>

            {/* Onglets */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {[
                    { key: 'school',   label: 'Établissement', icon: School },
                    { key: 'profile',  label: 'Mon profil',     icon: User },
                    { key: 'password', label: 'Sécurité',       icon: Lock },
                ].map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setTab(key as typeof tab)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Icon size={14} /> {t(label)}
                    </button>
                ))}
            </div>

            {tab === 'school'   && <SchoolTab />}
            {tab === 'profile'  && <ProfileTab />}
            {tab === 'password' && <PasswordTab />}
        </div>
    );
}

// ── Onglet Établissement ──────────────────────────────────────────────────────

function SchoolTab() {
    const { t } = useI18n();
    const [ecole,   setEcole]   = useState<EcoleData | null>(null);
    const [tenant,  setTenant]  = useState<TenantData | null>(null);
    const [years,   setYears]   = useState<Year[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving,  setSaving]  = useState(false);
    const [msg,     setMsg]     = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    const [form, setForm] = useState({
        nom: '', adresse: '', ville: '', region: '', telephone: '', logo_url: '', systeme_notation: 'sur_20',
    });
    const [activeYear,    setActiveYear]    = useState('');
    const [savingYear,    setSavingYear]    = useState(false);
    const [yearMsg,       setYearMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [logoUploading, setLogoUploading] = useState(false);

    const handleLogoFile = async (file?: File) => {
        if (!file) return;
        setLogoUploading(true); setMsg(null);
        try {
            const url = await uploadImageFile(file, 'logo');
            setForm(f => ({ ...f, logo_url: url }));
            await api.put('/api/settings/school', { logo_url: url });
            setMsg({ type: 'ok', text: t('Logo mis à jour.') });
        } catch (e: any) {
            setMsg({ type: 'err', text: e?.response?.data?.error ?? e?.message ?? t('Erreur lors de l\'upload du logo.') });
        } finally { setLogoUploading(false); }
    };

    useEffect(() => {
        api.get('/api/settings/school')
            .then(r => {
                const e: EcoleData  = r.data.ecole;
                const t: TenantData = r.data.tenant;
                setEcole(e);
                setTenant(t);
                setForm({
                    nom:              e.nom              ?? '',
                    adresse:          e.adresse          ?? '',
                    ville:            e.ville            ?? '',
                    region:           e.region           ?? '',
                    telephone:        e.telephone        ?? '',
                    logo_url:         e.logo_url         ?? '',
                    systeme_notation: e.systeme_notation,
                });
                setActiveYear(e.annee_active?.id ?? '');
                return api.get(`/api/academic/years/${e.id}`);
            })
            .then(r => setYears(r.data ?? []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMsg(null);
        try {
            await api.put('/api/settings/school', form);
            setMsg({ type: 'ok', text: t('Informations enregistrées.') });
        } catch (err: any) {
            setMsg({ type: 'err', text: err?.response?.data?.error ?? t('Erreur.') });
        } finally {
            setSaving(false);
        }
    };

    const handleSetYear = async () => {
        if (!activeYear) return;
        setSavingYear(true);
        setYearMsg(null);
        try {
            const r = await api.put('/api/settings/active-year', { annee_id: activeYear });
            setYearMsg({ type: 'ok', text: r.data.message });
        } catch (err: any) {
            setYearMsg({ type: 'err', text: err?.response?.data?.error ?? t('Erreur.') });
        } finally {
            setSavingYear(false);
        }
    };

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" size={24} /></div>;

    return (
        <div className="space-y-5">
            {/* Infos tenant (lecture seule) */}
            {tenant && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                    <InfoRow label={t('Domaine')}  value={tenant.sous_domaine} />
                    <InfoRow label={t('Plan')}     value={<PlanBadge plan={tenant.plan_abonnement} />} />
                    <InfoRow label={t('Devise')}   value={tenant.devise} />
                    {tenant.date_expiration && (
                        <InfoRow label={t('Expiration')} value={new Date(tenant.date_expiration).toLocaleDateString('fr-FR')} />
                    )}
                </div>
            )}

            {/* Année active */}
            <Card title={t('Année scolaire active')} icon={<Calendar size={16} />}>
                {yearMsg && <Feedback msg={yearMsg} />}
                <div className="flex gap-3 items-end">
                    <div className="flex-1">
                        <label className="text-xs font-medium text-slate-500 mb-1 block">{t('Année courante')}</label>
                        <div className="relative">
                            <select value={activeYear} onChange={e => setActiveYear(e.target.value)}
                                className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                                <option value="">{t('-- Choisir une année --')}</option>
                                {years.map(y => <option key={y.id} value={y.id}>{y.libelle}{y.est_active ? ' ✓' : ''}</option>)}
                            </select>
                            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <button onClick={handleSetYear} disabled={savingYear || !activeYear}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                        {savingYear ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {t('Appliquer')}
                    </button>
                </div>
            </Card>

            {/* Infos école */}
            <Card title={t("Informations de l'établissement")} icon={<Building2 size={16} />}>
                {msg && <Feedback msg={msg} />}
                <div className="grid grid-cols-2 gap-4">
                    <Field label={t("Nom de l'établissement *")} className="col-span-2">
                        <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                            className="input-field" placeholder="Lycée de la Réussite" />
                    </Field>
                    <Field label={t('Téléphone')}>
                        <input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                            className="input-field" placeholder="+237 6 XX XX XX XX" />
                    </Field>
                    <Field label={t('Système de notation')}>
                        <div className="relative">
                            <select value={form.systeme_notation} onChange={e => setForm(f => ({ ...f, systeme_notation: e.target.value }))}
                                className="input-field appearance-none pr-8">
                                <option value="sur_20">{t('Sur 20')}</option>
                                <option value="sur_10">{t('Sur 10')}</option>
                            </select>
                            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </Field>
                    <Field label={t('Adresse')} className="col-span-2">
                        <input value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                            className="input-field" placeholder="BP 123, Avenue de l'École" />
                    </Field>
                    <Field label={t('Ville')}>
                        <input value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                            className="input-field" placeholder="Yaoundé" />
                    </Field>
                    <Field label={t('Région')}>
                        <input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                            className="input-field" placeholder="Centre" />
                    </Field>
                    <Field label={t("Logo de l'établissement")} className="col-span-2">
                        <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                {form.logo_url
                                    ? <img src={form.logo_url} alt="logo" className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    : <School size={22} className="text-slate-300" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap gap-2">
                                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 cursor-pointer transition-all">
                                        {logoUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                        {form.logo_url ? t('Changer') : t('Téléverser un logo')}
                                        <input type="file" accept="image/*" className="hidden" disabled={logoUploading}
                                            onChange={e => handleLogoFile(e.target.files?.[0])} />
                                    </label>
                                    {form.logo_url && (
                                        <button type="button" onClick={() => { setForm(f => ({ ...f, logo_url: '' })); api.put('/api/settings/school', { logo_url: '' }); }}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-500 text-sm font-semibold rounded-lg hover:bg-red-50 hover:text-red-600 transition-all">
                                            <X size={14} /> {t('Retirer')}
                                        </button>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1.5">{t('PNG, JPG ou WebP · max 4 Mo · apparaît sur les bulletins.')}</p>
                            </div>
                        </div>
                    </Field>
                </div>

                <div className="flex justify-end pt-2">
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-60">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {t('Enregistrer')}
                    </button>
                </div>
            </Card>
        </div>
    );
}

// ── Onglet Profil ─────────────────────────────────────────────────────────────

function ProfileTab() {
    const { t } = useI18n();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving,  setSaving]  = useState(false);
    const [msg,     setMsg]     = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [langue, setLangue] = useState('fr');

    useEffect(() => {
        api.get('/api/settings/profile').then(r => {
            setProfile(r.data);
            setLangue(r.data.langue_preference ?? 'fr');
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMsg(null);
        try {
            await api.put('/api/settings/profile', { langue_preference: langue });
            setMsg({ type: 'ok', text: t('Profil mis à jour.') });
        } catch (err: any) {
            setMsg({ type: 'err', text: err?.response?.data?.error ?? t('Erreur.') });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" size={24} /></div>;

    const roleLabel: Record<string, string> = {
        super_admin: t('Super administrateur'),
        admin_ecole: t('Administrateur école'),
        enseignant:  t('Enseignant'),
    };

    return (
        <Card title={t('Mon profil')} icon={<User size={16} />}>
            {msg && <Feedback msg={msg} />}

            {/* Avatar & infos */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xl">
                    {(profile?.email?.[0] ?? '?').toUpperCase()}
                </div>
                <div>
                    {(profile?.prenom || profile?.nom) && (
                        <p className="font-semibold text-slate-800">{profile.prenom} {profile.nom}</p>
                    )}
                    <p className="text-xs text-slate-400">{profile?.email}</p>
                    <span className="mt-1 inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {roleLabel[profile?.role ?? ''] ?? profile?.role}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Field label={t('Email')} className="col-span-2">
                    <input value={profile?.email ?? ''} disabled className="input-field opacity-60 cursor-not-allowed" />
                </Field>
                <Field label={t("Langue d'interface")} className="col-span-2">
                    <div className="relative">
                        <select value={langue} onChange={e => setLangue(e.target.value)}
                            className="input-field appearance-none pr-8">
                            <option value="fr">Français</option>
                            <option value="en">English</option>
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </Field>
                {profile?.created_at && (
                    <Field label={t('Membre depuis')} className="col-span-2">
                        <input value={new Date(profile.created_at).toLocaleDateString('fr-FR')} disabled className="input-field opacity-60 cursor-not-allowed" />
                    </Field>
                )}
            </div>

            <div className="flex justify-end pt-2">
                <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-60">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
                </button>
            </div>
        </Card>
    );
}

// ── Onglet Sécurité ───────────────────────────────────────────────────────────

function PasswordTab() {
    const { t } = useI18n();
    const [form,   setForm]   = useState({ current: '', next: '', confirm: '' });
    const [saving, setSaving] = useState(false);
    const [msg,    setMsg]    = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    const handleSave = async () => {
        if (form.next !== form.confirm) {
            setMsg({ type: 'err', text: t('Les deux nouveaux mots de passe ne correspondent pas.') });
            return;
        }
        setSaving(true);
        setMsg(null);
        try {
            const r = await api.put('/api/settings/password', {
                current_password: form.current,
                new_password:     form.next,
            });
            setMsg({ type: 'ok', text: r.data.message });
            setForm({ current: '', next: '', confirm: '' });
        } catch (err: any) {
            setMsg({ type: 'err', text: err?.response?.data?.error ?? t('Erreur.') });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card title={t('Changer de mot de passe')} icon={<Lock size={16} />}>
            {msg && <Feedback msg={msg} />}
            <div className="space-y-4 max-w-sm">
                <Field label={t('Mot de passe actuel')}>
                    <input type="password" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} className="input-field" />
                </Field>
                <Field label={t('Nouveau mot de passe')}>
                    <input type="password" value={form.next} onChange={e => setForm(f => ({ ...f, next: e.target.value }))} className="input-field" />
                    <p className="text-xs text-slate-400 mt-1">{t('8 caractères minimum')}</p>
                </Field>
                <Field label={t('Confirmer le nouveau mot de passe')}>
                    <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} className="input-field" />
                </Field>
            </div>
            <div className="flex justify-end pt-2">
                <button onClick={handleSave} disabled={saving || !form.current || !form.next || !form.confirm}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-60">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />} {t('Mettre à jour')}
                </button>
            </div>
        </Card>
    );
}

// ── Composants utilitaires ────────────────────────────────────────────────────

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                <span className="text-emerald-600">{icon}</span>
                {title}
            </div>
            {children}
        </motion.div>
    );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <label className="text-xs font-medium text-slate-500">{label}</label>
            {children}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs text-slate-400 font-medium">{label}</p>
            <p className="text-sm font-semibold text-slate-700">{value}</p>
        </div>
    );
}

function Feedback({ msg }: { msg: { type: 'ok' | 'err'; text: string } }) {
    return (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${msg.type === 'ok' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {msg.type === 'ok' ? <CheckCircle2 size={15} className="shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
            {msg.text}
        </div>
    );
}

function PlanBadge({ plan }: { plan: string }) {
    const map: Record<string, string> = { gratuit: 'bg-slate-100 text-slate-600', standard: 'bg-blue-100 text-blue-700', premium: 'bg-amber-100 text-amber-700' };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[plan] ?? 'bg-slate-100 text-slate-600'}`}>{plan}</span>
    );
}
