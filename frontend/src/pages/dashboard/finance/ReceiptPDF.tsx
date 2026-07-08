import { useRef, useState, useEffect } from 'react';
import { Printer, Download, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../../lib/api';

interface SchoolInfo {
    logo_url?: string | null; ville?: string | null; telephone?: string | null;
    email?: string | null; boite_postale?: string | null; devise?: string | null;
    numero_contribuable?: string | null;
}

export interface RecuData {
    numero_recu:   string;
    date_paiement: string;
    montant_xaf:   number;
    montant_total: number;
    deja_paye:     number;
    solde_restant: number;
    methode:       string;
    reference:     string | null;
    ecole:         string;
    eleve:         { nom: string; prenom: string; matricule: string };
    classe:        string;
    encaisse_par:  string;
}

// NB : fr-FR insère une espace fine insécable (U+202F/U+00A0) rendue « / » par la
// police PDF Helvetica → on la normalise en espace simple.
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' XAF';

const METHODE_LABEL: Record<string, string> = {
    especes:      'Espèces',
    virement:     'Virement bancaire',
    cheque:       'Chèque',
    mobile_money: 'Mobile Money',
    mtn_money:    'MTN Mobile Money',
    orange_money: 'Orange Money',
};

// Conversion simple d'un montant en lettres (français, jusqu'aux millions).
function enLettres(n: number): string {
    n = Math.round(n);
    if (n === 0) return 'zéro';
    const u = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
        'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const d = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
    const tranche = (x: number): string => {
        let s = '';
        const c = Math.floor(x / 100), r = x % 100;
        if (c > 0) s += (c > 1 ? u[c] + ' ' : '') + 'cent' + (c > 1 && r === 0 ? 's' : '') + ' ';
        if (r < 20) s += u[r];
        else {
            const di = Math.floor(r / 10), ui = r % 10;
            if (di === 7 || di === 9) s += d[di] + '-' + u[10 + ui];
            else { s += d[di]; if (ui === 1 && di !== 8) s += ' et un'; else if (ui > 0) s += '-' + u[ui]; else if (di === 8) s += 's'; }
        }
        return s.trim();
    };
    let res = '';
    const M = Math.floor(n / 1_000_000), K = Math.floor((n % 1_000_000) / 1000), R = n % 1000;
    if (M > 0) res += (M > 1 ? tranche(M) + ' ' : 'un ') + 'million' + (M > 1 ? 's' : '') + ' ';
    if (K > 0) res += (K > 1 ? tranche(K) + ' ' : '') + 'mille ';
    if (R > 0) res += tranche(R);
    return res.trim();
}

const GREEN = '#065f46', GREEN_DK = '#044231', GOLD = '#b08d3f', GOLD_LT = '#d6bb7a', IVORY = '#faf9f4';

// ── Rendu PDF vectoriel (jsPDF natif — pas de html2canvas, incompatible oklch) ─
const cGREEN: [number, number, number] = [6, 95, 70];
const cGREEN_DK: [number, number, number] = [4, 66, 48];
const cGOLD: [number, number, number] = [176, 141, 63];
const cGOLD_LT: [number, number, number] = [214, 187, 122];
const cIVORY: [number, number, number] = [250, 250, 246];
const cDARK: [number, number, number] = [17, 24, 39];
const cGREY: [number, number, number] = [100, 110, 122];
const cRED: [number, number, number] = [200, 40, 40];
const cLT: [number, number, number] = [224, 242, 235];

const fmtDateFr = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

function vGrad(doc: any, x: number, y: number, w: number, h: number, c1: number[], c2: number[]) {
    const steps = 22;
    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        doc.setFillColor(Math.round(c1[0] + (c2[0] - c1[0]) * t), Math.round(c1[1] + (c2[1] - c1[1]) * t), Math.round(c1[2] + (c2[2] - c1[2]) * t));
        doc.rect(x, y + (h / steps) * i, w, h / steps + 0.3, 'F');
    }
}
function medallionP(doc: any, cx: number, cy: number, r: number, logo: any, initials: string) {
    doc.setFillColor(...cGOLD); doc.circle(cx, cy, r, 'F');
    doc.setFillColor(...cIVORY); doc.circle(cx, cy, r - 0.8, 'F');
    if (logo) {
        const h = (r - 1.4) * 2, w = Math.min(h, (logo.w / logo.h) * h);
        try { doc.addImage(logo.data, logo.fmt, cx - w / 2, cy - h / 2, w, h); } catch { /* ignore */ }
    } else {
        doc.setFont('times', 'bold'); doc.setFontSize(r * 1.05); doc.setTextColor(...cGREEN);
        doc.text(initials, cx, cy + r * 0.4, { align: 'center' });
    }
}

