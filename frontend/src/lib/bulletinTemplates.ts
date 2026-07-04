// Moteur de modèles de bulletins — extensible.
// Un modèle = une fonction qui dessine UN bulletin sur la page jsPDF courante.
// Ajouter un modèle = ajouter une entrée dans TEMPLATES + l'exposer.
// Modèle par défaut : GHAHS (bulletin anglophone type MINESEC, Green Hills Academy).
import { loadImg } from './bulletinPdf';

// ── Données (miroir de GET /api/bulletins/class-detailed) ─────────────────────
export interface DetailSubject {
    nom: string; code: string; coef: number; teacher: string;
    t_scores: (number | null)[]; test_av: number | null; total: number | null;
    statut: string; rank: number | null; remark: string;
}
export interface DetailStudent {
    eleve: {
        nom: string; prenom: string; matricule: string; sexe?: string | null;
        date_naissance?: string | null; lieu_naissance?: string | null;
        nationalite?: string | null; photo_url?: string | null;
    };
    subjects: DetailSubject[];
    moyenne_generale: number | null;
    total_coef: number; total_points: number;
    no_papers_passed: number; rang: number | null;
    admission_no?: string; repeater?: boolean; absences?: number;
}
export interface SchoolFull {
    nom: string; logo_url?: string | null; ville?: string | null; telephone?: string | null;
    email?: string | null; boite_postale?: string | null; devise?: string | null;
    numero_contribuable?: string | null; registre_commerce?: string | null;
    adresse?: string | null; region?: string | null;
}
export interface BulletinContext {
    school: SchoolFull;
    periode: { nom: string; ordre: number; type: string; term_label: string };
    classe: { nom: string; niveau: string };
    effectif: number;
    sequences: { id: string; nom: string; label: string }[];
    class_av: number | null;
    anneeLabel: string;
}
interface Img { data: string; fmt: 'PNG' | 'JPEG'; w: number; h: number; }

const N = (n: any) => (n == null ? null : Number(n));
const f2 = (n: any) => (n == null ? '' : Number(n).toFixed(2));
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

// Palette GHAHS
const BLUE: [number, number, number] = [31, 78, 140];
const DARK: [number, number, number] = [17, 24, 39];
const GREY: [number, number, number] = [90, 100, 115];

