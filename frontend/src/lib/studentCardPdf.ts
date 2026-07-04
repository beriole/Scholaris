// Génération PDF des cartes d'étudiant (format CR80) — charte GHAHS verte.
// jsPDF natif. Deux points d'entrée : une carte, ou toute une classe en grille A4.
import { loadImg } from './bulletinPdf';

interface Img { data: string; fmt: 'PNG' | 'JPEG'; w: number; h: number; }

export interface CardStudent {
    matricule: string;
    nom: string;
    prenom: string;
    sexe?: string | null;
    date_naissance?: string | null;
    lieu_naissance?: string | null;
    nationalite?: string | null;
    photo_url?: string | null;
    numero_admission?: string | null;
    classe?: string | null;
    niveau?: string | null;
}
export interface CardSchool {
    nom: string; logo_url?: string | null; ville?: string | null; telephone?: string | null;
    email?: string | null; boite_postale?: string | null; devise?: string | null;
}
export interface CardContext {
    school: CardSchool;
    anneeLabel: string;
    validTill?: string;      // ex: 'Aug 2026'
}

const GREEN: [number, number, number] = [6, 95, 70];
const GREEN_DK: [number, number, number] = [4, 66, 48];
const GOLD: [number, number, number] = [176, 141, 63];
const DARK: [number, number, number] = [17, 24, 39];
const GREY: [number, number, number] = [100, 110, 122];
const IVORY: [number, number, number] = [250, 250, 246];

const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// Code-barres pseudo déterministe depuis le matricule.
function barcode(doc: any, x: number, y: number, w: number, h: number, seed: string) {
    let acc = 0; for (let i = 0; i < seed.length; i++) acc += seed.charCodeAt(i) * (i + 3);
    let n = acc || 12345;
    doc.setFillColor(20, 20, 20);
    let cx = x;
    while (cx < x + w) {
        n = (n * 1103515245 + 12345) & 0x7fffffff;
        const bw = 0.22 + (n % 5) * 0.12;
        n = (n * 1103515245 + 12345) & 0x7fffffff;
        const gap = 0.22 + (n % 4) * 0.14;
        if (cx + bw > x + w) break;
        doc.rect(cx, y, bw, h, 'F');
        cx += bw + gap;
    }
}

// Guilloché discret (lignes ondulées) pour texturer le panneau.
function guilloche(doc: any, x: number, y: number, w: number, h: number, col: number[], lines = 4) {
    doc.setDrawColor(col[0], col[1], col[2]); doc.setLineWidth(0.1);
    const steps = 48;
    for (let l = 0; l < lines; l++) {
        const phase = (l / lines) * Math.PI * 2;
        let px = x, py = y + h / 2;
        for (let i = 1; i <= steps; i++) {
            const nx = x + (w / steps) * i;
            const ny = y + h / 2 + Math.sin((i / steps) * Math.PI * 5 + phase) * (h * 0.32) * Math.sin((i / steps) * Math.PI);
            doc.line(px, py, nx, ny); px = nx; py = ny;
        }
    }
}