function renderReceipt(doc: any, recu: RecuData, school: SchoolInfo, logo: any) {
    const W = 148, H = 210, M = 12, x0 = M, x1 = W - M, innerW = x1 - x0;
    const initials = recu.ecole.split(/\s+/).filter(Boolean).slice(0, 3).map(s => s[0]?.toUpperCase() ?? '').join('') || 'GH';
    const motto = school.devise || 'Solid Foundation · Discipline · Success';

    // ── En-tête émeraude ────────────────────────────────────────
    vGrad(doc, 0, 0, W, 30, cGREEN_DK, [10, 120, 88]);
    doc.setFillColor(...cGREEN_DK); doc.triangle(W, 0, W, 30, W - 34, 30, 'F');
    doc.setDrawColor(...cGOLD); doc.setLineWidth(0.7); doc.line(0, 30, W, 30);
    medallionP(doc, M + 8, 13, 7, logo, initials);
    // drapeau
    const fbw = 2.2, fbt = 5, fb = x1 - 3 * fbw;
    doc.setFillColor(16, 122, 74); doc.rect(fb, fbt, fbw, 3.2, 'F');
    doc.setFillColor(206, 32, 42); doc.rect(fb + fbw, fbt, fbw, 3.2, 'F');
    doc.setFillColor(244, 196, 48); doc.rect(fb + 2 * fbw, fbt, fbw, 3.2, 'F');
    // nom + sous-titres
    doc.setTextColor(255, 255, 255); doc.setFont('times', 'bold'); doc.setFontSize(11.5);
    const nm = doc.splitTextToSize(recu.ecole.toUpperCase(), innerW - 20);
    doc.text(nm.slice(0, 2), M + 18, 9.5);
    const two = nm.length > 1;
    doc.setFont('times', 'normal'); doc.setFontSize(6.6); doc.setTextColor(205, 230, 220);
    doc.text('Republic of Cameroon · Ministry of Secondary Education', M + 18, two ? 16.5 : 13);
    doc.setFont('times', 'italic'); doc.setFontSize(6.6); doc.setTextColor(...cGOLD_LT);
    doc.text(motto, M + 18, two ? 19.8 : 16.5);

    // ── Bandeau titre ───────────────────────────────────────────
    let y = 30;
    doc.setFillColor(...cLT); doc.rect(0, y, W, 9, 'F');
    doc.setDrawColor(...cGOLD_LT); doc.setLineWidth(0.3); doc.line(0, y + 9, W, y + 9);
    doc.setFont('times', 'bold'); doc.setFontSize(12); doc.setTextColor(...cGREEN);
    doc.text('PAYMENT RECEIPT', M, y + 6);
    doc.setFont('courier', 'normal'); doc.setFontSize(9); doc.setTextColor(...cGREY);
    doc.text(`N° ${recu.numero_recu}`, x1, y + 6, { align: 'right' });
    y += 9 + 7;

    // ── Date + méthode ──────────────────────────────────────────
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...cGREY);
    doc.text('Date :', M, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...cDARK); doc.text(fmtDateFr(recu.date_paiement), M + 11, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...cGREY); doc.text('Mode :', W / 2 + 4, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...cDARK); doc.text(METHODE_LABEL[recu.methode] ?? recu.methode, W / 2 + 18, y);
    y += 7;

    // ── Bloc élève ──────────────────────────────────────────────
    doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3);
    doc.roundedRect(x0, y, innerW, 16, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(150, 160, 172);
    doc.text('REÇU DE L\'ÉLÈVE', x0 + 4, y + 4.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...cDARK);
    doc.text(`${recu.eleve.nom} ${recu.eleve.prenom}`, x0 + 4, y + 9.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...cGREY);
    doc.text(`Matricule : ${recu.eleve.matricule}     Classe : ${recu.classe}`, x0 + 4, y + 13.6);
    y += 16 + 6;

    // ── Montant versé ───────────────────────────────────────────
    doc.setFillColor(236, 253, 245); doc.setDrawColor(167, 243, 208); doc.setLineWidth(0.3);
    doc.roundedRect(x0, y, innerW, 22, 2.5, 2.5, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...cGREEN);
    doc.text('MONTANT VERSÉ', W / 2, y + 5.5, { align: 'center' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(4, 120, 87);
    doc.text(fmt(recu.montant_xaf), W / 2, y + 13.5, { align: 'center' });
    doc.setFont('times', 'italic'); doc.setFontSize(7); doc.setTextColor(...cGREY);
    const words = `${enLettres(recu.montant_xaf)} francs CFA`;
    doc.text(words.charAt(0).toUpperCase() + words.slice(1), W / 2, y + 19, { align: 'center' });
    y += 22 + 6;

    // ── Soldes ──────────────────────────────────────────────────
    const line = (label: string, val: string, bold = false, color: [number, number, number] = cDARK) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(8.5);
        doc.setTextColor(...(bold ? cDARK : cGREY)); doc.text(label, x0 + 2, y + 4);
        doc.setTextColor(...color); doc.setFont('helvetica', 'bold'); doc.text(val, x1 - 2, y + 4, { align: 'right' });
        doc.setDrawColor(230, 234, 238); doc.setLineWidth(0.2); doc.line(x0, y + 6, x1, y + 6);
        y += 6.5;
    };
    line('Scolarité totale due', fmt(recu.montant_total));
    line('Total déjà réglé', fmt(recu.deja_paye));
    const paid = recu.solde_restant <= 0;
    doc.setFillColor(...(paid ? [236, 253, 245] : [254, 242, 242]) as [number, number, number]); doc.rect(x0, y - 1, innerW, 8, 'F');
    line('Solde restant', fmt(recu.solde_restant), true, paid ? cGREEN : cRED);
    y += 3;

    if (recu.reference) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...cGREY);
        doc.text(`Référence : ${recu.reference}`, x0, y + 3); y += 7;
    }
    if (paid) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...cGREEN);
        doc.text('✓  SCOLARITÉ INTÉGRALEMENT SOLDÉE', W / 2, y + 4, { align: 'center' }); y += 8;
    }

    // ── Signature + cachet ──────────────────────────────────────
    const sigY = Math.max(y + 6, H - 44);
    // cachet
    const scx = M + 12, scy = sigY + 6, sr = 11;
    doc.setDrawColor(...cGOLD); doc.setLineWidth(0.5); doc.circle(scx, scy, sr, 'S'); doc.setLineWidth(0.25); doc.circle(scx, scy, sr - 1.5, 'S');
    doc.setTextColor(...cGOLD);
    doc.setFont('times', 'bold'); doc.setFontSize(6); doc.text('OFFICIAL', scx, scy - 3.5, { align: 'center' });
    doc.setFontSize(9); doc.text(initials, scx, scy + 1, { align: 'center' });
    doc.setFontSize(5.5); doc.text('PAID', scx, scy + 5, { align: 'center' });
    // signature
    doc.setDrawColor(...cGOLD); doc.setLineWidth(0.3); doc.line(x1 - 46, sigY + 8, x1, sigY + 8);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...cGREY);
    doc.text('Le Caissier / L\'Intendant', x1 - 23, sigY + 3, { align: 'center' });
    doc.setFontSize(7); doc.text(recu.encaisse_par, x1 - 23, sigY + 12, { align: 'center' });

    // ── Pied ────────────────────────────────────────────────────
    const contact = [
        school.boite_postale ? `P.O. Box ${school.boite_postale}` : null,
        school.telephone ? `Tel ${school.telephone}` : null,
        school.email || null,
    ].filter(Boolean).join('   ·   ');
    doc.setFillColor(...cGREEN); doc.rect(0, H - 16, W, 16, 'F');
    doc.setDrawColor(...cGOLD); doc.setLineWidth(0.5); doc.line(0, H - 16, W, H - 16);
    if (contact) { doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); doc.setTextColor(215, 233, 225); doc.text(contact, W / 2, H - 9, { align: 'center' }); }
    doc.setFont('times', 'italic'); doc.setFontSize(6); doc.setTextColor(167, 205, 191);
    doc.text(`${recu.ecole} · Keep this document as proof of payment.`, W / 2, H - 4.5, { align: 'center' });
}

