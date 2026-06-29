import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Dossier de stockage des fichiers uploadés (servi statiquement sous /uploads).
export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const EXT_BY_MIME: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
};

/**
 * Écrit une image encodée en data URL (data:image/png;base64,...) sur le disque.
 * Renvoie le chemin relatif public (/uploads/xxx.png).
 */
export function saveDataUrlImage(dataUrl: string, prefix = 'img'): string {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl ?? '');
    if (!match) throw new Error('Format d\'image invalide (data URL attendue).');

    const mime = match[1];
    const ext = EXT_BY_MIME[mime];
    if (!ext) throw new Error('Type d\'image non supporté.');

    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 4 * 1024 * 1024) throw new Error('Image trop volumineuse (max 4 Mo).');

    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    const filename = `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
    return `/uploads/${filename}`;
}
