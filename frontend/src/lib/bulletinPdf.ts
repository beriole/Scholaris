// Génération PDF des bulletins — style établissement secondaire camerounais (MINESEC).
// jsPDF natif (pas de html2canvas, incompatible avec les couleurs oklch de Tailwind v4).

export interface BulletinDetail {
    id: string;
    matiere: { nom: string; code: string; coefficient: number; groupe?: { nom: string; ordre_affichage?: number } | null };
    moyenne_matiere: number;
    appreciation_matiere: string;
}
export interface BulletinData {
    id: string;
    moyenne_generale: number;
    rang: number | null;
    effectif_classe: number | null;
    appreciation_generale: string;
    eleve: {
        nom: string; prenom: string; matricule: string; sexe: string;
        date_naissance: string; lieu_naissance?: string | null; nationalite?: string | null; photo_url?: string | null;
    };
    classe: { nom: string; niveau: string };
    details: BulletinDetail[];
    periode: { nom: string; ordre: number; type?: string; annee: { libelle: string } };
}
export interface School { nom: string; logo_url?: string | null; ville?: string | null; telephone?: string | null; }
export interface ClassStats { moy: number | null; max: number | null; min: number | null; }
interface Img { data: string; fmt: 'PNG' | 'JPEG'; w: number; h: number; }

const N = (n: any) => Number(n) || 0;
const f2 = (n: any) => N(n).toFixed(2);
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const mention = (a: number) =>
    a >= 18 ? 'Excellent' : a >= 16 ? 'Très Bien' : a >= 14 ? 'Bien' : a >= 12 ? 'Assez Bien' : a >= 10 ? 'Passable' : 'Insuffisant';
const decision = (a: number) =>
    a >= 16 ? 'Tableau d\'Honneur + Félicitations'
    : a >= 14 ? 'Tableau d\'Honneur + Encouragements'
    : a >= 12 ? 'Tableau d\'Honneur'
    : a >= 10 ? 'Travail passable — peut mieux faire'
    : 'Travail insuffisant — Avertissement';
const rgbFor = (a: number): [number, number, number] =>
    a >= 14 ? [4, 120, 87] : a >= 10 ? [37, 99, 235] : [220, 38, 38];

export async function loadImg(url?: string | null): Promise<Img | null> {
    if (!url) return null;
    try {
        const res = await fetch(url, { mode: 'cors' });
        const blob = await res.blob();
        const data: string = await new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result as string);
            fr.onerror = reject;
            fr.readAsDataURL(blob);
        });
        const dims = await new Promise<{ w: number; h: number }>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => resolve({ w: 1, h: 1 });
            img.src = data;
        });
        return { data, fmt: blob.type.includes('png') ? 'PNG' : 'JPEG', ...dims };
    } catch { return null; }
}

