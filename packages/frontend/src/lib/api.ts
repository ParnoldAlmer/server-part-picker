import type { SharedBuildBundle } from '../store/buildStore';

const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '');

function apiUrl(path: string): string {
    if (!API_BASE) {
        return path;
    }

    const normalizedBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    return `${normalizedBase}${path}`;
}

export interface SaveBuildResponse {
    id: string;
    shareCode: string;
    url: string;
}

export async function saveSharedBuild(bundle: SharedBuildBundle): Promise<SaveBuildResponse> {
    const response = await fetch(apiUrl('/api/builds'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(bundle),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to save build');
    }

    return response.json() as Promise<SaveBuildResponse>;
}

export async function loadSharedBuild(shareCode: string): Promise<SharedBuildBundle> {
    const response = await fetch(apiUrl(`/api/builds/share/${encodeURIComponent(shareCode)}`));

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to load build');
    }

    const payload = await response.json() as SharedBuildBundle;
    return payload;
}
