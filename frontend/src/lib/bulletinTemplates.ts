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
    annual_av?: number | null; annual_rank?: number | null;
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
    is_last_term?: boolean;
    annual_class_av?: number | null;
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
const GOLD: [number, number, number] = [176, 141, 63];      // accent doré (filets/anneaux)
const GOLD_LT: [number, number, number] = [214, 187, 122];
const GREEN_DK: [number, number, number] = [4, 66, 48];     // émeraude profond
const IVORY: [number, number, number] = [250, 250, 246];    // fond crème

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

// Faux dégradé vertical (empilement de fines bandes) — de c1 (haut) vers c2 (bas).
function vGradient(doc: any, x: number, y: number, w: number, h: number, c1: number[], c2: number[]) {
    const steps = 26;
    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
        const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
        const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
        doc.setFillColor(r, g, b);
        doc.rect(x, y + (h / steps) * i, w, h / steps + 0.3, 'F');
    }
}

// Guilloché : lignes ondulées fines entrecroisées (texture certificat/billet).
function guilloche(doc: any, x: number, y: number, w: number, h: number, col: number[], lines = 5) {
    doc.setDrawColor(col[0], col[1], col[2]); doc.setLineWidth(0.12);
    const steps = 90;
    for (let l = 0; l < lines; l++) {
        const phase = (l / lines) * Math.PI * 2;
        const amp = h * 0.28;
        const midY = y + h / 2;
        let px = x, py = midY + Math.sin(phase) * amp;
        for (let i = 1; i <= steps; i++) {
            const nx = x + (w / steps) * i;
            const ny = midY + Math.sin((i / steps) * Math.PI * 6 + phase) * amp * Math.sin((i / steps) * Math.PI);
            doc.line(px, py, nx, ny); px = nx; py = ny;
        }
    }
}

// Médaillon crest : anneaux concentriques (émeraude + filet doré), logo/monogramme au centre.
function medallion(doc: any, cx: number, cy: number, r: number, logo: Img | null, initials: string) {
    // anneau doré extérieur
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]); doc.circle(cx, cy, r, 'F');
    // disque émeraude
    doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]); doc.circle(cx, cy, r - 0.9, 'F');
    // filet doré fin intérieur
    doc.setDrawColor(GOLD_LT[0], GOLD_LT[1], GOLD_LT[2]); doc.setLineWidth(0.4);
    doc.circle(cx, cy, r - 2.4, 'S');
    // petites étoiles cardinales sur l'anneau
    for (let k = 0; k < 4; k++) {
        const a = -Math.PI / 2 + k * Math.PI / 2;
        star(doc, cx + (r - 0.45) * Math.cos(a), cy + (r - 0.45) * Math.sin(a), 0.9, IVORY);
    }
    // contenu central
    const inner = r - 3.4;
    if (logo) {
        const h = inner * 1.7, w = Math.min(inner * 1.7, (logo.w / logo.h) * h);
        try { doc.addImage(logo.data, logo.fmt, cx - w / 2, cy - h / 2, w, h); } catch { /* ignore */ }
    } else {
        doc.setFont('times', 'bold'); doc.setFontSize(r * 1.2); doc.setTextColor(IVORY[0], IVORY[1], IVORY[2]);
        doc.text(initials, cx, cy + r * 0.42, { align: 'center' });
    }
}

// Séparateur ornemental : double filet doré avec losange central + petites étoiles.
function flourish(doc: any, cx: number, y: number, halfW: number, col: number[]) {
    doc.setDrawColor(col[0], col[1], col[2]); doc.setLineWidth(0.5);
    doc.line(cx - halfW, y, cx - 5, y);
    doc.line(cx + 5, y, cx + halfW, y);
    doc.setLineWidth(0.2);
    doc.line(cx - halfW, y + 0.9, cx - 5, y + 0.9);
    doc.line(cx + 5, y + 0.9, cx + halfW, y + 0.9);
    // losange central
    doc.setFillColor(col[0], col[1], col[2]);
    doc.lines([[2.4, 1.6], [-2.4, 1.6], [-2.4, -1.6]], cx, y - 1.6, [1, 1], 'F', true);
    // petits points aux extrémités
    doc.circle(cx - halfW, y + 0.45, 0.6, 'F');
    doc.circle(cx + halfW, y + 0.45, 0.6, 'F');
}

