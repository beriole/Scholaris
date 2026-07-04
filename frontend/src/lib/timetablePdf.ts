// Export PDF de l'emploi du temps d'une classe — grille hebdomadaire (charte GHAHS).
// jsPDF natif, paysage A4.
import { loadImg } from './bulletinPdf';

interface Img { data: string; fmt: 'PNG' | 'JPEG'; w: number; h: number; }

export interface TTSlot {
    jour_semaine: number;
    heure_debut: string;
    heure_fin: string;
    matiere?: { nom: string; code: string } | null;
    enseignant?: { nom: string; prenom: string } | null;
    salle?: { nom: string } | null;
}
export interface TTSchool {
    nom: string; logo_url?: string | null; ville?: string | null; telephone?: string | null;
    boite_postale?: string | null; email?: string | null; devise?: string | null;
}
export interface TTContext {
    school: TTSchool;
    classeName: string;
    anneeLabel: string;
}

const GREEN: [number, number, number] = [6, 95, 70];
const GREEN_DK: [number, number, number] = [4, 66, 48];
const GOLD: [number, number, number] = [176, 141, 63];
const DARK: [number, number, number] = [17, 24, 39];
const GREY: [number, number, number] = [90, 100, 115];
const IVORY: [number, number, number] = [250, 250, 246];

// Palette douce par matière (fond, bordure, texte).
const SUBJ_COLORS: [number[], number[], number[]][] = [
    [[209, 250, 229], [110, 231, 183], [6, 95, 70]],      // emerald
    [[219, 234, 254], [147, 197, 253], [30, 64, 175]],    // blue
    [[237, 233, 254], [196, 181, 253], [91, 33, 182]],    // purple
    [[254, 243, 199], [252, 211, 77], [146, 64, 14]],     // amber
    [[255, 228, 230], [253, 164, 175], [159, 18, 57]],    // rose
    [[207, 250, 254], [103, 232, 249], [14, 116, 144]],   // cyan
    [[236, 252, 203], [190, 242, 100], [63, 98, 18]],     // lime
    [[255, 237, 213], [253, 186, 116], [154, 52, 18]],    // orange
];

const JOURS_EN = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const fmtTime = (t: string) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

export async function downloadClassTimetable(slots: TTSlot[], ctx: TTContext) {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const logo = await loadImg(ctx.school.logo_url);
    renderTimetable(doc, slots, ctx, logo);
    doc.save(`timetable_${ctx.classeName}_${ctx.anneeLabel}.pdf`.replace(/\s+/g, '_'));
}

