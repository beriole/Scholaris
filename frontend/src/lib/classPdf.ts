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
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const sexeLbl = (s?: string | null) => s === 'F' ? 'F' : s === 'M' ? 'M' : '—';
const rgbFor = (a: number): [number, number, number] =>
    a >= 14 ? [4, 120, 87] : a >= 10 ? [37, 99, 235] : [220, 38, 38];

// Charte GHAHS
const GREEN: [number, number, number] = [6, 95, 70];
const GREEN_DK: [number, number, number] = [4, 66, 48];
const GOLD: [number, number, number] = [176, 141, 63];
const IVORY: [number, number, number] = [250, 250, 246];

function vGradient(doc: any, x: number, y: number, w: number, h: number, c1: number[], c2: number[]) {
    const steps = 24;
    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        doc.setFillColor(Math.round(c1[0] + (c2[0] - c1[0]) * t), Math.round(c1[1] + (c2[1] - c1[1]) * t), Math.round(c1[2] + (c2[2] - c1[2]) * t));
        doc.rect(x, y + (h / steps) * i, w, h / steps + 0.3, 'F');
    }
}

function medallion(doc: any, cx: number, cy: number, r: number, logo: any, initials: string) {
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]); doc.circle(cx, cy, r, 'F');
    doc.setFillColor(IVORY[0], IVORY[1], IVORY[2]); doc.circle(cx, cy, r - 0.9, 'F');
    if (logo) {
        const h = (r - 1.6) * 2, w = Math.min(h, (logo.w / logo.h) * h);
        try { doc.addImage(logo.data, logo.fmt, cx - w / 2, cy - h / 2, w, h); } catch { /* ignore */ }
    } else {
        doc.setFont('times', 'bold'); doc.setFontSize(r * 1.05); doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
        doc.text(initials, cx, cy + r * 0.4, { align: 'center' });
    }
}

// En-tête commun premium (bandeau dégradé émeraude + médaillon doré + liseré). Renvoie le y courant.
function drawHeader(doc: any, W: number, M: number, school: SchoolInfo, logo: any, title: string, subtitle: string): number {
    const bandH = 24;
    vGradient(doc, 0, 0, W, bandH, GREEN_DK, [10, 120, 88]);
    doc.setFillColor(GREEN_DK[0], GREEN_DK[1], GREEN_DK[2]);
    doc.triangle(W, 0, W, bandH, W - 55, bandH, 'F');
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(0.8); doc.line(0, bandH, W, bandH);

    const initials = school.nom.split(/\s+/).filter(Boolean).slice(0, 3).map(s => s[0]?.toUpperCase() ?? '').join('') || 'GH';
    const mcx = M + 9, mcy = bandH / 2;
    medallion(doc, mcx, mcy, 8, logo, initials);

    const hx = mcx + 13;
    doc.setTextColor(255, 255, 255); doc.setFont('times', 'bold'); doc.setFontSize(13);
    doc.text(school.nom.toUpperCase(), hx, 10);
    doc.setFont('times', 'normal'); doc.setFontSize(7.5); doc.setTextColor(200, 228, 216);
    doc.text('Republic of Cameroon · Ministry of Secondary Education', hx, 15.4);
    const sub = [school.ville, school.telephone].filter(Boolean).join('  ·  ');
    if (sub) doc.text(sub, hx, 19.6);

    // drapeau + titre à droite
    const fbw = 2.4, fbh = 3.4, fb = W - M - 3 * fbw, fbt = 3;
    doc.setFillColor(16, 122, 74); doc.rect(fb, fbt, fbw, fbh, 'F');
    doc.setFillColor(206, 32, 42); doc.rect(fb + fbw, fbt, fbw, fbh, 'F');
    doc.setFillColor(244, 196, 48); doc.rect(fb + 2 * fbw, fbt, fbw, fbh, 'F');
    doc.setFont('times', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), W - M, 14, { align: 'right' });
    if (subtitle) { doc.setFont('times', 'normal'); doc.setFontSize(8); doc.setTextColor(200, 228, 216); doc.text(subtitle, W - M, 19.5, { align: 'right' }); }

    return bandH + 6;
}

function footer(doc: any, W: number, H: number, M: number, label = 'Green Hills Academy High School') {
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(0.3); doc.line(M, H - M + 0.5, W - M, H - M + 0.5);
    doc.setFont('times', 'italic'); doc.setFontSize(6.5); doc.setTextColor(120, 130, 145);
    doc.text(`${label} · Solid Foundation — Discipline — Success`, M, H - M + 4);
    doc.setFont('times', 'normal'); doc.setTextColor(150, 160, 175);
    doc.text(`Generated ${new Date().toLocaleDateString('en-GB')}`, W - M, H - M + 4, { align: 'right' });
}