// Dessine UNE carte (recto unique) dans le rectangle (X,Y,w,h). Exporté pour test/réutilisation.
export function drawCard(doc: any, X: number, Y: number, w: number, h: number, st: CardStudent, ctx: CardContext, logo: Img | null, photo: Img | null) {
    const r = 3.4, LP = 30;          // LP = largeur panneau gauche
    const { school } = ctx;
    const initials = school.nom.split(/\s+/).filter(Boolean).slice(0, 3).map(s => s[0]?.toUpperCase() ?? '').join('') || 'GH';

    // ombre + corps blanc + bord
    doc.setFillColor(214, 222, 230); doc.roundedRect(X + 0.8, Y + 1, w, h, r, r, 'F');
    doc.setFillColor(255, 255, 255); doc.roundedRect(X, Y, w, h, r, r, 'F');
    doc.setDrawColor(206, 214, 222); doc.setLineWidth(0.3); doc.roundedRect(X, Y, w, h, r, r, 'S');

    // ── Panneau gauche émeraude (coins gauches arrondis) ─────────
    doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]); doc.roundedRect(X, Y, LP, h, r, r, 'F');
    doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]); doc.rect(X + LP - r, Y, r, h, 'F');
    // profondeur (triangle bas) + guilloché
    doc.setFillColor(GREEN_DK[0], GREEN_DK[1], GREEN_DK[2]);
    doc.triangle(X, Y + h, X + LP, Y + h, X, Y + h - 14, 'F');
    guilloche(doc, X + 1.5, Y + 1.5, LP - 3, h - 3, [255, 255, 255], 4);
    // filet doré séparateur vertical
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(0.7); doc.line(X + LP, Y, X + LP, Y + h);

    // médaillon logo/monogramme en haut du panneau
    const mcx = X + LP / 2, mcy = Y + 6.5, mr = 4.8;
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]); doc.circle(mcx, mcy, mr, 'F');
    doc.setFillColor(IVORY[0], IVORY[1], IVORY[2]); doc.circle(mcx, mcy, mr - 0.7, 'F');
    if (logo) {
        const lh = (mr - 1.3) * 2, lw = Math.min(lh, (logo.w / logo.h) * lh);
        try { doc.addImage(logo.data, logo.fmt, mcx - lw / 2, mcy - lh / 2, lw, lh); } catch { /* ignore */ }
    } else {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.4); doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
        doc.text(initials, mcx, mcy + 2.1, { align: 'center' });
    }

    // photo encadrée or
    const pw = 21, ph = 25, px = X + (LP - pw) / 2, py = Y + 12.5;
    doc.setFillColor(255, 255, 255); doc.roundedRect(px - 0.8, py - 0.8, pw + 1.6, ph + 1.6, 1.8, 1.8, 'F');
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(0.5); doc.roundedRect(px - 0.8, py - 0.8, pw + 1.6, ph + 1.6, 1.8, 1.8, 'S');
    doc.setFillColor(236, 240, 244); doc.roundedRect(px, py, pw, ph, 1.4, 1.4, 'F');
    if (photo) {
        try { doc.addImage(photo.data, photo.fmt, px, py, pw, ph); } catch { /* ignore */ }
    } else {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(150, 160, 170);
        doc.text(`${st.nom[0] ?? ''}${st.prenom[0] ?? ''}`.toUpperCase(), px + pw / 2, py + ph / 2 + 1.8, { align: 'center' });
    }

    // chip matricule (bas du panneau)
    const chipY = Y + h - 8;
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]); doc.roundedRect(px - 0.8, chipY, pw + 1.6, 5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); doc.setTextColor(255, 255, 255);
    doc.text(st.matricule, mcx, chipY + 3.4, { align: 'center' });

    // ── Zone droite ──────────────────────────────────────────────
    const rx = X + LP + 4, rRight = X + w - 4;
    // drapeau camerounais (coin haut droit)
    const fbw = 2.4, fbh = 3.4, fb = rRight - 3 * fbw, fbt = Y + 3;
    doc.setFillColor(16, 122, 74); doc.rect(fb, fbt, fbw, fbh, 'F');
    doc.setFillColor(206, 32, 42); doc.rect(fb + fbw, fbt, fbw, fbh, 'F');
    doc.setFillColor(244, 196, 48); doc.rect(fb + 2 * fbw, fbt, fbw, fbh, 'F');

    // nom école + sous-titre
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.8); doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
    const sName = doc.splitTextToSize(school.nom.toUpperCase(), (rRight - rx) - 9);
    doc.text(sName.slice(0, 2), rx, Y + 5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.4); doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.text('STUDENT IDENTITY CARD', rx, Y + (sName.length > 1 ? 12 : 8.5), { charSpace: 0.3 });
    // filet doré sous le titre
    const ruleY = Y + (sName.length > 1 ? 13.6 : 10);
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(0.4); doc.line(rx, ruleY, rRight, ruleY);

    // nom de l'élève
    let cy = ruleY + 4.4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.text(doc.splitTextToSize(`${st.nom} ${st.prenom}`.trim(), rRight - rx).slice(0, 1), rx, cy);
    cy += 1;

    // grille d'infos (2 colonnes × 3 rangées)
    const colGap = (rRight - rx) / 2;
    const rowH = 6.4;
    const field = (cx: number, fy: number, label: string, value: string) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(4.9); doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
        doc.text(label.toUpperCase(), cx, fy, { charSpace: 0.2 });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(DARK[0], DARK[1], DARK[2]);
        doc.text(doc.splitTextToSize(value || '—', colGap - 2).slice(0, 1), cx, fy + 3);
    };
    const sexTxt = st.sexe === 'F' ? 'Female' : st.sexe === 'M' ? 'Male' : '—';
    const gTop = cy + 3.6;
    field(rx, gTop, 'Class', st.classe ?? '—');
    field(rx + colGap, gTop, 'Adm No', st.numero_admission ?? '—');
    field(rx, gTop + rowH, 'Date of Birth', fmtDate(st.date_naissance));
    field(rx + colGap, gTop + rowH, 'Sex', sexTxt);
    field(rx, gTop + 2 * rowH, 'Place of Birth', st.lieu_naissance ?? '—');
    field(rx + colGap, gTop + 2 * rowH, 'Nationality', st.nationalite ?? '—');

    // ── Pied droite : code-barres + année/validité + signature ───
    const footY = Y + h - 9;
    doc.setDrawColor(228, 233, 238); doc.setLineWidth(0.2); doc.line(rx, footY - 1.4, rRight, footY - 1.4);
    barcode(doc, rx, footY, 30, 4, st.matricule + (st.numero_admission ?? ''));
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.6); doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
    doc.text(`A.Y ${ctx.anneeLabel}`, rRight, footY + 1.2, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(4.8); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text(`Valid till ${ctx.validTill ?? '31 Aug ' + (ctx.anneeLabel.split(/[-/]/)[1] || '')}`, rRight, footY + 4.4, { align: 'right' });
    // ligne de signature
    doc.setDrawColor(150, 158, 168); doc.setLineWidth(0.2); doc.line(rRight - 20, footY + 7, rRight, footY + 7);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(4.6); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text('Principal', rRight, footY + 9.4, { align: 'right' });
}

