import { useState } from 'react';
import { Printer, Download, Loader2, User } from 'lucide-react';
import { downloadBulletin, type BulletinData, type School, type ClassStats } from '../../../lib/bulletinPdf';

interface Props { bulletin: BulletinData; school: School; stats: ClassStats; }

const N = (n: any) => Number(n) || 0;
const f2 = (n: any) => N(n).toFixed(2);
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const col = (a: number) => a >= 14 ? '#047857' : a >= 10 ? '#2563eb' : '#dc2626';
const mention = (a: number) => a >= 18 ? 'Excellent' : a >= 16 ? 'Très Bien' : a >= 14 ? 'Bien' : a >= 12 ? 'Assez Bien' : a >= 10 ? 'Passable' : 'Insuffisant';
const decision = (a: number) => a >= 16 ? 'Tableau d\'Honneur + Félicitations' : a >= 14 ? 'Tableau d\'Honneur + Encouragements' : a >= 12 ? 'Tableau d\'Honneur' : a >= 10 ? 'Travail passable — peut mieux faire' : 'Travail insuffisant — Avertissement';

export default function BulletinPDF({ bulletin: b, school, stats }: Props) {
    const [exporting, setExporting] = useState(false);

    const handleDownload = async () => {
        setExporting(true);
        try { await downloadBulletin(b, school, stats); }
        catch (e) { console.error(e); alert('Erreur lors de la génération du PDF.'); }
        finally { setExporting(false); }
    };

    // Regroupement par groupe de matières
    const groups = new Map<string, { ordre: number; items: typeof b.details }>();
    for (const d of b.details) {
        const g = d.matiere.groupe?.nom ?? 'Autres disciplines';
        const o = d.matiere.groupe?.ordre_affichage ?? 99;
        if (!groups.has(g)) groups.set(g, { ordre: o, items: [] });
        groups.get(g)!.items.push(d);
    }
    const sorted = [...groups.entries()].sort((a, b) => a[1].ordre - b[1].ordre);
    const grandCoef = b.details.reduce((s, d) => s + N(d.matiere.coefficient), 0);
    const grandPts = b.details.reduce((s, d) => s + N(d.moyenne_matiere) * N(d.matiere.coefficient), 0);
    const moy = grandCoef > 0 ? grandPts / grandCoef : N(b.moyenne_generale);

    const TH: React.CSSProperties = { padding: '4px 6px', fontSize: 9.5, fontWeight: 700, color: '#fff' };
    const TD: React.CSSProperties = { padding: '3px 6px', fontSize: 10 };

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
                    {exporting ? 'Génération…' : 'Télécharger PDF'}
                </button>
            </div>

            {/* ── Aperçu ────────────────────────────────────────────────── */}
            <div style={{ fontFamily: 'Arial, sans-serif', color: '#1e293b', background: '#fff', padding: 18, border: '2px solid #0f172a', borderRadius: 6 }}>

                {/* En-tête bilingue */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 8, lineHeight: 1.5 }}>
                        <div style={{ fontWeight: 700 }}>RÉPUBLIQUE DU CAMEROUN</div>
                        <div style={{ color: '#64748b' }}>Paix — Travail — Patrie</div>
                        <div style={{ color: '#64748b' }}>MINESEC</div>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        {school.logo_url
                            ? <img src={school.logo_url} alt="logo" style={{ height: 46, objectFit: 'contain', margin: '0 auto' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            : <div style={{ width: 44, height: 44, borderRadius: 8, background: '#ecfdf5', color: '#047857', fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>{school.nom?.[0] ?? 'S'}</div>}
                    </div>
                    <div style={{ fontSize: 8, lineHeight: 1.5, textAlign: 'right' }}>
                        <div style={{ fontWeight: 700 }}>REPUBLIC OF CAMEROON</div>
                        <div style={{ color: '#64748b' }}>Peace — Work — Fatherland</div>
                        <div style={{ color: '#64748b' }}>MINSEC</div>
                    </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#047857', letterSpacing: 0.5 }}>{school.nom.toUpperCase()}</div>
                    {(school.ville || school.telephone) && <div style={{ fontSize: 8.5, color: '#64748b' }}>{[school.ville, school.telephone].filter(Boolean).join('  •  ')}</div>}
                </div>

                {/* Bandeau titre */}
                <div style={{ background: '#0f172a', color: '#fff', padding: '5px 10px', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 3 }}>
                    <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: 0.5 }}>BULLETIN {b.periode.type === 'trimestre' ? 'TRIMESTRIEL' : 'DE NOTES'} — {b.periode.nom.toUpperCase()}</span>
                    <span style={{ fontSize: 9 }}>Année {b.periode.annee?.libelle}</span>
                </div>

                {/* Identité */}
                <div style={{ display: 'flex', gap: 10, marginTop: 8, border: '1px solid #94a3b8', borderRadius: 3, padding: 8 }}>
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 14px', fontSize: 10 }}>
                        <Info label="Nom & Prénoms" value={`${b.eleve.nom} ${b.eleve.prenom}`} />
                        <Info label="Classe" value={b.classe.nom} />
                        <Info label="Matricule" value={b.eleve.matricule} />
                        <Info label="Effectif" value={String(b.effectif_classe ?? '—')} />
                        <Info label="Né(e) le" value={fmtDate(b.eleve.date_naissance)} />
                        <Info label="Sexe" value={b.eleve.sexe === 'F' ? 'Féminin' : b.eleve.sexe === 'M' ? 'Masculin' : '—'} />
                        <Info label="À" value={b.eleve.lieu_naissance ?? '—'} />
                        <Info label="Nationalité" value={b.eleve.nationalite ?? '—'} />
                    </div>
                    <div style={{ width: 64, height: 78, borderRadius: 4, overflow: 'hidden', border: '1px solid #cbd5e1', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {b.eleve.photo_url
                            ? <img src={b.eleve.photo_url} alt="élève" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <User size={26} color="#cbd5e1" />}
                    </div>
                </div>

                {/* Tableau groupé */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                    <thead>
                        <tr style={{ background: '#0f172a' }}>
                            <th style={{ ...TH, textAlign: 'left' }}>DISCIPLINES</th>
                            <th style={{ ...TH, textAlign: 'center' }}>Moy/20</th>
                            <th style={{ ...TH, textAlign: 'center' }}>Coef</th>
                            <th style={{ ...TH, textAlign: 'center' }}>M×C</th>
                            <th style={{ ...TH, textAlign: 'left' }}>APPRÉCIATION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(([gName, g]) => {
                            const gCoef = g.items.reduce((s, d) => s + N(d.matiere.coefficient), 0);
                            const gPts = g.items.reduce((s, d) => s + N(d.moyenne_matiere) * N(d.matiere.coefficient), 0);
                            return (
                                <>
                                    <tr key={gName} style={{ background: '#e0f2eb' }}>
                                        <td colSpan={5} style={{ ...TD, fontWeight: 700, color: '#047857', fontSize: 9.5 }}>{gName.toUpperCase()}</td>
                                    </tr>
                                    {g.items.map((d, i) => {
                                        const mv = N(d.moyenne_matiere), cf = N(d.matiere.coefficient);
                                        return (
                                            <tr key={d.id} style={{ background: i % 2 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ ...TD }}>{d.matiere.nom}</td>
                                                <td style={{ ...TD, textAlign: 'center', fontWeight: 700, color: col(mv) }}>{f2(mv)}</td>
                                                <td style={{ ...TD, textAlign: 'center' }}>{cf}</td>
                                                <td style={{ ...TD, textAlign: 'center', fontWeight: 600 }}>{f2(mv * cf)}</td>
                                                <td style={{ ...TD, color: col(mv), fontSize: 9 }}>{d.appreciation_matiere}</td>
                                            </tr>
                                        );
                                    })}
                                    <tr key={gName + '-st'} style={{ background: '#f1f5f9' }}>
                                        <td style={{ ...TD, fontWeight: 700, color: '#475569', fontSize: 9 }}>Sous-total {gName}</td>
                                        <td />
                                        <td style={{ ...TD, textAlign: 'center', fontWeight: 700 }}>{gCoef}</td>
                                        <td style={{ ...TD, textAlign: 'center', fontWeight: 700 }}>{f2(gPts)}</td>
                                        <td />
                                    </tr>
                                </>
                            );
                        })}
                        <tr style={{ background: '#0f172a', color: '#fff' }}>
                            <td style={{ ...TD, fontWeight: 800 }}>TOTAL GÉNÉRAL</td>
                            <td />
                            <td style={{ ...TD, textAlign: 'center', fontWeight: 800 }}>{grandCoef}</td>
                            <td style={{ ...TD, textAlign: 'center', fontWeight: 800 }}>{f2(grandPts)}</td>
                            <td />
                        </tr>
                    </tbody>
                </table>

                {/* Synthèse */}
                <div style={{ display: 'flex', border: '1px solid #94a3b8', borderRadius: 3, marginTop: 8 }}>
                    <div style={{ flex: 1, textAlign: 'center', padding: '8px 6px', borderRight: '1px solid #cbd5e1' }}>
                        <div style={{ fontSize: 9, color: '#64748b' }}>MOYENNE</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: col(moy) }}>{f2(moy)}</div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: col(moy) }}>{mention(moy)} / 20</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', padding: '8px 6px', borderRight: '1px solid #cbd5e1' }}>
                        <div style={{ fontSize: 9, color: '#64748b' }}>RANG</div>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>{b.rang ?? '—'}</div>
                        <div style={{ fontSize: 9, color: '#64748b' }}>sur {b.effectif_classe ?? '—'} élèves</div>
                    </div>
                    <div style={{ flex: 1.2, padding: '8px 10px', fontSize: 9.5 }}>
                        <div style={{ fontSize: 9, color: '#64748b', marginBottom: 2 }}>STATISTIQUES CLASSE</div>
                        <div>Moyenne classe : <b>{stats.moy != null ? f2(stats.moy) : '—'}</b></div>
                        <div>Plus forte : <b>{stats.max != null ? f2(stats.max) : '—'}</b></div>
                        <div>Plus faible : <b>{stats.min != null ? f2(stats.min) : '—'}</b></div>
                    </div>
                </div>

                {/* Décision */}
                <div style={{ border: '1px solid #94a3b8', borderRadius: 3, marginTop: 8, padding: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#047857' }}>DÉCISION DU CONSEIL DE CLASSE</div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, marginTop: 2 }}>{decision(moy)}</div>
                    <div style={{ fontSize: 9, fontStyle: 'italic', color: '#64748b', marginTop: 2 }}>Appréciation : {b.appreciation_generale || mention(moy)}</div>
                </div>

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, fontSize: 9.5, color: '#475569' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div>Le Professeur Principal</div>
                        <div style={{ borderTop: '1px solid #94a3b8', width: 130, marginTop: 20 }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div>Le Chef d'Établissement</div>
                        <div style={{ borderTop: '1px solid #94a3b8', width: 130, marginTop: 20 }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <span style={{ color: '#64748b' }}>{label} : </span>
            <span style={{ fontWeight: 700 }}>{value}</span>
        </div>
    );
}