// Dessine la grille sur le doc fourni. Exporté pour test/réutilisation.
export function renderTimetable(doc: any, slots: TTSlot[], ctx: TTContext, logo: Img | null) {
    const W = 297, H = 210, M = 10, x0 = M, x1 = W - M, innerW = x1 - x0;
    const { school } = ctx;

    // ── En-tête émeraude ─────────────────────────────────────────
    const headerH = 24;
    doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]); doc.rect(0, 0, W, headerH, 'F');
    doc.setFillColor(GREEN_DK[0], GREEN_DK[1], GREEN_DK[2]);
    doc.triangle(W, 0, W, headerH, W - 60, headerH, 'F');
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(0.8); doc.line(0, headerH, W, headerH);

    // médaillon
    const mcx = x0 + 10, mcy = headerH / 2, mr = 8;
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]); doc.circle(mcx, mcy, mr, 'F');
    doc.setFillColor(IVORY[0], IVORY[1], IVORY[2]); doc.circle(mcx, mcy, mr - 1, 'F');
    if (logo) {
        const lh = (mr - 2) * 2, lw = Math.min(lh, (logo.w / logo.h) * lh);
        try { doc.addImage(logo.data, logo.fmt, mcx - lw / 2, mcy - lh / 2, lw, lh); } catch { /* ignore */ }
    } else {
        const initials = school.nom.split(/\s+/).filter(Boolean).slice(0, 3).map(s => s[0]?.toUpperCase() ?? '').join('');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
        doc.text(initials || 'GH', mcx, mcy + 3, { align: 'center' });
    }

    const hx = mcx + mr + 5;
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text(school.nom.toUpperCase(), hx, 10);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(200, 228, 216);
    doc.text('WEEKLY CLASS TIMETABLE', hx, 16);
    if (school.devise) { doc.setFontSize(7); doc.text(`“${school.devise}”`, hx, 20.5); }
    // droite : classe + année
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
    doc.text(ctx.classeName, x1, 11, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(200, 228, 216);
    doc.text(`Academic Year ${ctx.anneeLabel}`, x1, 17, { align: 'right' });

    // ── Construction de la grille ────────────────────────────────
    const maxDay = Math.max(5, ...slots.map(s => s.jour_semaine || 1));
    const days = Array.from({ length: Math.min(maxDay, 6) }, (_, i) => i + 1);

    // périodes uniques (par heure de début-fin), triées
    const periodKey = (s: TTSlot) => `${fmtTime(s.heure_debut)}-${fmtTime(s.heure_fin)}`;
    const periodsMap = new Map<string, { start: string; end: string; sort: number }>();
    for (const s of slots) {
        const k = periodKey(s);
        if (!periodsMap.has(k)) periodsMap.set(k, { start: fmtTime(s.heure_debut), end: fmtTime(s.heure_fin), sort: new Date(s.heure_debut).getTime() });
    }
    const periods = [...periodsMap.entries()].sort((a, b) => a[1].sort - b[1].sort);

    // couleur stable par matière
    const subjColor = new Map<string, number>();
    let ci = 0;
    for (const s of slots) {
        const code = s.matiere?.code ?? s.matiere?.nom ?? '?';
        if (!subjColor.has(code)) subjColor.set(code, ci++ % SUBJ_COLORS.length);
    }

    const gridTop = headerH + 6;
    const gridBottom = H - 12;
    const timeColW = 30;
    const dayColW = (innerW - timeColW) / days.length;
    const headRowH = 9;
    const bodyH = gridBottom - gridTop - headRowH;
    const rowH = periods.length > 0 ? Math.min(30, bodyH / periods.length) : 20;

    // en-tête colonnes (jours)
    doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]); doc.rect(x0, gridTop, innerW, headRowH, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('TIME', x0 + timeColW / 2, gridTop + 5.8, { align: 'center' });
    days.forEach((d, i) => {
        doc.text(JOURS_EN[d], x0 + timeColW + i * dayColW + dayColW / 2, gridTop + 5.8, { align: 'center' });
    });

    // lignes
    let y = gridTop + headRowH;
    if (periods.length === 0) {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(11); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text('No timetable configured for this class.', W / 2, y + 20, { align: 'center' });
    }
    periods.forEach(([, per], ri) => {
        // colonne horaire
        doc.setFillColor(ri % 2 ? 244 : 249, ri % 2 ? 247 : 250, ri % 2 ? 250 : 251);
        doc.rect(x0, y, innerW, rowH, 'F');
        doc.setFillColor(236, 240, 244); doc.rect(x0, y, timeColW, rowH, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.6); doc.setTextColor(DARK[0], DARK[1], DARK[2]);
        doc.text(per.start, x0 + timeColW / 2, y + rowH / 2 - 0.5, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text(per.end, x0 + timeColW / 2, y + rowH / 2 + 3.5, { align: 'center' });

        days.forEach((d, di) => {
            const cx = x0 + timeColW + di * dayColW;
            const slot = slots.find(s => s.jour_semaine === d && `${fmtTime(s.heure_debut)}-${fmtTime(s.heure_fin)}` === `${per.start}-${per.end}`);
            if (slot) {
                const code = slot.matiere?.code ?? slot.matiere?.nom ?? '?';
                const [bg, bd, tx] = SUBJ_COLORS[subjColor.get(code) ?? 0];
                const pad = 1.3;
                doc.setFillColor(bg[0], bg[1], bg[2]);
                doc.roundedRect(cx + pad, y + pad, dayColW - 2 * pad, rowH - 2 * pad, 1.4, 1.4, 'F');
                doc.setDrawColor(bd[0], bd[1], bd[2]); doc.setLineWidth(0.4);
                doc.roundedRect(cx + pad, y + pad, dayColW - 2 * pad, rowH - 2 * pad, 1.4, 1.4, 'S');
                // matière
                doc.setFont('helvetica', 'bold'); doc.setFontSize(7.6); doc.setTextColor(tx[0], tx[1], tx[2]);
                const nameLines = doc.splitTextToSize(slot.matiere?.nom ?? '—', dayColW - 4).slice(0, 2);
                doc.text(nameLines, cx + dayColW / 2, y + rowH / 2 - (nameLines.length > 1 ? 2.6 : 0.2), { align: 'center' });
                // enseignant + salle
                doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(tx[0], tx[1], tx[2]);
                const teacher = slot.enseignant ? `${slot.enseignant.prenom} ${slot.enseignant.nom}`.trim() : '';
                if (teacher) doc.text(doc.splitTextToSize(teacher, dayColW - 4).slice(0, 1), cx + dayColW / 2, y + rowH - 4.4, { align: 'center' });
                if (slot.salle?.nom) doc.text(slot.salle.nom, cx + dayColW / 2, y + rowH - 1.8, { align: 'center' });
            }
        });
        y += rowH;
    });

    // cadre + quadrillage
    doc.setDrawColor(200, 210, 218); doc.setLineWidth(0.3);
    doc.rect(x0, gridTop, innerW, headRowH + periods.length * rowH);
    doc.line(x0 + timeColW, gridTop, x0 + timeColW, y);
    for (let i = 1; i < days.length; i++) doc.line(x0 + timeColW + i * dayColW, gridTop, x0 + timeColW + i * dayColW, y);
    let hy = gridTop + headRowH;
    for (let i = 0; i <= periods.length; i++) { doc.line(x0, hy, x1, hy); hy += rowH; }

    // ── Pied ─────────────────────────────────────────────────────
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text(`${school.nom} — Generated ${new Date().toLocaleDateString('en-GB')}`, x0, H - 5);
    doc.text('Green Hills Academy — Solid Foundation · Discipline · Success', x1, H - 5, { align: 'right' });
}
