// Moteur de modèles de bulletins — extensible.
// Un modèle = une fonction qui dessine UN bulletin sur la page jsPDF courante.
// Modèle GHAHS : reproduction fidèle du report card officiel (charte verte).
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
    classe: { nom: string; niveau: string; serie?: string | null };
    effectif: number;
    sequences: { id: string; nom: string; label: string }[];
    class_av: number | null;
    anneeLabel: string;
}
interface Img { data: string; fmt: 'PNG' | 'JPEG'; w: number; h: number; }

const N = (n: any) => (n == null ? null : Number(n));
const f2 = (n: any) => (n == null ? '' : Number(n).toFixed(2));
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

// Charte GHAHS — verte
const GREEN: [number, number, number] = [6, 95, 70];      // bandeaux (emerald-800)
const GREEN_LT: [number, number, number] = [220, 238, 231]; // fond léger
const DARK: [number, number, number] = [17, 24, 39];
const GREY: [number, number, number] = [90, 100, 115];
const LINE: [number, number, number] = [120, 130, 140];

// ── Décors ────────────────────────────────────────────────────────────────────
function star(doc: any, cx: number, cy: number, r: number, color: [number, number, number]) {
    const pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 ? r * 0.42 : r;
        pts.push([cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)]);
    }
    const rel = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.lines(rel, pts[0][0], pts[0][1], [1, 1], 'F', true);
}

// Ruban drapeau camerounais (vert-rouge-jaune) + toque au coin. dir=1 gauche, -1 droite.
function flagCorner(doc: any, cornerX: number, topY: number, dir: number) {
    const s = 22;
    const p = (dx: number) => cornerX + dir * dx;
    // triangle drapeau (bande diagonale)
    // vert
    doc.setFillColor(7, 104, 74);
    doc.triangle(p(0), topY, p(s), topY, p(0), topY + s, 'F');
    // rouge (bande médiane) — triangle décalé
    doc.setFillColor(200, 30, 40);
    doc.triangle(p(4), topY, p(s), topY, p(4), topY + s - 4, 'F');
    // jaune (bord)
    doc.setFillColor(240, 190, 30);
    doc.triangle(p(11), topY, p(s), topY, p(11), topY + s - 11, 'F');
    // étoile jaune sur le rouge
    star(doc, p(8.5), topY + 8, 2.1, [245, 205, 40]);
    // toque (graduation cap) sous le ruban
    const cx = p(9), cy = topY + s + 4;
    doc.setFillColor(30, 35, 45);
    doc.lines([[6, -3], [-6, -3], [-6, 3]], cx, cy, [1, 1], 'F', true); // losange (mortarboard)
    doc.setFillColor(45, 52, 66);
    doc.rect(cx - 2.2, cy, 4.4, 2.4, 'F'); // base
    doc.setDrawColor(30, 35, 45); doc.setLineWidth(0.3);
    doc.line(cx, cy - 3, cx + 4.5, cy - 1.5); // cordon
    doc.setFillColor(210, 170, 40); doc.circle(cx + 4.5, cy + 0.5, 0.7, 'F'); // gland
}

// Code-barres pseudo (déterministe depuis une chaîne)
function barcode(doc: any, x: number, y: number, w: number, h: number, seed: string) {
    doc.setFillColor(255, 255, 255); doc.rect(x, y, w, h, 'F');
    doc.setFillColor(20, 20, 20);
    let cx = x + 1;
    let acc = 0; for (let i = 0; i < seed.length; i++) acc += seed.charCodeAt(i) * (i + 3);
    let n = acc || 12345;
    while (cx < x + w - 1) {
        n = (n * 1103515245 + 12345) & 0x7fffffff;
        const bw = 0.25 + (n % 5) * 0.18;       // largeur barre
        n = (n * 1103515245 + 12345) & 0x7fffffff;
        const gap = 0.25 + (n % 4) * 0.2;        // espace
        if (cx + bw > x + w - 1) break;
        doc.rect(cx, y, bw, h, 'F');
        cx += bw + gap;
    }
}

