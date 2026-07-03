// Génération PDF au niveau CLASSE — liste des élèves & bordereau de notes.
// Style établissement secondaire camerounais (MINESEC), jsPDF natif.
import { loadImg } from './bulletinPdf';

export interface SchoolInfo { nom: string; logo_url?: string | null; ville?: string | null; telephone?: string | null; }

export interface RosterStudent {
    matricule: string; nom: string; prenom: string;
    sexe?: string | null; date_naissance?: string | null; statut?: string | null;
}

export interface SheetBulletin {
    moyenne_generale: number; rang: number | null;
    eleve: { nom: string; prenom: string; matricule: string };
    details: { matiere: { nom: string; code: string; coefficient: number }; moyenne_matiere: number }[];
}

const N = (n: any) => Number(n) || 0;
const f2 = (n: any) => N(n).toFixed(2);
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const sexeLbl = (s?: string | null) => s === 'F' ? 'F' : s === 'M' ? 'M' : '—';
const rgbFor = (a: number): [number, number, number] =>
    a >= 14 ? [4, 120, 87] : a >= 10 ? [37, 99, 235] : [220, 38, 38];

// En-tête commun (bilingue + établissement + bandeau titre). Renvoie le y courant.
function drawHeader(doc: any, W: number, M: number, school: SchoolInfo, logo: any, title: string, subtitle: string): number {
    const lx = M, rx = W - M;
    let y = M + 4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(15, 23, 42);
    doc.text('RÉPUBLIQUE DU CAMEROUN', lx, y);
    doc.text('REPUBLIC OF CAMEROON', rx, y, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(90, 100, 115);
    doc.text('Paix — Travail — Patrie', lx, y + 3.6);
    doc.text('Peace — Work — Fatherland', rx, y + 3.6, { align: 'right' });
    doc.text('MINESEC', lx, y + 7.2);
    doc.text('MINSEC', rx, y + 7.2, { align: 'right' });

    if (logo) {
        const h = 15, w = Math.min(16, (logo.w / logo.h) * h);
        try { doc.addImage(logo.data, logo.fmt, W / 2 - w / 2, y - 2, w, h); } catch { /* ignore */ }
    }
    y += 15;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(4, 120, 87);
    doc.text(school.nom.toUpperCase(), W / 2, y, { align: 'center' });
    y += 4.4;
    const sub = [school.ville, school.telephone].filter(Boolean).join('  •  ');
    if (sub) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(90, 100, 115);
        doc.text(sub, W / 2, y, { align: 'center' }); y += 3.6;
    }
    // Bandeau titre
    y += 1.5;
    doc.setFillColor(15, 23, 42); doc.rect(lx, y, rx - lx, 8, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text(title.toUpperCase(), W / 2, y + 5.4, { align: 'center' });
    if (subtitle) {
        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
        doc.text(subtitle, rx - 2, y + 5.4, { align: 'right' });
    }
    return y + 8;
}

function footer(doc: any, W: number, H: number, M: number) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(150, 160, 175);
    doc.text(`Édité via Sholaris — ${new Date().toLocaleDateString('fr-FR')}`, W / 2, H - M + 2, { align: 'center' });
}