// Dessine UN bulletin sur la page courante du document.
function renderBulletin(doc: any, b: BulletinData, school: School, stats: ClassStats, logo: Img | null, photo: Img | null) {
    const W = 210, M = 9;
    const x0 = M, x1 = W - M, innerW = x1 - x0;
    let y = M;

    // Cadre extérieur
    doc.setDrawColor(15, 23, 42); doc.setLineWidth(0.6);
    doc.rect(x0, y, innerW, 297 - 2 * M);
    doc.setLineWidth(0.2); doc.rect(x0 + 1.2, y + 1.2, innerW - 2.4, 297 - 2 * M - 2.4);

    const pad = 4;
    const lx = x0 + pad, rx = x1 - pad;
    y += 5;

    // ── En-tête bilingue ──────────────────────────────────────────────
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(15, 23, 42);
    doc.text('RÉPUBLIQUE DU CAMEROUN', lx, y);
    doc.text('REPUBLIC OF CAMEROON', rx, y, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(90, 100, 115);
    doc.text('Paix — Travail — Patrie', lx, y + 3.4);
    doc.text('Peace — Work — Fatherland', rx, y + 3.4, { align: 'right' });
    doc.text('MINESEC', lx, y + 6.8);
    doc.text('MINSEC', rx, y + 6.8, { align: 'right' });

    // Logo + titre central
    if (logo) {
        const h = 15, w = Math.min(16, (logo.w / logo.h) * h);
        try { doc.addImage(logo.data, logo.fmt, W / 2 - w / 2, y - 1, w, h); } catch { /* ignore */ }
    }
    y += 16;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(4, 120, 87);
    doc.text(school.nom.toUpperCase(), W / 2, y, { align: 'center' });
    y += 4.2;
    doc.setFontSize(6.8); doc.setTextColor(90, 100, 115); doc.setFont('helvetica', 'normal');
    const sub = [school.ville, school.telephone].filter(Boolean).join('  •  ');
    if (sub) { doc.text(sub, W / 2, y, { align: 'center' }); y += 3.4; }

    // Bandeau titre bulletin
    y += 1;
    doc.setFillColor(15, 23, 42); doc.rect(x0 + 1.2, y, innerW - 2.4, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    const isTrim = (b.periode.type === 'trimestre');
    doc.text(`BULLETIN ${isTrim ? 'TRIMESTRIEL' : 'DE NOTES'} — ${b.periode.nom.toUpperCase()}`, W / 2, y + 4.7, { align: 'center' });
    doc.setFontSize(7); doc.text(`Année scolaire ${b.periode.annee?.libelle ?? ''}`, rx, y + 4.7, { align: 'right' });
    y += 9;

    // ── Identité élève ────────────────────────────────────────────────
    const photoW = 20, boxH = 22;
    doc.setDrawColor(150, 160, 175); doc.setLineWidth(0.3);
    doc.rect(x0 + 1.2, y, innerW - 2.4, boxH);
    // photo à droite
    const pX = rx - photoW;
    doc.setFillColor(241, 245, 249); doc.rect(pX, y + 1.5, photoW, boxH - 3, 'F');
    if (photo) { try { doc.addImage(photo.data, photo.fmt, pX, y + 1.5, photoW, boxH - 3); } catch { /* ignore */ } }
    else { doc.setFontSize(6); doc.setTextColor(150, 160, 175); doc.text('PHOTO', pX + photoW / 2, y + boxH / 2, { align: 'center' }); }

    const fld = (lxx: number, lyy: number, label: string, value: string) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
        doc.text(label, lxx, lyy);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
        doc.text(value || '—', lxx + 26, lyy);
    };
    const colA = lx + 1, colB = lx + 95;
    let yy = y + 4.5;
    fld(colA, yy, 'Nom & Prénoms', `${b.eleve.nom} ${b.eleve.prenom}`);
    fld(colB, yy, 'Classe', `${b.classe.nom}`); yy += 4.5;
    fld(colA, yy, 'Matricule', b.eleve.matricule);
    fld(colB, yy, 'Effectif', String(b.effectif_classe ?? '—')); yy += 4.5;
    fld(colA, yy, 'Né(e) le', fmtDate(b.eleve.date_naissance));
    fld(colB, yy, 'Sexe', b.eleve.sexe === 'F' ? 'Féminin' : b.eleve.sexe === 'M' ? 'Masculin' : '—'); yy += 4.5;
    fld(colA, yy, 'À', b.eleve.lieu_naissance ?? '—');
    fld(colB, yy, 'Nationalité', b.eleve.nationalite ?? '—');
    y += boxH + 3;

    // ── Tableau des notes (groupé par groupe de matières) ──────────────
    const cols = [
        { t: 'DISCIPLINES',   x: lx + 1,  w: 74, a: 'left'   as const },
        { t: 'Moy/20',        x: lx + 77, w: 16, a: 'center' as const },
        { t: 'Coef',          x: lx + 95, w: 12, a: 'center' as const },
        { t: 'M×C',           x: lx + 109,w: 16, a: 'center' as const },
        { t: 'APPRÉCIATION',  x: lx + 127,w: 55, a: 'left'   as const },
    ];
    const cellX = (c: typeof cols[number]) => c.a === 'center' ? c.x + c.w / 2 : c.x;
    const tblX = x0 + 1.2, tblW = innerW - 2.4;
    const rowH = 5;

    // En-tête tableau
    doc.setFillColor(15, 23, 42); doc.rect(tblX, y, tblW, rowH + 1, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8);
    cols.forEach(c => doc.text(c.t, cellX(c), y + 3.8, { align: c.a === 'center' ? 'center' : 'left' }));
    y += rowH + 1;

    // Regrouper
    const groups = new Map<string, { ordre: number; items: BulletinDetail[] }>();
    for (const d of b.details) {
        const g = d.matiere.groupe?.nom ?? 'Autres disciplines';
        const ordre = d.matiere.groupe?.ordre_affichage ?? 99;
        if (!groups.has(g)) groups.set(g, { ordre, items: [] });
        groups.get(g)!.items.push(d);
    }
    const sortedGroups = [...groups.entries()].sort((a, b) => a[1].ordre - b[1].ordre);

    let grandCoef = 0, grandPts = 0;
    doc.setFont('helvetica', 'normal');
    for (const [gName, g] of sortedGroups) {
        // Ligne groupe
        doc.setFillColor(224, 242, 235); doc.rect(tblX, y, tblW, rowH, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); doc.setTextColor(4, 120, 87);
        doc.text(gName.toUpperCase(), cols[0].x, y + 3.5);
        y += rowH;

        let gCoef = 0, gPts = 0;
        g.items.forEach((d, i) => {
            const mv = N(d.moyenne_matiere), cf = N(d.matiere.coefficient), tot = mv * cf;
            gCoef += cf; gPts += tot;
            if (i % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(tblX, y, tblW, rowH, 'F'); }
            doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(30, 41, 59);
            doc.text(d.matiere.nom.slice(0, 42), cols[0].x, y + 3.4);
            const [r, gg, bl] = rgbFor(mv);
            doc.setTextColor(r, gg, bl); doc.setFont('helvetica', 'bold');
            doc.text(f2(mv), cellX(cols[1]), y + 3.4, { align: 'center' });
            doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal');
            doc.text(String(cf), cellX(cols[2]), y + 3.4, { align: 'center' });
            doc.setFont('helvetica', 'bold');
            doc.text(f2(tot), cellX(cols[3]), y + 3.4, { align: 'center' });
            doc.setFont('helvetica', 'normal'); doc.setTextColor(r, gg, bl); doc.setFontSize(6.4);
            doc.text((d.appreciation_matiere ?? '').slice(0, 32), cols[4].x, y + 3.4);
            y += rowH;
        });

        // Sous-total groupe
        grandCoef += gCoef; grandPts += gPts;
        doc.setFillColor(241, 245, 249); doc.rect(tblX, y, tblW, rowH, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.4); doc.setTextColor(71, 85, 105);
        doc.text(`Sous-total ${gName}`, cols[0].x, y + 3.4);
        doc.text(String(gCoef), cellX(cols[2]), y + 3.4, { align: 'center' });
        doc.text(f2(gPts), cellX(cols[3]), y + 3.4, { align: 'center' });
        y += rowH;
    }

    // Total général
    doc.setFillColor(15, 23, 42); doc.rect(tblX, y, tblW, rowH + 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
    doc.text('TOTAL GÉNÉRAL', cols[0].x, y + 3.8);
    doc.text(String(grandCoef), cellX(cols[2]), y + 3.8, { align: 'center' });
    doc.text(f2(grandPts), cellX(cols[3]), y + 3.8, { align: 'center' });
    y += rowH + 1;

    // Cadre du tableau
    doc.setDrawColor(150, 160, 175); doc.setLineWidth(0.3);
    // (lignes verticales légères)
    [cols[1].x, cols[2].x, cols[3].x, cols[4].x].forEach(vx => {
        // pas de hauteur exacte stockée; on encadre simplement la zone synthèse plus bas
    });
    y += 3;

    const moy = grandCoef > 0 ? grandPts / grandCoef : N(b.moyenne_generale);

    // ── Synthèse / Bilan ──────────────────────────────────────────────
    const synH = 20;
    doc.setDrawColor(150, 160, 175); doc.setLineWidth(0.3);
    doc.rect(tblX, y, tblW, synH);
    const c3 = tblW / 3;
    // moyenne
    const [mr, mg, mb] = rgbFor(moy);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
    doc.text('MOYENNE', tblX + c3 / 2, y + 5, { align: 'center' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(mr, mg, mb);
    doc.text(f2(moy), tblX + c3 / 2, y + 13, { align: 'center' });
    doc.setFontSize(7); doc.text(mention(moy) + ' / 20', tblX + c3 / 2, y + 17.5, { align: 'center' });
    // rang
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
    doc.text('RANG', tblX + c3 + c3 / 2, y + 5, { align: 'center' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(15, 23, 42);
    doc.text(b.rang ? `${b.rang}` : '—', tblX + c3 + c3 / 2, y + 13, { align: 'center' });
    doc.setFontSize(7); doc.setTextColor(100, 116, 139);
    doc.text(`sur ${b.effectif_classe ?? '—'} élèves`, tblX + c3 + c3 / 2, y + 17.5, { align: 'center' });
    // stats classe
    const sx = tblX + 2 * c3 + 3;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
    doc.text('STATISTIQUES CLASSE', sx, y + 5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Moyenne classe : ${stats.moy != null ? f2(stats.moy) : '—'}`, sx, y + 9.5);
    doc.text(`Plus forte moyenne : ${stats.max != null ? f2(stats.max) : '—'}`, sx, y + 13.5);
    doc.text(`Plus faible moyenne : ${stats.min != null ? f2(stats.min) : '—'}`, sx, y + 17.5);
    // séparateurs
    doc.line(tblX + c3, y + 2, tblX + c3, y + synH - 2);
    doc.line(tblX + 2 * c3, y + 2, tblX + 2 * c3, y + synH - 2);
    y += synH + 3;

    // ── Décision du conseil ───────────────────────────────────────────
    doc.setDrawColor(150, 160, 175);
    doc.rect(tblX, y, tblW, 12);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(4, 120, 87);
    doc.text('DÉCISION DU CONSEIL DE CLASSE', tblX + 2, y + 4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(30, 41, 59);
    doc.text(decision(moy), tblX + 2, y + 8.5);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(6.8); doc.setTextColor(80, 90, 105);
    const appr = doc.splitTextToSize(`Appréciation : ${b.appreciation_generale || mention(moy)}`, tblW - 6);
    doc.text(appr[0] ?? '', tblX + 2, y + 11.2);
    y += 15;

    // ── Signatures ────────────────────────────────────────────────────
    const sigY = 297 - M - 16;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(71, 85, 105);
    doc.text('Le Professeur Principal', lx + 18, sigY, { align: 'center' });
    doc.text('Le Chef d\'Établissement', rx - 22, sigY, { align: 'center' });
    doc.setDrawColor(150, 160, 175); doc.setLineWidth(0.2);
    doc.line(lx + 2, sigY + 12, lx + 38, sigY + 12);
    doc.line(rx - 42, sigY + 12, rx - 2, sigY + 12);

    // Pied
    doc.setFontSize(6); doc.setTextColor(150, 160, 175);
    doc.text(`Édité via Sholaris — ${new Date().toLocaleDateString('fr-FR')}`, W / 2, 297 - M - 2, { align: 'center' });
}

export async function downloadBulletin(b: BulletinData, school: School, stats: ClassStats) {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const [logo, photo] = await Promise.all([loadImg(school.logo_url), loadImg(b.eleve.photo_url)]);
    renderBulletin(doc, b, school, stats, logo, photo);
    doc.save(`bulletin_${b.eleve.nom}_${b.eleve.prenom}_${b.periode.nom.replace(/\s/g, '_')}.pdf`);
}

export async function downloadClassBulletins(list: BulletinData[], school: School, stats: ClassStats, classeName = 'classe', periodeName = '') {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logo = await loadImg(school.logo_url);
    for (let i = 0; i < list.length; i++) {
        if (i > 0) doc.addPage();
        const photo = await loadImg(list[i].eleve.photo_url);
        renderBulletin(doc, list[i], school, stats, logo, photo);
    }
    doc.save(`bulletins_${classeName.replace(/\s/g, '_')}_${periodeName.replace(/\s/g, '_')}.pdf`);
}