// Vague + globe au pied de page (charte verte)
function waveFooter(doc: any, W: number, H: number) {
    const base = H - 16;
    const build = (amp: number, off: number, col: [number, number, number]) => {
        const steps = 48; const pts: [number, number][] = [];
        for (let i = 0; i <= steps; i++) {
            const px = (W / steps) * i;
            const py = base + off - Math.sin((i / steps) * Math.PI * 2) * amp;
            pts.push([px, py]);
        }
        pts.push([W, H]); pts.push([0, H]);
        const rel = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
        doc.setFillColor(col[0], col[1], col[2]);
        doc.lines(rel, pts[0][0], pts[0][1], [1, 1], 'F', true);
    };
    build(3.2, 2.5, [16, 130, 96]);   // vague claire
    build(3.2, 5, GREEN);              // vague foncée
    // globe
    const gx = 30, gy = base + 2, gr = 6.5;
    doc.setFillColor(23, 145, 105); doc.circle(gx, gy, gr, 'F');
    doc.setDrawColor(230, 245, 238); doc.setLineWidth(0.3);
    doc.circle(gx, gy, gr, 'S');
    doc.ellipse(gx, gy, gr * 0.45, gr, 'S');
    doc.line(gx - gr, gy, gx + gr, gy);
    doc.line(gx - gr * 0.85, gy - gr * 0.5, gx + gr * 0.85, gy - gr * 0.5);
    doc.line(gx - gr * 0.85, gy + gr * 0.5, gx + gr * 0.85, gy + gr * 0.5);
}