export default function ReceiptPDF({ recu }: { recu: RecuData }) {
    const ref = useRef<HTMLDivElement>(null);
    const [exporting, setExporting] = useState(false);
    const [school, setSchool] = useState<SchoolInfo>({});

    useEffect(() => {
        api.get('/api/settings/school').then(r => setSchool(r.data.ecole ?? {})).catch(() => {});
    }, []);

    const initials = recu.ecole.split(/\s+/).filter(Boolean).slice(0, 3).map(s => s[0]?.toUpperCase() ?? '').join('') || 'GH';
    const motto = school.devise || 'Solid Foundation · Discipline · Success';
    const contactLine = [
        school.boite_postale ? `P.O. Box ${school.boite_postale}` : null,
        school.telephone ? `Tel ${school.telephone}` : null,
        school.email || null,
    ].filter(Boolean).join('  ·  ');

    const handleDownload = async () => {
        setExporting(true);
        try {
            const { default: jsPDF } = await import('jspdf');
            const { loadImg } = await import('../../../lib/bulletinPdf');
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
            const logo = await loadImg(school.logo_url);
            renderReceipt(doc, recu, school, logo);
            doc.save(`recu_${recu.numero_recu}_${recu.eleve.nom}.pdf`.replace(/\s+/g, '_'));
        } catch (e) {
            console.error(e);
        } finally { setExporting(false); }
    };

    return (
        <div>
            <div className="flex gap-2 mb-3 print:hidden">
                <button onClick={() => window.print()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all">
                    <Printer size={13} /> Imprimer
                </button>
                <button onClick={handleDownload} disabled={exporting}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-all">
                    {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    {exporting ? 'Export…' : 'Télécharger le reçu'}
                </button>
            </div>

            {/* ── Reçu A5 ──────────────────────────────────────────────────── */}
            <div ref={ref} style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#1e293b', background: '#fff', width: '148mm', minHeight: '210mm', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>

                {/* En-tête premium émeraude */}
                <div style={{ position: 'relative', background: `linear-gradient(135deg, ${GREEN_DK}, ${GREEN} 55%, #0a7856)`, padding: '7mm 12mm 6mm', color: '#fff' }}>
                    {/* drapeau camerounais */}
                    <div style={{ position: 'absolute', top: '5mm', right: '12mm', display: 'flex', width: 22, height: 14, boxShadow: '0 0 0 1px rgba(255,255,255,.3)' }}>
                        <div style={{ flex: 1, background: '#0f7a4a' }} /><div style={{ flex: 1, background: '#ce2029' }} /><div style={{ flex: 1, background: '#f4c430' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5mm' }}>
                        {/* médaillon */}
                        <div style={{ width: 46, height: 46, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: IVORY, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                {school.logo_url
                                    ? <img src={school.logo_url} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    : <span style={{ fontSize: 15, fontWeight: 800, color: GREEN }}>{initials}</span>}
                            </div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '0.3px', lineHeight: 1.1 }}>{recu.ecole}</div>
                            <div style={{ fontSize: '9px', color: '#cde8dd', marginTop: 3 }}>Republic of Cameroon · Ministry of Secondary Education</div>
                            <div style={{ fontSize: '9px', color: GOLD_LT, fontStyle: 'italic', marginTop: 1 }}>{motto}</div>
                        </div>
                    </div>
                    <div style={{ height: 2, background: `linear-gradient(90deg, ${GOLD_LT}, ${GOLD})`, margin: '5mm -12mm 0', width: 'calc(100% + 24mm)' }} />
                </div>

                {/* Bandeau titre reçu */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4mm 12mm', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: GREEN, letterSpacing: '1px' }}>PAYMENT RECEIPT</div>
                    <div style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace' }}>N° {recu.numero_recu}</div>
                </div>

                {/* corps avec padding */}
                <div style={{ padding: '6mm 12mm 12mm' }}>

                {/* Date + méthode */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', marginBottom: '6mm' }}>
                    <div><span style={{ color: '#94a3b8' }}>Date : </span><strong style={{ color: '#1e293b' }}>{new Date(recu.date_paiement).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</strong></div>
                    <div><span style={{ color: '#94a3b8' }}>Mode : </span><strong style={{ color: '#1e293b' }}>{METHODE_LABEL[recu.methode] ?? recu.methode}</strong></div>
                </div>

                {/* Élève */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5mm 6mm', marginBottom: '6mm' }}>
                    <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', marginBottom: 3 }}>Reçu de l'élève</div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{recu.eleve.nom} {recu.eleve.prenom}</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: 2 }}>
                        Matricule : <strong>{recu.eleve.matricule}</strong> &nbsp;·&nbsp; Classe : <strong>{recu.classe}</strong>
                    </div>
                </div>

                {/* Montant principal */}
                <div style={{ textAlign: 'center', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '6mm', marginBottom: '6mm' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#059669', marginBottom: 2 }}>Montant versé</div>
                    <div style={{ fontSize: '30px', fontWeight: 800, color: '#047857' }}>{fmt(recu.montant_xaf)}</div>
                    <div style={{ fontSize: '10px', fontStyle: 'italic', color: '#475569', marginTop: 4, textTransform: 'capitalize' }}>
                        {enLettres(recu.montant_xaf)} francs CFA
                    </div>
                </div>

                {/* Détail soldes */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '8mm' }}>
                    <tbody>
                        {[
                            ['Scolarité totale due', fmt(recu.montant_total)],
                            ['Total déjà réglé', fmt(recu.deja_paye)],
                        ].map(([k, v]) => (
                            <tr key={k as string} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '5px 4px', color: '#64748b' }}>{k}</td>
                                <td style={{ padding: '5px 4px', textAlign: 'right', fontWeight: 600 }}>{v}</td>
                            </tr>
                        ))}
                        <tr style={{ background: recu.solde_restant > 0 ? '#fef2f2' : '#ecfdf5' }}>
                            <td style={{ padding: '7px 4px', fontWeight: 700, color: '#0f172a' }}>Solde restant</td>
                            <td style={{ padding: '7px 4px', textAlign: 'right', fontWeight: 800, color: recu.solde_restant > 0 ? '#dc2626' : '#059669' }}>
                                {fmt(recu.solde_restant)}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {recu.reference && (
                    <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '6mm' }}>Référence : <strong>{recu.reference}</strong></div>
                )}

                {/* Statut soldé */}
                {recu.solde_restant <= 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#059669', fontWeight: 700, fontSize: '12px', marginBottom: '6mm' }}>
                        <span>✓ SCOLARITÉ INTÉGRALEMENT SOLDÉE</span>
                    </div>
                )}

                {/* Signature + cachet */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '12mm' }}>
                    {/* cachet officiel */}
                    <div style={{ width: 62, height: 62, borderRadius: '50%', border: `1.5px solid ${GOLD}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: GOLD, transform: 'rotate(-8deg)', opacity: 0.85 }}>
                        <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: 1 }}>OFFICIAL</div>
                        <div style={{ fontSize: 12, fontWeight: 800 }}>{initials}</div>
                        <div style={{ fontSize: 6 }}>PAID</div>
                    </div>
                    <div style={{ textAlign: 'center', width: '50%' }}>
                        <div style={{ fontSize: '10px', color: '#475569', marginBottom: 14 }}>Cashier / Bursar</div>
                        <div style={{ borderBottom: `1px solid ${GOLD}`, width: '90%', margin: '0 auto' }} />
                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: 4 }}>{recu.encaisse_par}</div>
                    </div>
                </div>
                </div>{/* fin corps */}

                {/* Footer premium */}
                <div style={{ background: GREEN, color: '#fff', padding: '4mm 12mm', marginTop: '6mm' }}>
                    <div style={{ height: 2, background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LT})`, margin: '0 -12mm 3mm', width: 'calc(100% + 24mm)' }} />
                    {contactLine && <div style={{ fontSize: '9px', color: '#d7e9e1', textAlign: 'center', marginBottom: 2 }}>{contactLine}</div>}
                    <div style={{ fontSize: '8px', color: '#a7cdbf', textAlign: 'center', fontStyle: 'italic' }}>
                        {recu.ecole} · Keep this document as proof of payment.
                    </div>
                </div>
            </div>
        </div>
    );
}

export { CheckCircle2 };
