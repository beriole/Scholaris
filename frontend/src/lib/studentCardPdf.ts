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

// Dessine UNE carte (recto) dans le rectangle (X,Y,w,h). Exporté pour test/réutilisation.
export function drawCard(doc: any, X: number, Y: number, w: number, h: number, st: CardStudent, ctx: CardContext, logo: Img | null, photo: Img | null) {
    const r = 3, headerH = 15;
    const { school } = ctx;

    // ombre légère + corps blanc
    doc.setFillColor(224, 230, 237); doc.roundedRect(X + 0.7, Y + 0.9, w, h, r, r, 'F');
    doc.setFillColor(255, 255, 255); doc.roundedRect(X, Y, w, h, r, r, 'F');
    doc.setDrawColor(210, 218, 226); doc.setLineWidth(0.3); doc.roundedRect(X, Y, w, h, r, r, 'S');

    // en-tête émeraude (coins hauts arrondis)
    doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]); doc.roundedRect(X, Y, w, headerH, r, r, 'F');
    doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]); doc.rect(X, Y + headerH - r, w, r, 'F');
    // triangle profond pour la profondeur
    doc.setFillColor(GREEN_DK[0], GREEN_DK[1], GREEN_DK[2]);
    doc.triangle(X + w, Y, X + w, Y + headerH, X + w - 22, Y + headerH, 'F');
    // filet doré sous l'en-tête
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(0.7);
    doc.line(X, Y + headerH, X + w, Y + headerH);

    // médaillon logo / monogramme
    const mcx = X + 9, mcy = Y + headerH / 2, mr = 5.4;
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]); doc.circle(mcx, mcy, mr, 'F');
    doc.setFillColor(IVORY[0], IVORY[1], IVORY[2]); doc.circle(mcx, mcy, mr - 0.7, 'F');
    if (logo) {
        const lh = (mr - 1.4) * 2, lw = Math.min(lh, (logo.w / logo.h) * lh);
        try { doc.addImage(logo.data, logo.fmt, mcx - lw / 2, mcy - lh / 2, lw, lh); } catch { /* ignore */ }
    } else {
        const initials = school.nom.split(/\s+/).filter(Boolean).slice(0, 3).map(s => s[0]?.toUpperCase() ?? '').join('');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
        doc.text(initials || 'GH', mcx, mcy + 2.4, { align: 'center' });
    }

    // nom école + sous-titre
    const hx = X + 17;
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.4);
    const nameLines = doc.splitTextToSize(school.nom.toUpperCase(), w - 24);
    doc.text(nameLines.slice(0, 2), hx, Y + 5.6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5.6); doc.setTextColor(198, 226, 214);
    doc.text('STUDENT IDENTITY CARD', hx, Y + headerH - 2.4);

    // drapeau camerounais (3 barres) coin haut droit
    const fb = X + w - 12, fbt = Y + 2.4, fbw = 2.6, fbh = 3.4;
    doc.setFillColor(16, 122, 74); doc.rect(fb, fbt, fbw, fbh, 'F');
    doc.setFillColor(206, 32, 42); doc.rect(fb + fbw, fbt, fbw, fbh, 'F');
    doc.setFillColor(244, 196, 48); doc.rect(fb + 2 * fbw, fbt, fbw, fbh, 'F');

    // ── Corps ────────────────────────────────────────────────
    const bodyTop = Y + headerH + 2.5;
    // photo
    const pw = 19, ph = 23, px = X + 4, py = bodyTop;
    doc.setFillColor(238, 242, 246); doc.roundedRect(px, py, pw, ph, 1.5, 1.5, 'F');
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(0.4); doc.roundedRect(px, py, pw, ph, 1.5, 1.5, 'S');
    if (photo) {
        try { doc.addImage(photo.data, photo.fmt, px + 0.7, py + 0.7, pw - 1.4, ph - 1.4); } catch { /* ignore */ }
    } else {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(150, 160, 170);
        doc.text(`${st.nom[0] ?? ''}${st.prenom[0] ?? ''}`.toUpperCase(), px + pw / 2, py + ph / 2 + 1.5, { align: 'center' });
    }

    // nom élève
    const ix = px + pw + 4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    const fullName = `${st.nom} ${st.prenom}`.trim();
    doc.text(doc.splitTextToSize(fullName, w - (ix - X) - 4).slice(0, 1), ix, bodyTop + 3);

    // champs
    const field = (fy: number, label: string, value: string) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(5.4); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text(label.toUpperCase(), ix, fy);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.2); doc.setTextColor(DARK[0], DARK[1], DARK[2]);
        doc.text(value || '—', ix, fy + 3);
    };
    const cls = st.classe ? (st.niveau && st.niveau !== st.classe ? `${st.classe}` : st.classe) : '—';
    field(bodyTop + 7.5, 'Class', cls);
    field(bodyTop + 14.5, 'ID / Matricule', st.matricule);
    // 2e colonne de champs
    const ix2 = ix + 34;
    const field2 = (fy: number, label: string, value: string) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(5.4); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text(label.toUpperCase(), ix2, fy);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.2); doc.setTextColor(DARK[0], DARK[1], DARK[2]);
        doc.text(value || '—', ix2, fy + 3);
    };
    field2(bodyTop + 7.5, 'Adm No', st.numero_admission ?? '—');
    field2(bodyTop + 14.5, 'Date of Birth', fmtDate(st.date_naissance));

    // ── Pied : code-barres + année/validité ──────────────────
    const footY = Y + h - 8.5;
    doc.setDrawColor(226, 232, 238); doc.setLineWidth(0.2); doc.line(X + 4, footY - 1.5, X + w - 4, footY - 1.5);
    barcode(doc, X + 4, footY, 34, 4.2, st.matricule + (st.numero_admission ?? ''));
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text(st.matricule, X + 4, footY + 6.6);
    // année + validité (droite)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
    doc.text(`A.Y ${ctx.anneeLabel}`, X + w - 4, footY + 1.5, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5.2); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text(`Valid till ${ctx.validTill ?? '31 Aug ' + (ctx.anneeLabel.split(/[-/]/)[1] || '')}`, X + w - 4, footY + 5, { align: 'right' });
    doc.text('Signature', X + w - 4, footY + 8.4, { align: 'right' });
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