// ── Modèle GHAHS ──────────────────────────────────────────────────────────────
export function renderGHAHS(doc: any, st: DetailStudent, ctx: BulletinContext, logo: Img | null, photo: Img | null) {
    const W = 210, H = 297, M = 8, x0 = M, x1 = W - M, innerW = x1 - x0;
    const { school } = ctx;
    const setDraw = () => { doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.25); };
    const band = (yy: number, hh: number) => { doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]); doc.rect(x0, yy, innerW, hh, 'F'); };

    // ── Décors coins ─────────────────────────────────────────────
    flagCorner(doc, x0 + 2, M + 2, 1);
    flagCorner(doc, x1 - 2, M + 2, -1);

    // ── En-tête ministériel (Times) ──────────────────────────────
    let y = M + 4;
    const hx = x0 + 32; // décalage pour laisser la place au ruban
    doc.setFont('times', 'bold'); doc.setFontSize(9); doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.text('République Du Cameroun', hx, y);
    doc.text('Republic of Cameroon', x1 - 32, y, { align: 'right' });
    doc.setFont('times', 'normal'); doc.setFontSize(7.5); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text("Ministère De L'Enseignement Secondaire", hx, y + 3.6);
    doc.text('Ministry of Secondary Education', x1 - 32, y + 3.6, { align: 'right' });
    doc.text('Paix — Travail — Patrie', hx, y + 7);
    doc.text('Peace — Work — Fatherland', x1 - 32, y + 7, { align: 'right' });

    // logo central
    if (logo) {
        const h = 18, w = Math.min(20, (logo.w / logo.h) * h);
        try { doc.addImage(logo.data, logo.fmt, W / 2 - w / 2, y - 1, w, h); } catch { /* ignore */ }
    } else {
        // écusson vert de repli
        doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
        doc.lines([[9, 0], [0, 11], [-9, 5], [-9, -5], [0, -11]], W / 2 - 0, y - 1, [1, 1], 'F', true);
    }
    y += 17;

    // ── Encadré contacts ─────────────────────────────────────────
    setDraw(); doc.rect(x0 + 28, y, innerW - 56, 9);
    doc.setFont('times', 'normal'); doc.setFontSize(7.6); doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    const l1 = [
        school.boite_postale ? `BP/ P.O Box ${school.boite_postale}` : null,
        school.telephone ? `Tel: ${school.telephone}` : null,
        school.numero_contribuable ? `Tax: ${school.numero_contribuable}` : null,
        school.registre_commerce ? school.registre_commerce : null,
    ].filter(Boolean).join('  ');
    const l2 = [school.devise ? `Motto: ${school.devise}` : null, school.email ? `E-mail: ${school.email}` : null].filter(Boolean).join('    ');
    doc.text(l1, W / 2, y + 3.6, { align: 'center' });
    doc.text(l2, W / 2, y + 7.2, { align: 'center' });
    y += 11.5;

    // ── Nom école ────────────────────────────────────────────────
    doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
    doc.text(school.nom.toUpperCase(), W / 2, y, { align: 'center' });
    y += 3;

    // ── Bandeau identité (4 colonnes) ────────────────────────────
    y += 1.5;
    const bandH = 6.5; band(y, bandH);
    doc.setTextColor(255, 255, 255); doc.setFont('times', 'bold'); doc.setFontSize(8.5);
    const c4 = innerW / 4;
    doc.text(ctx.periode.term_label, x0 + 3, y + 4.4);
    doc.text(`ENROLMENT: ${ctx.effectif}`, x0 + c4 + 3, y + 4.4);
    doc.text('ACADEMIC REPORT CARD', x0 + 2 * c4 + 3, y + 4.4);
    doc.text(`${ctx.anneeLabel} Academic Year`, x1 - 3, y + 4.4, { align: 'right' });
    y += bandH;

    // ── Bloc identité (grille) ───────────────────────────────────
    const idTop = y, photoW = 24, idH = 21;
    const gx = x1 - photoW;                     // limite gauche photo
    const rH = idH / 3;
    setDraw();
    doc.rect(x0, idTop, innerW, idH);           // cadre
    doc.rect(gx, idTop, photoW, idH);           // case photo
    if (photo) { try { doc.addImage(photo.data, photo.fmt, gx + 1, idTop + 1, photoW - 2, idH - 2); } catch { /* ignore */ } }
    else { doc.setFont('times', 'normal'); doc.setFontSize(7); doc.setTextColor(150, 160, 170); doc.text('Photo', gx + photoW / 2, idTop + idH / 2, { align: 'center' }); }
    // lignes horizontales (3 rangées)
    doc.line(x0, idTop + rH, gx, idTop + rH);
    doc.line(x0, idTop + 2 * rH, gx, idTop + 2 * rH);
    // séparateurs verticaux internes
    const colB = x0 + (gx - x0) * 0.55;
    doc.line(colB, idTop, colB, idTop + 2 * rH);

    const classLabel = ctx.classe.serie ? `${ctx.classe.niveau} - ${ctx.classe.serie}` : ctx.classe.nom;
    const fld = (fx: number, fy: number, label: string, value: string) => {
        doc.setFont('times', 'bold'); doc.setFontSize(8); doc.setTextColor(DARK[0], DARK[1], DARK[2]);
        const lw = doc.getTextWidth(label + ' ');
        doc.text(label, fx, fy);
        doc.setFont('times', 'normal');
        doc.text(value || '', fx + lw, fy);
    };
    const ry = idTop + 4.4;
    fld(x0 + 2, ry, 'Name:', `${st.eleve.nom} ${st.eleve.prenom}`);
    fld(colB + 2, ry, 'Sex:', st.eleve.sexe === 'F' ? 'F' : st.eleve.sexe === 'M' ? 'M' : '');
    fld(x0 + 2, ry + rH, 'Born On:', fmtDate(st.eleve.date_naissance));
    fld(colB + 2, ry + rH, 'Class:', classLabel);
    // 3e rangée
    fld(x0 + 2, ry + 2 * rH, 'At:', st.eleve.lieu_naissance ?? '');
    fld(colB + 2, ry + 2 * rH, 'Repeater:', st.repeater ? 'Yes' : 'No');
    // au-dessus dans la photo-zone : ID + Admission (ligne supérieure droite)
    fld(colB + 46, ry, 'ID:', st.eleve.matricule);
    fld(colB + 46, ry + rH, 'Adm No:', st.admission_no ?? '');
    y = idTop + idH;

    // ── Tableau des notes (grille complète) ──────────────────────
    const cols = [
        { key: 'subj', w: 40, label: 'Subjects', a: 'left' as const },
        { key: 't1', w: 8, label: 'T1', a: 'center' as const },
        { key: 't2', w: 8, label: 'T2', a: 'center' as const },
        { key: 't3', w: 8, label: 'T3', a: 'center' as const },
        { key: 'av', w: 16, label: 'Test Av.', a: 'center' as const },
        { key: 'coef', w: 12, label: 'Coef.', a: 'center' as const },
        { key: 'tot', w: 16, label: 'Total', a: 'center' as const },
        { key: 'rank', w: 12, label: 'Rank', a: 'center' as const },
        { key: 'rem', w: 24, label: 'Remarks', a: 'left' as const },
        { key: 'teach', w: innerW - (40 + 24 + 16 + 12 + 16 + 12 + 24), label: "Teacher's Name", a: 'left' as const },
    ];
    const xs: number[] = []; { let cx = x0; for (const c of cols) { xs.push(cx); cx += c.w; } }
    const cAlignX = (i: number) => cols[i].a === 'center' ? xs[i] + cols[i].w / 2 : xs[i] + 1.6;
    const tblTop = y, headH = 6, rowH = 5.6;

    band(y, headH);
    doc.setTextColor(255, 255, 255); doc.setFont('times', 'bold'); doc.setFontSize(7);
    cols.forEach((c, i) => doc.text(c.label, cAlignX(i), y + 4, { align: c.a === 'center' ? 'center' : 'left' }));
    y += headH;

    const subjects = [...st.subjects].sort((a, b) => a.nom.localeCompare(b.nom));
    const rgb = (v: number | null): [number, number, number] => v == null ? [120, 120, 120] : v >= 10 ? DARK : [200, 40, 40];
    doc.setFont('times', 'normal'); doc.setFontSize(7);
    subjects.forEach(s => {
        const isNC = s.statut !== 'saisi';
        doc.setTextColor(DARK[0], DARK[1], DARK[2]); doc.setFont('times', 'normal');
        doc.text(s.nom.slice(0, 26), xs[0] + 1.6, y + 3.8);
        for (let ti = 0; ti < 3; ti++) {
            const v = s.t_scores[ti];
            doc.text(v == null ? '' : (Math.round(v * 100) / 100).toString(), cAlignX(1 + ti), y + 3.8, { align: 'center' });
        }
        const [r, g, b] = rgb(s.test_av);
        doc.setFont('times', 'bold'); doc.setTextColor(r, g, b);
        doc.text(isNC ? (s.statut === 'absent' ? 'Abs' : 'NC') : f2(s.test_av), cAlignX(4), y + 3.8, { align: 'center' });
        doc.setFont('times', 'normal'); doc.setTextColor(DARK[0], DARK[1], DARK[2]);
        doc.text(f2(s.coef), cAlignX(5), y + 3.8, { align: 'center' });
        doc.text(isNC ? '' : f2(s.total), cAlignX(6), y + 3.8, { align: 'center' });
        doc.text(isNC ? '' : (s.rank != null ? String(s.rank) : ''), cAlignX(7), y + 3.8, { align: 'center' });
        doc.setFontSize(6.2); doc.text(isNC ? '' : s.remark, xs[8] + 1.6, y + 3.8); doc.setFontSize(7);
        doc.text(s.teacher.slice(0, 26), xs[9] + 1.6, y + 3.8);
        y += rowH;
    });

    // ligne totaux
    doc.setFillColor(GREEN_LT[0], GREEN_LT[1], GREEN_LT[2]); doc.rect(x0, y, innerW, rowH, 'F');
    doc.setFont('times', 'bold'); doc.setTextColor(DARK[0], DARK[1], DARK[2]); doc.setFontSize(7.2);
    doc.text(f2(st.total_coef), cAlignX(5), y + 3.8, { align: 'center' });
    doc.text(f2(st.total_points), cAlignX(6), y + 3.8, { align: 'center' });
    doc.setFontSize(7); doc.text(`Terms Position: ${st.rang ?? '—'}/${ctx.effectif}`, xs[8] + 1.6, y + 3.8);
    y += rowH;
    const tblBottom = y;

    // grille du tableau
    setDraw();
    doc.rect(x0, tblTop, innerW, tblBottom - tblTop);
    for (let i = 1; i < cols.length; i++) doc.line(xs[i], tblTop, xs[i], tblBottom);
    // lignes horizontales par rangée
    let hy = tblTop + headH;
    for (let i = 0; i <= subjects.length; i++) { doc.line(x0, hy, x1, hy); hy += rowH; }

    // ── Bandeau synthèse ─────────────────────────────────────────
    band(y, headH);
    doc.setTextColor(255, 255, 255); doc.setFont('times', 'bold'); doc.setFontSize(8);
    const c3 = innerW / 3;
    doc.text(`No Papers Passed: ${st.no_papers_passed}`, x0 + 3, y + 4);
    doc.text(`Terms Av: ${f2(st.moyenne_generale) || '—'}`, x0 + c3 + 3, y + 4);
    doc.text(`Class Av: ${ctx.class_av != null ? f2(ctx.class_av) : '—'}`, x0 + 2 * c3 + 3, y + 4);
    y += headH;

    // ── General Conduct  +  Class Council Decision ───────────────
    const midX = x0 + innerW * 0.52;
    const blockTop = y;
    const titleH = 5.5;
    // titres
    setDraw();
    doc.setFillColor(GREEN_LT[0], GREEN_LT[1], GREEN_LT[2]);
    doc.rect(x0, y, midX - x0, titleH, 'F'); doc.rect(midX, y, x1 - midX, titleH, 'F');
    doc.setFont('times', 'bold'); doc.setFontSize(8); doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
    doc.text('GENERAL CONDUCT', (x0 + midX) / 2, y + 3.8, { align: 'center' });
    doc.text('CLASS COUNCIL DECISION', (midX + x1) / 2, y + 3.8, { align: 'center' });
    y += titleH;

    // ----- Gauche : DISCIPLINE | HEALTH -----
    const discLabelX = x0, discW = (midX - x0);
    const colDiscL = x0, colDiscV = x0 + 30, colHealth = x0 + 44; // sous-colonnes
    const gcRowH = 4.6;
    doc.setFont('times', 'bold'); doc.setFontSize(7); doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.text('DISCIPLINE', colDiscL + 1.5, y + 3.2);
    doc.text('HEALTH', colHealth + 1.5, y + 3.2);
    y += gcRowH;
    const disc: [string, string][] = [
        ['Absences', String(st.absences ?? 0)], ['Punishment', ''], ['Warning', ''],
        ['Suspension in Days', ''], ['Parent/Guardian', ''], ['Re-opening Date', ''], ['Fees Owing', ''],
    ];
    const health = ['Good', 'Fair', 'Needs attention', 'Other Comments'];
    doc.setFont('times', 'normal'); doc.setFontSize(6.6);
    disc.forEach((d, i) => {
        doc.setTextColor(DARK[0], DARK[1], DARK[2]);
        doc.text(d[0], colDiscL + 1.5, y + 3);
        if (d[1]) { doc.setFont('times', 'bold'); doc.text(d[1], colDiscV + 1.5, y + 3); doc.setFont('times', 'normal'); }
        if (i < health.length) doc.text(health[i], colHealth + 1.5, y + 3);
        doc.setDrawColor(210, 216, 222); doc.setLineWidth(0.2);
        doc.line(colDiscL + 1.5, y + 4, midX - 2, y + 4);
        y += gcRowH;
    });
    // Bar code
    doc.setFont('times', 'bold'); doc.setFontSize(6.6); doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.text('Bar Code:', colDiscL + 1.5, y + 3);
    barcode(doc, colDiscV, y + 0.4, midX - colDiscV - 2, 4.6, st.eleve.matricule + (st.admission_no ?? ''));
    y += gcRowH + 1;
    doc.setFont('times', 'bold'); doc.text('Class Master/Mistress:', colDiscL + 1.5, y + 3);
    doc.line(colDiscL + 34, y + 3.4, midX - 2, y + 3.4);
    const leftBottom = y + gcRowH;

    // ----- Droite : ACADEMIC WORK + décisions -----
    let ry2 = blockTop + titleH;
    const moy = N(st.moyenne_generale) ?? 0;
    const passed = moy >= 10;
    doc.setFont('times', 'bold'); doc.setFontSize(7); doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.text('ACADEMIC WORK', midX + 2, ry2 + 3.2); ry2 += gcRowH;
    const decCol = x1 - 34; // sous-colonne décisions
    const acads: [string, boolean][] = [
        ['Needs to work harder', moy < 12],
        ['Honour roll', moy >= 14 && moy < 16],
        ["Principal's List", moy >= 16],
    ];
    const decs: [string, boolean][] = [['Warning', false], ['Dismissed', false], ['Passed', passed], ['Failed', !passed]];
    doc.setFont('times', 'normal'); doc.setFontSize(6.8);
    for (let i = 0; i < 4; i++) {
        doc.setTextColor(DARK[0], DARK[1], DARK[2]);
        if (i < acads.length) {
            const [lbl, on] = acads[i];
            doc.text(lbl, midX + 2, ry2 + 3);
            if (on) { doc.setFont('times', 'bold'); doc.text('X', midX + 30, ry2 + 3); doc.setFont('times', 'normal'); }
        }
        // décision (droite)
        const [dl, don] = decs[i];
        doc.rect(decCol, ry2 + 0.6, 3, 3);
        if (don) { doc.setFont('times', 'bold'); doc.text('X', decCol + 0.6, ry2 + 3); doc.setFont('times', 'normal'); }
        doc.text(dl, decCol + 4.2, ry2 + 3);
        doc.setDrawColor(210, 216, 222); doc.setLineWidth(0.2);
        doc.line(midX + 2, ry2 + 4, x1 - 2, ry2 + 4);
        ry2 += gcRowH;
    }
    ry2 += 2;
    doc.setFont('times', 'bold'); doc.setFontSize(7); doc.text('Principal:', midX + 2, ry2 + 3);
    doc.line(midX + 20, ry2 + 3.4, x1 - 2, ry2 + 3.4);

    // cadre + séparateur du bloc conduct
    const blockBottom = Math.max(leftBottom, ry2 + gcRowH);
    setDraw();
    doc.rect(x0, blockTop, innerW, blockBottom - blockTop);
    doc.line(midX, blockTop, midX, blockBottom);
    doc.line(colDiscV, blockTop + titleH, colDiscV, blockBottom); // sépar. disc value
    doc.line(colHealth, blockTop + titleH, colHealth, leftBottom); // sépar. health
    doc.line(decCol - 2, blockTop + titleH, decCol - 2, ry2);      // sépar. décisions
    y = blockBottom;

    // ── Bandeau disclaimer ───────────────────────────────────────
    band(y, 5.5);
    doc.setTextColor(255, 255, 255); doc.setFont('times', 'italic'); doc.setFontSize(6.8);
    doc.text('DISCLAIMER: Any cancellation on the report card is not the hand work of the school.', x0 + 2, y + 3.7);

    // ── Pied : vague + globe ─────────────────────────────────────
    waveFooter(doc, W, H);
    doc.setFont('times', 'normal'); doc.setFontSize(6); doc.setTextColor(255, 255, 255);
    doc.text(`${school.nom} — ${new Date().toLocaleDateString('en-GB')}`, W / 2, H - 3, { align: 'center' });
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
    doc.save(`report_card_${st.eleve.nom}_${st.eleve.prenom}_${ctx.periode.nom.replace(/\s+/g, '_')}.pdf`);
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
    doc.save(`report_cards_${ctx.classe.nom.replace(/\s+/g, '_')}_${ctx.periode.nom.replace(/\s+/g, '_')}.pdf`);
}