// ── 1. Liste des élèves (portrait A4) ─────────────────────────────────────────
export async function downloadClassRoster(students: RosterStudent[], school: SchoolInfo, classeName: string, anneeLabel: string) {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M = 12;
    const logo = await loadImg(school.logo_url);

    const cols = [
        { t: 'No',             x: M,        w: 12, a: 'center' as const },
        { t: 'Reg. No',        x: M + 12,   w: 34, a: 'left'   as const },
        { t: 'Name',           x: M + 46,   w: 78, a: 'left'   as const },
        { t: 'Sex',            x: M + 124,  w: 16, a: 'center' as const },
        { t: 'Date of Birth',  x: M + 140,  w: 46, a: 'center' as const },
    ];
    const tblX = M, tblW = W - 2 * M, rowH = 7;

    const drawTableHeader = (y: number): number => {
        doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]); doc.rect(tblX, y, tblW, rowH, 'F');
        doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(0.3); doc.line(tblX, y + rowH, tblX + tblW, y + rowH);
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
        cols.forEach(c => doc.text(c.t, c.a === 'center' ? c.x + c.w / 2 : c.x + 2, y + 4.7, { align: c.a === 'center' ? 'center' : 'left' }));
        return y + rowH;
    };

    let y = drawHeader(doc, W, M, school, logo, 'Students List', '');
    // Ligne classe / effectif
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(`Class: ${classeName}`, M, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 100, 115);
    if (anneeLabel) doc.text(`Academic Year: ${anneeLabel}`, W / 2, y + 6, { align: 'center' });
    doc.text(`Enrolment: ${students.length}`, W - M, y + 6, { align: 'right' });
    y += 10;

    y = drawTableHeader(y);
    doc.setFont('helvetica', 'normal');
    const sorted = [...students].sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom));
    sorted.forEach((s, i) => {
        if (y + rowH > H - M - 6) { footer(doc, W, H, M, school.nom); doc.addPage(); y = M; y = drawTableHeader(y); }
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

    footer(doc, W, H, M, school.nom);
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
    const wNum = 9, wMat = 24, wName = 40, wCoef = 12, wPts = 16, wMoy = 14, wRang = 11;
    const subjW = Math.max(10, (tblW - wNum - wMat - wName - wCoef - wPts - wMoy - wRang) / Math.max(1, subjects.length));
    // positions
    const xNum = tblX, xMat = xNum + wNum, xName = xMat + wMat, xSubj0 = xName + wName;
    const xCoef = xSubj0 + subjW * subjects.length, xPts = xCoef + wCoef, xMoy = xPts + wPts, xRang = xMoy + wMoy;
    const rowH = 6.5;

    const drawTableHeader = (y: number): number => {
        doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]); doc.rect(tblX, y, tblW, rowH + 2, 'F');
        doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(0.3); doc.line(tblX, y + rowH + 2, tblX + tblW, y + rowH + 2);
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        doc.text('No', xNum + wNum / 2, y + 5, { align: 'center' });
        doc.text('Reg. No', xMat + 2, y + 5);
        doc.text('Name', xName + 2, y + 5);
        subjects.forEach(([code], i) => {
            const cx = xSubj0 + subjW * i + subjW / 2;
            doc.setFontSize(6.5);
            doc.text(code.slice(0, 6), cx, y + 4, { align: 'center' });
            doc.setFontSize(5.5); doc.setTextColor(180, 200, 230);
            doc.text(`cf${subjMap.get(code)!.coef}`, cx, y + 7, { align: 'center' });
            doc.setTextColor(255, 255, 255);
        });
        doc.setFontSize(7);
        doc.text('Coef', xCoef + wCoef / 2, y + 5, { align: 'center' });
        doc.text('T. Pts', xPts + wPts / 2, y + 5, { align: 'center' });
        doc.text('Avg.', xMoy + wMoy / 2, y + 5, { align: 'center' });
        doc.text('Rank', xRang + wRang / 2, y + 5, { align: 'center' });
        return y + rowH + 2;
    };

    let y = drawHeader(doc, W, M, school, logo, 'Grade Sheet', anneeLabel ? `Year ${anneeLabel}` : '');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(`Class: ${classeName}`, M, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 100, 115);
    doc.text(`Term: ${periodeName}`, W / 2, y + 6, { align: 'center' });
    doc.text(`Enrolment: ${bulletins.length}`, W - M, y + 6, { align: 'right' });
    y += 10;

    y = drawTableHeader(y);

    // Rang calculé sur la moyenne décroissante…
    const byScore = [...bulletins].sort((a, b) => N(b.moyenne_generale) - N(a.moyenne_generale));
    const rankOf = new Map<SheetBulletin, number>();
    byScore.forEach((b, i) => rankOf.set(b, b.rang ?? i + 1));
    // …mais affichage par ordre ALPHABÉTIQUE (nom puis prénom).
    const ranked = [...bulletins].sort((a, b) =>
        `${a.eleve.nom} ${a.eleve.prenom}`.localeCompare(`${b.eleve.nom} ${b.eleve.prenom}`, 'fr', { sensitivity: 'base' }));
    const subjSum: Record<string, { s: number; n: number }> = {};
    let sumCoef = 0, sumPts = 0;

    ranked.forEach((b, i) => {
        if (y + rowH > H - M - 12) { footer(doc, W, H, M, school.nom); doc.addPage(); y = M; y = drawTableHeader(y); }
        if (i % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(tblX, y, tblW, rowH, 'F'); }
        doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
        doc.text(String(i + 1), xNum + wNum / 2, y + 4.4, { align: 'center' });
        doc.setFontSize(6.5); doc.text((b.eleve.matricule ?? '—').slice(0, 13), xMat + 2, y + 4.4);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        doc.text(`${b.eleve.nom} ${b.eleve.prenom}`.slice(0, 24), xName + 2, y + 4.4);
        doc.setFont('helvetica', 'normal');
        const byCode: Record<string, number> = {};
        let tCoef = 0, tPts = 0;
        for (const d of b.details) {
            byCode[d.matiere.code] = N(d.moyenne_matiere);
            const cf = N(d.matiere.coefficient);
            tCoef += cf; tPts += N(d.moyenne_matiere) * cf;
        }
        subjects.forEach(([code], si) => {
            const cx = xSubj0 + subjW * si + subjW / 2;
            const v = byCode[code];
            if (v == null) { doc.setTextColor(180, 190, 200); doc.text('—', cx, y + 4.4, { align: 'center' }); return; }
            (subjSum[code] ??= { s: 0, n: 0 }); subjSum[code].s += v; subjSum[code].n++;
            const [r, g, bl] = rgbFor(v); doc.setTextColor(r, g, bl);
            doc.text(f2(v), cx, y + 4.4, { align: 'center' });
        });
        sumCoef += tCoef; sumPts += tPts;
        // Total Coef + Total Points
        doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 41, 59);
        doc.text(String(tCoef), xCoef + wCoef / 2, y + 4.4, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text(f2(tPts), xPts + wPts / 2, y + 4.4, { align: 'center' });
        const [mr, mg, mb] = rgbFor(N(b.moyenne_generale));
        doc.setTextColor(mr, mg, mb);
        doc.text(f2(b.moyenne_generale), xMoy + wMoy / 2, y + 4.4, { align: 'center' });
        doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
        doc.text(String(rankOf.get(b) ?? i + 1), xRang + wRang / 2, y + 4.4, { align: 'center' });
        y += rowH;
    });

    // Ligne moyenne de classe par matière
    const nR = ranked.length || 1;
    doc.setFillColor(224, 242, 235); doc.rect(tblX, y, tblW, rowH, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(4, 120, 87);
    doc.text('CLASS AVERAGE', xMat + 2, y + 4.4);
    subjects.forEach(([code], si) => {
        const cx = xSubj0 + subjW * si + subjW / 2;
        const agg = subjSum[code];
        doc.text(agg && agg.n ? f2(agg.s / agg.n) : '—', cx, y + 4.4, { align: 'center' });
    });
    doc.text(f2(sumCoef / nR), xCoef + wCoef / 2, y + 4.4, { align: 'center' });
    doc.text(f2(sumPts / nR), xPts + wPts / 2, y + 4.4, { align: 'center' });
    const clsMoy = ranked.length ? ranked.reduce((a, b) => a + N(b.moyenne_generale), 0) / ranked.length : 0;
    doc.text(f2(clsMoy), xMoy + wMoy / 2, y + 4.4, { align: 'center' });
    y += rowH + 4;

    // Légende codes → matières
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(90, 100, 115);
    const legend = subjects.map(([code, m]) => `${code} = ${m.nom}`).join('   •   ');
    doc.splitTextToSize(`Legend: ${legend}`, tblW).slice(0, 3).forEach((ln: string, i: number) => doc.text(ln, M, y + i * 3.4));

    footer(doc, W, H, M, school.nom);
    doc.save(`bordereau_notes_${classeName.replace(/\s+/g, '_')}_${periodeName.replace(/\s+/g, '_')}.pdf`);
}