// Une seule carte, centrée sur une petite page.
export async function downloadStudentCard(st: CardStudent, ctx: CardContext) {
    const { default: jsPDF } = await import('jspdf');
    const w = 85.6, h = 54, pad = 8;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [w + pad * 2, h + pad * 2] });
    const [logo, photo] = await Promise.all([loadImg(ctx.school.logo_url), loadImg(st.photo_url)]);
    drawCard(doc, pad, pad, w, h, st, ctx, logo, photo);
    doc.save(`student_card_${st.nom}_${st.prenom}.pdf`.replace(/\s+/g, '_'));
}

// Toutes les cartes d'une classe en grille sur A4.
export async function downloadClassCards(students: CardStudent[], ctx: CardContext, classeName = 'class') {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, mX = 12, mY = 14, w = 85.6, h = 54, gapX = 14.8, gapY = 6;
    const cols = 2, rowsPerPage = 4, perPage = cols * rowsPerPage;
    const logo = await loadImg(ctx.school.logo_url);

    for (let i = 0; i < students.length; i++) {
        const inPage = i % perPage;
        if (i > 0 && inPage === 0) doc.addPage();
        if (inPage === 0) {
            // titre de page discret
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
            doc.text(`${ctx.school.nom} — Student Cards · ${classeName} · ${ctx.anneeLabel}`, W / 2, 8, { align: 'center' });
        }
        const col = inPage % cols, row = Math.floor(inPage / cols);
        const X = mX + col * (w + gapX);
        const Y = mY + row * (h + gapY);
        const photo = await loadImg(students[i].photo_url);
        drawCard(doc, X, Y, w, h, students[i], ctx, logo, photo);
    }
    doc.save(`student_cards_${classeName}_${ctx.anneeLabel}.pdf`.replace(/\s+/g, '_'));
}
