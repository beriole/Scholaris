import { Request, Response } from 'express';
import { saveDataUrlImage } from '../lib/upload';

// POST /api/uploads  Body: { image: <dataURL>, kind?: 'logo' | 'photo' | 'img' }
// Renvoie une URL absolue exploitable directement comme src / pour le PDF.
export const uploadImage = (req: Request, res: Response) => {
    const { image, kind } = req.body;
    if (!image) return res.status(400).json({ error: 'Champ "image" (data URL) requis.' });

    try {
        const rel = saveDataUrlImage(image, typeof kind === 'string' ? kind : 'img');
        const url = `${req.protocol}://${req.get('host')}${rel}`;
        res.status(201).json({ url, path: rel });
    } catch (e: any) {
        res.status(400).json({ error: e?.message ?? 'Erreur lors de l\'upload.' });
    }
};
