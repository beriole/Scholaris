import api from './api';

/** Lit un fichier image en data URL. */
export function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = reject;
        fr.readAsDataURL(file);
    });
}

/**
 * Upload une image vers le backend et renvoie son URL absolue.
 * Valide le type et la taille côté client.
 */
export async function uploadImageFile(file: File, kind: 'logo' | 'photo' | 'img' = 'img'): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Le fichier doit être une image.');
    if (file.size > 4 * 1024 * 1024) throw new Error('Image trop volumineuse (max 4 Mo).');
    const image = await fileToDataUrl(file);
    const res = await api.post('/api/uploads', { image, kind });
    return res.data.url as string;
}
