/**
 * Las fotos que el usuario elige se muestran de inmediato con un blob: URL.
 * Aquí guardamos el File original para poder subirlo al servidor cuando se sincronice el viaje.
 */
const pendingFiles = new Map<string, File>();

export function trackedObjectURL(file: File): string {
    const url = URL.createObjectURL(file);
    pendingFiles.set(url, file);
    return url;
}

export function getTrackedFile(url: string): File | undefined {
    return pendingFiles.get(url);
}

export function releaseTrackedFile(url: string): void {
    pendingFiles.delete(url);
    try {
        URL.revokeObjectURL(url);
    } catch {
        /* no pasa nada */
    }
}