// En-tête élégant façon certificat (bandeau dégradé, médaillon, typographie serif).
function renderHeader(doc: any, ctx: BulletinContext, logo: Img | null) {
    const W = 210, M = 8, x0 = M, x1 = W - M, innerW = x1 - x0;
    const { school } = ctx;
    const bandTop = M, bandH = 30;

    // bandeau dégradé émeraude arrondi
    vGradient(doc, x0, bandTop, innerW, bandH, GREEN_DK, [10, 120, 88]);
    // texture guilloché dorée discrète
    guilloche(doc, x0 + 2, bandTop + 2, innerW - 4, bandH - 4, [255, 255, 255], 4);
    // liseré doré du bandeau
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(0.6);
    doc.rect(x0, bandTop, innerW, bandH, 'S');
    doc.setDrawColor(GOLD_LT[0], GOLD_LT[1], GOLD_LT[2]); doc.setLineWidth(0.2);
    doc.rect(x0 + 1.2, bandTop + 1.2, innerW - 2.4, bandH - 2.4, 'S');

    // textes ministériels bilingues (dans le bandeau, blanc crème)
    const ty = bandTop + 6;
    doc.setTextColor(IVORY[0], IVORY[1], IVORY[2]);
    doc.setFont('times', 'bold'); doc.setFontSize(8);
    doc.text('République Du Cameroun', x0 + 5, ty);
    doc.text('Republic of Cameroon', x1 - 5, ty, { align: 'right' });
    doc.setFont('times', 'italic'); doc.setFontSize(6.6); doc.setTextColor(214, 230, 222);
    doc.text("Ministère De L'Enseignement Secondaire", x0 + 5, ty + 3.4);
    doc.text('Ministry of Secondary Education', x1 - 5, ty + 3.4, { align: 'right' });
    doc.text('Paix — Travail — Patrie', x0 + 5, ty + 6.4);
    doc.text('Peace — Work — Fatherland', x1 - 5, ty + 6.4, { align: 'right' });

    // médaillon central débordant sous le bandeau
    const cx = W / 2, cy = bandTop + bandH - 2, r = 12;
    // halo crème derrière le médaillon
    doc.setFillColor(IVORY[0], IVORY[1], IVORY[2]); doc.circle(cx, cy, r + 2.2, 'F');
    const initials = school.nom.split(/\s+/).filter(Boolean).slice(0, 3).map(s => s[0]?.toUpperCase() ?? '').join('');
    medallion(doc, cx, cy, r, logo, initials || 'GH');

    // nom de l'école — serif espacé, émeraude profond
    let y = bandTop + bandH + 13;
    doc.setFont('times', 'bold'); doc.setFontSize(16); doc.setTextColor(GREEN_DK[0], GREEN_DK[1], GREEN_DK[2]);
    doc.text(school.nom.toUpperCase(), cx, y, { align: 'center', charSpace: 0.6 });
    y += 2.6;

    // séparateur ornemental doré
    flourish(doc, cx, y + 1.5, innerW / 2 - 18, GOLD);
    y += 4.4;

    // devise en italique
    if (school.devise) {
        doc.setFont('times', 'italic'); doc.setFontSize(8); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text(`“${school.devise}”`, cx, y, { align: 'center' });
        y += 3.4;
    }

    // ligne de contact — puces séparatrices
    const contact = [
        school.boite_postale ? `P.O. Box ${school.boite_postale}` : null,
        school.telephone ? `Tel ${school.telephone}` : null,
        school.email ? school.email : null,
        school.numero_contribuable ? `Tax ${school.numero_contribuable}` : null,
    ].filter(Boolean).join('   •   ');
    doc.setFont('times', 'normal'); doc.setFontSize(7.4); doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.text(contact, cx, y, { align: 'center' });
    y += 2.2;
    // filet de clôture de l'en-tête
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(0.4);
    doc.line(x0 + 8, y, x1 - 8, y);
    return y + 2;
}