// ── Modèle GHAHS ──────────────────────────────────────────────────────────────
export function renderGHAHS(doc: any, st: DetailStudent, ctx: BulletinContext, logo: Img | null, photo: Img | null) {
    const W = 210, M = 8, x0 = M, x1 = W - M, innerW = x1 - x0;
    const { school } = ctx;
    let y = M + 2;

    const line = (r: [number, number, number]) => doc.setDrawColor(r[0], r[1], r[2]);
    const fill = (r: [number, number, number]) => doc.setFillColor(r[0], r[1], r[2]);
    const txt  = (r: [number, number, number]) => doc.setTextColor(r[0], r[1], r[2]);

    // ── En-tête bilingue + logo ───────────────────────────────────────
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); txt(DARK);
    doc.text('République Du Cameroun', x0, y);
    doc.text('Republic of Cameroon', x1, y, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); txt(GREY);
    doc.text('Ministère De L\'Enseignement Secondaire', x0, y + 3.4);
    doc.text('Ministry of Secondary Education', x1, y + 3.4, { align: 'right' });
    doc.text('Paix — Travail — Patrie', x0, y + 6.6);
    doc.text('Peace — Work — Fatherland', x1, y + 6.6, { align: 'right' });

    if (logo) {
        const h = 17, w = Math.min(20, (logo.w / logo.h) * h);
        try { doc.addImage(logo.data, logo.fmt, W / 2 - w / 2, y - 1, w, h); } catch { /* ignore */ }
    }
    y += 18;

    // Ligne de contacts
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); txt(DARK);
    const l1 = [
        school.boite_postale ? `BP/ P.O Box ${school.boite_postale}` : null,
        school.telephone ? `Tel: ${school.telephone}` : null,
        school.numero_contribuable ? `Tax: ${school.numero_contribuable}` : null,
        school.registre_commerce ? school.registre_commerce : null,
    ].filter(Boolean).join('  |  ');
    if (l1) { doc.text(l1, W / 2, y, { align: 'center' }); y += 3.6; }
    const l2 = [
        school.devise ? `Motto: ${school.devise}` : null,
        school.email ? `E-mail: ${school.email}` : null,
    ].filter(Boolean).join('    ');
    if (l2) { doc.text(l2, W / 2, y, { align: 'center' }); y += 3.6; }

    // Nom école
    line(DARK); doc.setLineWidth(0.4); doc.line(x0, y, x1, y); y += 4.5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); txt(BLUE);
    doc.text(school.nom.toUpperCase(), W / 2, y, { align: 'center' });
    y += 3;

    // ── Bandeau identité (4 colonnes) ─────────────────────────────────
    y += 2;
    const bandH = 6.5;
    fill(BLUE); doc.rect(x0, y, innerW, bandH, 'F');
    txt([255, 255, 255]); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    const c4 = innerW / 4;
    doc.text(ctx.periode.term_label, x0 + 3, y + 4.4);
    doc.text(`ENROLMENT: ${ctx.effectif}`, x0 + c4 + 3, y + 4.4);
    doc.text('ACADEMIC REPORT CARD', x0 + 2 * c4 + 3, y + 4.4);
    doc.text(`${ctx.anneeLabel} Academic Year`, x1 - 3, y + 4.4, { align: 'right' });
    y += bandH;

    // ── Bloc identité élève ───────────────────────────────────────────
    const idH = 20, photoW = 22;
    line([148, 160, 175]); doc.setLineWidth(0.3);
    doc.rect(x0, y, innerW, idH);
    const pX = x1 - photoW;
    doc.rect(pX, y, photoW, idH);
    if (photo) { try { doc.addImage(photo.data, photo.fmt, pX + 1, y + 1, photoW - 2, idH - 2); } catch { /* ignore */ } }
    else { doc.setFontSize(6); txt([150, 160, 175]); doc.text('Photo', pX + photoW / 2, y + idH / 2, { align: 'center' }); }

    const field = (fx: number, fy: number, label: string, value: string, labelW = 22) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.4); txt(DARK);
        doc.text(label, fx, fy);
        doc.setFont('helvetica', 'normal');
        doc.text(value || '', fx + labelW, fy);
    };
    const rowY = y + 4.6, colL = x0 + 2, colM = x0 + 96, rightLim = pX;
    // ligne 1
    field(colL, rowY, 'Name:', `${st.eleve.nom} ${st.eleve.prenom}`, 12);
    field(colM, rowY, 'Sex:', st.eleve.sexe === 'F' ? 'F' : st.eleve.sexe === 'M' ? 'M' : '', 10);
    field(colM + 26, rowY, 'Class:', ctx.classe.nom, 12);
    // ligne 2
    field(colL, rowY + 5, 'Born On:', fmtDate(st.eleve.date_naissance), 16);
    field(colL + 60, rowY + 5, 'At:', st.eleve.lieu_naissance ?? '', 8);
    field(colM, rowY + 5, 'Repeater:', st.repeater ? 'Yes' : 'No', 18);
    // ligne 3
    field(colL, rowY + 10, 'ID:', st.eleve.matricule, 8);
    field(colM, rowY + 10, 'Admission No:', st.admission_no ?? '', 24);
    // ligne 4
    field(colL, rowY + 15, "Parent's / Guardian's Address:", school.adresse ?? '', 52);
    doc.line(x0, rowY + 1.5, rightLim, rowY + 1.5); // séparateur sous ligne 1
    y += idH;

    // ── Tableau des notes ─────────────────────────────────────────────
    const nT = ctx.sequences.length;
    const wSubj = 42, wTest = 13, wCoef = 11, wTotal = 14, wRank = 11, wRem = 24;
    const wT = 9;
    const wTeacher = innerW - (wSubj + nT * wT + wTest + wCoef + wTotal + wRank + wRem);
    let cx = x0;
    const cols: { key: string; w: number; label: string; align: 'left' | 'center' }[] = [
        { key: 'subj', w: wSubj, label: 'Subjects', align: 'left' },
        ...ctx.sequences.map(s => ({ key: 't', w: wT, label: s.label, align: 'center' as const })),
        { key: 'test', w: wTest, label: 'Test Av.', align: 'center' },
        { key: 'coef', w: wCoef, label: 'Coef.', align: 'center' },
        { key: 'total', w: wTotal, label: 'Total', align: 'center' },
        { key: 'rank', w: wRank, label: 'Rank', align: 'center' },
        { key: 'rem', w: wRem, label: 'Remarks', align: 'left' },
        { key: 'teacher', w: wTeacher, label: "Teacher's Name", align: 'left' },
    ];
    const xs: number[] = []; cx = x0; for (const c of cols) { xs.push(cx); cx += c.w; }
    const cellX = (i: number) => cols[i].align === 'center' ? xs[i] + cols[i].w / 2 : xs[i] + 1.5;

    const headH = 6;
    fill(BLUE); doc.rect(x0, y, innerW, headH, 'F');
    txt([255, 255, 255]); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6);
    cols.forEach((c, i) => doc.text(c.label, cellX(i), y + 4, { align: c.align === 'center' ? 'center' : 'left' }));
    y += headH;

    const rowH = 5.4;
    const subjects = [...st.subjects].sort((a, b) => a.nom.localeCompare(b.nom));
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6);
    subjects.forEach((s, ri) => {
        if (ri % 2 === 1) { fill([245, 248, 251]); doc.rect(x0, y, innerW, rowH, 'F'); }
        const isNC = s.statut !== 'saisi';
        txt(DARK); doc.setFont('helvetica', 'normal');
        doc.text(s.nom.slice(0, 30), xs[0] + 1.5, y + 3.6);
        // T scores
        ctx.sequences.forEach((_, ti) => {
            const v = s.t_scores[ti];
            doc.text(v == null ? '' : f2(v), cellX(1 + ti), y + 3.6, { align: 'center' });
        });
        const base = 1 + nT;
        // Test Av
        doc.setFont('helvetica', 'bold');
        doc.text(isNC ? (s.statut === 'absent' ? 'Abs' : 'NC') : f2(s.test_av), cellX(base), y + 3.6, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(String(s.coef), cellX(base + 1), y + 3.6, { align: 'center' });
        doc.text(isNC ? '' : f2(s.total), cellX(base + 2), y + 3.6, { align: 'center' });
        doc.text(isNC ? '' : (s.rank != null ? String(s.rank) : ''), cellX(base + 3), y + 3.6, { align: 'center' });
        doc.setFontSize(6); doc.text(isNC ? '' : s.remark, xs[base + 4] + 1.5, y + 3.6); doc.setFontSize(6.6);
        doc.text(s.teacher.slice(0, 24), xs[base + 5] + 1.5, y + 3.6);
        y += rowH;
    });

    // Ligne totaux
    fill([230, 236, 244]); doc.rect(x0, y, innerW, rowH + 0.5, 'F');
    const base = 1 + nT;
    txt(DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8);
    doc.text(String(st.total_coef), cellX(base + 1), y + 3.8, { align: 'center' });
    doc.text(f2(st.total_points), cellX(base + 2), y + 3.8, { align: 'center' });
    doc.text(`Terms Position: ${st.rang ?? '—'}/${ctx.effectif}`, xs[base + 4] + 1.5, y + 3.8);
    y += rowH + 0.5;
    // Cadre tableau
    line([148, 160, 175]); doc.setLineWidth(0.3);

    // ── Bandeau synthèse ──────────────────────────────────────────────
    y += 1;
    const sumH = 6;
    fill(BLUE); doc.rect(x0, y, innerW, sumH, 'F');
    txt([255, 255, 255]); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.4);
    const c3 = innerW / 3;
    doc.text(`No Papers Passed: ${st.no_papers_passed}`, x0 + 3, y + 4);
    doc.text(`Terms Av: ${f2(st.moyenne_generale) || '—'}`, x0 + c3 + 3, y + 4);
    doc.text(`Class Av: ${ctx.class_av != null ? f2(ctx.class_av) : '—'}`, x0 + 2 * c3 + 3, y + 4);
    y += sumH + 1.5;

    // ── Conduct (gauche) + Class Council Decision (droite) ────────────
    const blockH = 44, midX = x0 + innerW * 0.5;
    line([148, 160, 175]); doc.setLineWidth(0.3);
    doc.rect(x0, y, innerW, blockH);
    doc.line(midX, y, midX, y + blockH);

    // Titres
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.2); txt(DARK);
    doc.text('GENERAL CONDUCT', x0 + (midX - x0) / 2, y + 4, { align: 'center' });
    doc.text('CLASS COUNCIL DECISION', midX + (x1 - midX) / 2, y + 4, { align: 'center' });
    doc.line(x0, y + 5.5, x1, y + 5.5);

    // Gauche : discipline / santé
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); txt(DARK);
    const leftRows: [string, string][] = [
        ['Absences', String(st.absences ?? 0)], ['Punishment', ''], ['Warning', ''],
        ['Suspension in Days', ''], ['Parent/Guardian', ''], ['Re-opening Date', ''], ['Fees Owing', ''],
    ];
    let ly = y + 9;
    leftRows.forEach(([r, v]) => {
        doc.text(r + ' :', x0 + 2, ly);
        if (v) { doc.setFont('helvetica', 'bold'); doc.text(v, x0 + 42, ly); doc.setFont('helvetica', 'normal'); }
        doc.line(x0 + 2, ly + 1.4, midX - 2, ly + 1.4); ly += 4.4;
    });
    doc.setFont('helvetica', 'bold'); doc.text('Class Master/Mistress :', x0 + 2, ly + 0.3);

    // Droite : décision
    const moy = N(st.moyenne_generale) ?? 0;
    const passed = moy >= 10;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); txt(DARK);
    let ry = y + 9;
    doc.text('ACADEMIC WORK', midX + 3, ry); ry += 5;
    const acads: [string, boolean][] = [
        ['Needs to work harder', moy < 12],
        ['Honour roll', moy >= 14 && moy < 16],
        ["Principal's List", moy >= 16],
    ];
    acads.forEach(([lbl, on]) => {
        doc.rect(midX + 3, ry - 2.6, 3, 3);
        if (on) { doc.setFont('helvetica', 'bold'); doc.text('X', midX + 3.6, ry - 0.2); doc.setFont('helvetica', 'normal'); }
        doc.text(lbl, midX + 8, ry); ry += 5;
    });
    ry += 1;
    const decs: [string, boolean][] = [['Warning', false], ['Dismissed', false], ['Passed', passed], ['Failed', !passed]];
    let dx = midX + 3;
    decs.forEach(([lbl, on]) => {
        doc.rect(dx, ry - 2.6, 3, 3);
        if (on) { doc.setFont('helvetica', 'bold'); doc.text('X', dx + 0.6, ry - 0.2); doc.setFont('helvetica', 'normal'); }
        doc.text(lbl, dx + 4, ry); dx += 22;
    });
    ry += 8;
    doc.text('Principal :', midX + 3, ry);
    doc.line(midX + 20, ry, x1 - 3, ry);
    y += blockH;

    // ── Pied ──────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'italic'); doc.setFontSize(6); txt([150, 160, 175]);
    doc.text('DISCLAIMER: Any cancellation on the report card is not the hand work of the school.', x0, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(`${school.nom} — ${new Date().toLocaleDateString('en-GB')}`, x1, y + 4, { align: 'right' });
}

