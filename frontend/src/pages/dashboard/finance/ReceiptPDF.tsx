import { useRef, useState } from 'react';
import { Printer, Download, Loader2, CheckCircle2 } from 'lucide-react';

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

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' XAF';

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

export default function ReceiptPDF({ recu }: { recu: RecuData }) {
    const ref = useRef<HTMLDivElement>(null);
    const [exporting, setExporting] = useState(false);

    const handleDownload = async () => {
        if (!ref.current) return;
        setExporting(true);
        try {
            const { default: html2canvas } = await import('html2canvas');
            const { default: jsPDF }       = await import('jspdf');
            const canvas  = await html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
            const pageW   = pdf.internal.pageSize.getWidth();
            const imgH    = pageW * (canvas.height / canvas.width);
            pdf.addImage(imgData, 'PNG', 0, 0, pageW, imgH);
            pdf.save(`recu_${recu.numero_recu}_${recu.eleve.nom}.pdf`);
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
            <div ref={ref} style={{ fontFamily: 'Arial, sans-serif', color: '#1e293b', background: '#fff', width: '148mm', minHeight: '210mm', padding: '12mm', boxSizing: 'border-box' }}>

                {/* En-tête */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #059669', paddingBottom: '6mm', marginBottom: '6mm' }}>
                    <div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{recu.ecole}</div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: 2 }}>République du Cameroun · Paix – Travail – Patrie</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#059669', letterSpacing: '0.5px' }}>REÇU DE PAIEMENT</div>
                        <div style={{ fontSize: '11px', color: '#475569', marginTop: 2, fontFamily: 'monospace' }}>N° {recu.numero_recu}</div>
                    </div>
                </div>

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

                {/* Signature */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12mm' }}>
                    <div style={{ textAlign: 'center', width: '55%' }}>
                        <div style={{ fontSize: '10px', color: '#475569', marginBottom: 14 }}>Le Caissier / L'Intendant</div>
                        <div style={{ borderBottom: '1px solid #94a3b8', width: '90%', margin: '0 auto' }} />
                        <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: 4 }}>{recu.encaisse_par}</div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ marginTop: '10mm', borderTop: '1px solid #e2e8f0', paddingTop: '3mm', textAlign: 'center', fontSize: '8px', color: '#94a3b8' }}>
                    Reçu généré par Sholaris · Conservez ce document comme preuve de paiement.
                </div>
            </div>
        </div>
    );
}

export { CheckCircle2 };