// ── Modèle GHAHS ──────────────────────────────────────────────────────────────
export function renderGHAHS(doc: any, st: DetailStudent, ctx: BulletinContext, logo: Img | null, photo: Img | null) {
    const W = 210, H = 297, M = 8, x0 = M, x1 = W - M, innerW = x1 - x0;
    const { school } = ctx;
    const setDraw = () => { doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.25); };
    const band = (yy: number, hh: number) => { doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]); doc.rect(x0, yy, innerW, hh, 'F'); };

    // ── En-tête élégant (bandeau dégradé + médaillon + serif) ─────
    let y = renderHeader(doc, ctx, logo);

    // ── Bandeau identité (4 colonnes) ────────────────────────────
    y += 1;
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
    // Colonnes T = nombre de séquences du term (T1/T2/T3 selon le term, comme l'officiel).
    const nT = Math.min(Math.max(ctx.sequences.length, 1), 5);
    const wT = 8, wSubj = 40, wAv = 16, wCoef = 12, wTot = 16, wRank = 12, wRem = 24;
    const wTeach = innerW - (wSubj + nT * wT + wAv + wCoef + wTot + wRank + wRem);
    const cols = [
        { w: wSubj, label: 'Subjects', a: 'left' as const },
        ...ctx.sequences.slice(0, nT).map(s => ({ w: wT, label: s.label, a: 'center' as const })),
        { w: wAv, label: 'Test Av.', a: 'center' as const },
        { w: wCoef, label: 'Coef.', a: 'center' as const },
        { w: wTot, label: 'Total', a: 'center' as const },
        { w: wRank, label: 'Rank', a: 'center' as const },
        { w: wRem, label: 'Remarks', a: 'left' as const },
        { w: wTeach, label: "Teacher's Name", a: 'left' as const },
    ];
    const base = 1 + nT; // index de « Test Av. »
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
        for (let ti = 0; ti < nT; ti++) {
            const v = s.t_scores[ti];
            doc.text(v == null ? '' : (Math.round(v * 100) / 100).toString(), cAlignX(1 + ti), y + 3.8, { align: 'center' });
        }
        const [r, g, b] = rgb(s.test_av);
        doc.setFont('times', 'bold'); doc.setTextColor(r, g, b);
        doc.text(isNC ? (s.statut === 'absent' ? 'Abs' : 'NC') : f2(s.test_av), cAlignX(base), y + 3.8, { align: 'center' });
        doc.setFont('times', 'normal'); doc.setTextColor(DARK[0], DARK[1], DARK[2]);
        doc.text(f2(s.coef), cAlignX(base + 1), y + 3.8, { align: 'center' });
        doc.text(isNC ? '' : f2(s.total), cAlignX(base + 2), y + 3.8, { align: 'center' });
        doc.text(isNC ? '' : (s.rank != null ? String(s.rank) : ''), cAlignX(base + 3), y + 3.8, { align: 'center' });
        doc.setFontSize(6.2); doc.text(isNC ? '' : s.remark, xs[base + 4] + 1.6, y + 3.8); doc.setFontSize(7);
        doc.text(s.teacher.slice(0, 26), xs[base + 5] + 1.6, y + 3.8);
        y += rowH;
    });

    // ligne totaux
    doc.setFillColor(GREEN_LT[0], GREEN_LT[1], GREEN_LT[2]); doc.rect(x0, y, innerW, rowH, 'F');
    doc.setFont('times', 'bold'); doc.setTextColor(DARK[0], DARK[1], DARK[2]); doc.setFontSize(7.2);
    doc.text(f2(st.total_coef), cAlignX(base + 1), y + 3.8, { align: 'center' });
    doc.text(f2(st.total_points), cAlignX(base + 2), y + 3.8, { align: 'center' });
    doc.setFontSize(7);
    const posStr = `Terms Position: ${st.rang ?? '—'}/${ctx.effectif}`
        + (ctx.is_last_term && st.annual_rank != null ? `    Annual Position: ${st.annual_rank}/${ctx.effectif}` : '');
    doc.text(posStr, xs[base + 4] + 1.6, y + 3.8);
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
    const seg = (ctx.is_last_term && st.annual_av != null) ? 4 : 3;
    const cs = innerW / seg;
    doc.text(`No Papers Passed: ${st.no_papers_passed}`, x0 + 3, y + 4);
    doc.text(`Terms Av: ${f2(st.moyenne_generale) || '—'}`, x0 + cs + 3, y + 4);
    doc.text(`Class Av: ${ctx.class_av != null ? f2(ctx.class_av) : '—'}`, x0 + 2 * cs + 3, y + 4);
    if (seg === 4) doc.text(`Annual Av: ${f2(st.annual_av)}`, x0 + 3 * cs + 3, y + 4);
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

// Rendu d'UN bulletin en URL blob (pour l'aperçu écran dans un <iframe>).
// Garantit que l'aperçu = le PDF téléchargé = le modèle officiel.
export async function bulletinPreviewUrl(st: DetailStudent, ctx: BulletinContext, template: TemplateId = ACTIVE_TEMPLATE): Promise<string> {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const [logo, photo] = await Promise.all([loadImg(ctx.school.logo_url), loadImg(st.eleve.photo_url)]);
    TEMPLATES[template](doc, st, ctx, logo, photo);
    return doc.output('bloburl') as unknown as string;
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