// ── 1. Liste des élèves (portrait A4) ─────────────────────────────────────────
export async function downloadClassRoster(students: RosterStudent[], school: SchoolInfo, classeName: string, anneeLabel: string) {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M = 12;
    const logo = await loadImg(school.logo_url);

    const cols = [
        { t: 'N°',                 x: M,        w: 12, a: 'center' as const },
        { t: 'Matricule',          x: M + 12,   w: 34, a: 'left'   as const },
        { t: 'Nom & Prénoms',      x: M + 46,   w: 78, a: 'left'   as const },
        { t: 'Sexe',               x: M + 124,  w: 16, a: 'center' as const },
        { t: 'Date de naissance',  x: M + 140,  w: 46, a: 'center' as const },
    ];
    const tblX = M, tblW = W - 2 * M, rowH = 7;

    const drawTableHeader = (y: number): number => {
        doc.setFillColor(15, 23, 42); doc.rect(tblX, y, tblW, rowH, 'F');
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
        cols.forEach(c => doc.text(c.t, c.a === 'center' ? c.x + c.w / 2 : c.x + 2, y + 4.7, { align: c.a === 'center' ? 'center' : 'left' }));
        return y + rowH;
    };

    let y = drawHeader(doc, W, M, school, logo, 'Liste des élèves', '');
    // Ligne classe / effectif
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(`Classe : ${classeName}`, M, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 100, 115);
    if (anneeLabel) doc.text(`Année scolaire : ${anneeLabel}`, W / 2, y + 6, { align: 'center' });
    doc.text(`Effectif : ${students.length}`, W - M, y + 6, { align: 'right' });
    y += 10;

    y = drawTableHeader(y);
    doc.setFont('helvetica', 'normal');
    const sorted = [...students].sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom));
    sorted.forEach((s, i) => {
        if (y + rowH > H - M - 6) { footer(doc, W, H, M); doc.addPage(); y = M; y = drawTableHeader(y); }
        if (i % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(tblX, y, tblW, rowH, 'F'); }
        doc.setTextColor(30, 41, 59); doc.setFontSize(8.5);
        doc.text(String(i + 1), cols[0].x + cols[0].w / 2, y + 4.7, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(s.matricule ?? '—', cols[1].x + 2, y + 4.7);
        doc.setFont('helvetica', 'bold');
        doc.text(`${s.nom} ${s.prenom}`.slice(0, 46), cols[2].x + 2, y + 4.7);
        doc.setFont('helvetica', 'normal');
        doc.text(sexeLbl(s.sexe), cols[3].x + cols[3].w / 2, y + 4.7, { align: 'center' });
        doc.text(fmtDate(s.date_naissance), cols[4].x + cols[4].w / 2, y + 4.7, { align: 'center' });
        y += rowH;
    });
    // Cadre + lignes verticales
    doc.setDrawColor(150, 160, 175); doc.setLineWidth(0.2);

    footer(doc, W, H, M);
    doc.save(`liste_eleves_${classeName.replace(/\s+/g, '_')}.pdf`);
}