// ── Registre des modèles ──────────────────────────────────────────────────────
export type TemplateId = 'ghahs';
const TEMPLATES: Record<TemplateId, (doc: any, st: DetailStudent, ctx: BulletinContext, logo: Img | null, photo: Img | null) => void> = {
    ghahs: renderGHAHS,
};
const ACTIVE_TEMPLATE: TemplateId = 'ghahs';

// ── Points d'entrée téléchargement ────────────────────────────────────────────
export async function downloadBulletinDetailed(st: DetailStudent, ctx: BulletinContext, template: TemplateId = ACTIVE_TEMPLATE) {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const [logo, photo] = await Promise.all([loadImg(ctx.school.logo_url), loadImg(st.eleve.photo_url)]);
    TEMPLATES[template](doc, st, ctx, logo, photo);
    doc.save(`bulletin_${st.eleve.nom}_${st.eleve.prenom}_${ctx.periode.nom.replace(/\s+/g, '_')}.pdf`);
}

export async function downloadClassDetailed(students: DetailStudent[], ctx: BulletinContext, template: TemplateId = ACTIVE_TEMPLATE) {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logo = await loadImg(ctx.school.logo_url);
    for (let i = 0; i < students.length; i++) {
        if (i > 0) doc.addPage();
        const photo = await loadImg(students[i].eleve.photo_url);
        TEMPLATES[template](doc, students[i], ctx, logo, photo);
    }
    doc.save(`bulletins_${ctx.classe.nom.replace(/\s+/g, '_')}_${ctx.periode.nom.replace(/\s+/g, '_')}.pdf`);
}
