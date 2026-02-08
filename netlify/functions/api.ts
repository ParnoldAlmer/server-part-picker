import { randomBytes, randomUUID } from 'crypto';

type BuildRecord = {
    build: any;
    priceOverrides: Record<string, number>;
    nodeTargets: Record<string, string>;
    customCosts: unknown[];
    shareCode: string;
};

type Store = {
    buildsById: Map<string, BuildRecord>;
    buildIdByShareCode: Map<string, string>;
};

declare global {
    // eslint-disable-next-line no-var
    var __serverPartPickerStore: Store | undefined;
}

const store: Store = globalThis.__serverPartPickerStore ?? {
    buildsById: new Map<string, BuildRecord>(),
    buildIdByShareCode: new Map<string, string>(),
};

globalThis.__serverPartPickerStore = store;

function json(statusCode: number, payload: unknown) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    };
}

function extractApiPath(rawPath: string): string {
    if (rawPath.startsWith('/api/')) {
        return rawPath.slice('/api'.length);
    }
    if (rawPath.startsWith('/.netlify/functions/api/')) {
        return rawPath.slice('/.netlify/functions/api'.length);
    }
    if (rawPath === '/api' || rawPath === '/.netlify/functions/api') {
        return '/';
    }
    return rawPath;
}

function generateShareCode(): string {
    return randomBytes(4).toString('hex');
}

function allocateUniqueShareCode(): string {
    let code = generateShareCode();
    while (store.buildIdByShareCode.has(code)) {
        code = generateShareCode();
    }
    return code;
}

function normalizePayload(body: any) {
    if (body && typeof body === 'object' && 'build' in body) {
        return body;
    }

    return {
        build: body,
        priceOverrides: {},
        nodeTargets: {},
        customCosts: [],
    };
}

export async function handler(event: {
    httpMethod: string;
    rawUrl?: string;
    path?: string;
    body: string | null;
}) {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: {
                Allow: 'GET,POST,OPTIONS',
            },
            body: '',
        };
    }

    const pathname = new URL(event.rawUrl ?? `https://localhost${event.path ?? '/api'}`).pathname;
    const apiPath = extractApiPath(pathname);

    if (event.httpMethod === 'POST' && apiPath === '/builds') {
        try {
            const body = event.body ? JSON.parse(event.body) : {};
            const payload = normalizePayload(body);
            const build = payload.build;

            if (!build.id) {
                build.id = randomUUID();
            }
            if (!build.schemaVersion) {
                build.schemaVersion = 1;
            }
            if (!build.catalogVersion) {
                build.catalogVersion = '2026-02-04';
            }
            if (!build.createdAt) {
                build.createdAt = new Date().toISOString();
            }
            build.updatedAt = new Date().toISOString();

            let shareCode = typeof payload.shareCode === 'string' ? payload.shareCode : undefined;
            if (!shareCode) {
                const existingRecord = store.buildsById.get(build.id);
                shareCode = existingRecord?.shareCode ?? allocateUniqueShareCode();
            }

            const record: BuildRecord = {
                build,
                priceOverrides: payload.priceOverrides ?? {},
                nodeTargets: payload.nodeTargets ?? {},
                customCosts: payload.customCosts ?? [],
                shareCode,
            };

            store.buildsById.set(build.id, record);
            store.buildIdByShareCode.set(shareCode, build.id);

            return json(200, {
                id: build.id,
                shareCode,
                url: `/list/${shareCode}`,
            });
        } catch (error) {
            console.error('Error saving build:', error);
            return json(500, { error: 'Failed to save build' });
        }
    }

    if (event.httpMethod === 'GET' && apiPath.startsWith('/builds/share/')) {
        const shareCode = decodeURIComponent(apiPath.slice('/builds/share/'.length));
        const buildId = store.buildIdByShareCode.get(shareCode);
        if (!buildId) {
            return json(404, { error: 'Build not found' });
        }
        const record = store.buildsById.get(buildId);
        if (!record) {
            return json(404, { error: 'Build not found' });
        }
        return json(200, record);
    }

    if (event.httpMethod === 'GET' && apiPath.startsWith('/builds/')) {
        const id = decodeURIComponent(apiPath.slice('/builds/'.length));
        const record = store.buildsById.get(id);
        if (!record) {
            return json(404, { error: 'Build not found' });
        }
        return json(200, record);
    }

    return json(404, { error: 'Not found' });
}