// ── 2. Bordereau de notes (paysage A4) ────────────────────────────────────────
export async function downloadGradeSheet(bulletins: SheetBulletin[], school: SchoolInfo, classeName: string, periodeName: string, anneeLabel: string) {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297, H = 210, M = 10;
    const logo = await loadImg(school.logo_url);

    // Union ordonnée des matières (code → nom, coef)
    const subjMap = new Map<string, { nom: string; coef: number }>();
    for (const b of bulletins) for (const d of b.details) {
        if (!subjMap.has(d.matiere.code)) subjMap.set(d.matiere.code, { nom: d.matiere.nom, coef: N(d.matiere.coefficient) });
    }
    const subjects = [...subjMap.entries()]; // [code, {nom, coef}]

    // Largeurs
    const tblX = M, tblW = W - 2 * M;
    const wNum = 9, wMat = 26, wMoy = 15, wRang = 12;
    const wName = 42;
    const subjW = Math.max(11, (tblW - wNum - wMat - wName - wMoy - wRang) / Math.max(1, subjects.length));
    // positions
    const xNum = tblX, xMat = xNum + wNum, xName = xMat + wMat, xSubj0 = xName + wName;
    const xMoy = xSubj0 + subjW * subjects.length, xRang = xMoy + wMoy;
    const rowH = 6.5;

    const drawTableHeader = (y: number): number => {
        doc.setFillColor(15, 23, 42); doc.rect(tblX, y, tblW, rowH + 2, 'F');
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        doc.text('N°', xNum + wNum / 2, y + 5, { align: 'center' });
        doc.text('Matricule', xMat + 2, y + 5);
        doc.text('Nom & Prénoms', xName + 2, y + 5);
        subjects.forEach(([code], i) => {
            const cx = xSubj0 + subjW * i + subjW / 2;
            doc.setFontSize(6.5);
            doc.text(code.slice(0, 6), cx, y + 4, { align: 'center' });
            doc.setFontSize(5.5); doc.setTextColor(180, 200, 230);
            doc.text(`cf${subjMap.get(code)!.coef}`, cx, y + 7, { align: 'center' });
            doc.setTextColor(255, 255, 255);
        });
        doc.setFontSize(7);
        doc.text('Moy.', xMoy + wMoy / 2, y + 5, { align: 'center' });
        doc.text('Rang', xRang + wRang / 2, y + 5, { align: 'center' });
        return y + rowH + 2;
    };

    let y = drawHeader(doc, W, M, school, logo, 'Bordereau de notes', anneeLabel ? `Année ${anneeLabel}` : '');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(`Classe : ${classeName}`, M, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 100, 115);
    doc.text(`Période : ${periodeName}`, W / 2, y + 6, { align: 'center' });
    doc.text(`Effectif : ${bulletins.length}`, W - M, y + 6, { align: 'right' });
    y += 10;

    y = drawTableHeader(y);

    const ranked = [...bulletins].sort((a, b) => N(b.moyenne_generale) - N(a.moyenne_generale));
    const subjSum: Record<string, { s: number; n: number }> = {};

    ranked.forEach((b, i) => {
        if (y + rowH > H - M - 12) { footer(doc, W, H, M); doc.addPage(); y = M; y = drawTableHeader(y); }
        if (i % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(tblX, y, tblW, rowH, 'F'); }
        doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
        doc.text(String(i + 1), xNum + wNum / 2, y + 4.4, { align: 'center' });
        doc.setFontSize(6.5); doc.text((b.eleve.matricule ?? '—').slice(0, 14), xMat + 2, y + 4.4);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        doc.text(`${b.eleve.nom} ${b.eleve.prenom}`.slice(0, 26), xName + 2, y + 4.4);
        doc.setFont('helvetica', 'normal');
        const byCode: Record<string, number> = {};
        for (const d of b.details) byCode[d.matiere.code] = N(d.moyenne_matiere);
        subjects.forEach(([code], si) => {
            const cx = xSubj0 + subjW * si + subjW / 2;
            const v = byCode[code];
            if (v == null) { doc.setTextColor(180, 190, 200); doc.text('—', cx, y + 4.4, { align: 'center' }); return; }
            (subjSum[code] ??= { s: 0, n: 0 }); subjSum[code].s += v; subjSum[code].n++;
            const [r, g, bl] = rgbFor(v); doc.setTextColor(r, g, bl);
            doc.text(f2(v), cx, y + 4.4, { align: 'center' });
        });
        const [mr, mg, mb] = rgbFor(N(b.moyenne_generale));
        doc.setFont('helvetica', 'bold'); doc.setTextColor(mr, mg, mb);
        doc.text(f2(b.moyenne_generale), xMoy + wMoy / 2, y + 4.4, { align: 'center' });
        doc.setTextColor(15, 23, 42);
        doc.text(b.rang ? String(b.rang) : String(i + 1), xRang + wRang / 2, y + 4.4, { align: 'center' });
        y += rowH;
    });

    // Ligne moyenne de classe par matière
    doc.setFillColor(224, 242, 235); doc.rect(tblX, y, tblW, rowH, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(4, 120, 87);
    doc.text('MOYENNE CLASSE', xMat + 2, y + 4.4);
    subjects.forEach(([code], si) => {
        const cx = xSubj0 + subjW * si + subjW / 2;
        const agg = subjSum[code];
        doc.text(agg && agg.n ? f2(agg.s / agg.n) : '—', cx, y + 4.4, { align: 'center' });
    });
    const clsMoy = ranked.length ? ranked.reduce((a, b) => a + N(b.moyenne_generale), 0) / ranked.length : 0;
    doc.text(f2(clsMoy), xMoy + wMoy / 2, y + 4.4, { align: 'center' });
    y += rowH + 4;

    // Légende codes → matières
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(90, 100, 115);
    const legend = subjects.map(([code, m]) => `${code} = ${m.nom}`).join('   •   ');
    doc.splitTextToSize(`Légende : ${legend}`, tblW).slice(0, 3).forEach((ln: string, i: number) => doc.text(ln, M, y + i * 3.4));

    footer(doc, W, H, M);
    doc.save(`bordereau_notes_${classeName.replace(/\s+/g, '_')}_${periodeName.replace(/\s+/g, '_')}.pdf`);
}
