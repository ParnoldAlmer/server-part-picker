import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

const router = express.Router();

// In-memory storage for demo (replace with DB in production)
const buildsById = new Map<string, any>();
const buildIdByShareCode = new Map<string, string>();

function generateShareCode(): string {
    return randomBytes(4).toString('hex');
}

function allocateUniqueShareCode(): string {
    let code = generateShareCode();
    while (buildIdByShareCode.has(code)) {
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

// POST /api/builds - Save a build
router.post('/', (req, res) => {
    try {
        const payload = normalizePayload(req.body);
        const build = payload.build;

        // Generate new ID if not present
        if (!build.id) {
            build.id = uuidv4();
        }

        // Set schema/catalog versions if not present
        if (!build.schemaVersion) {
            build.schemaVersion = 1;
        }
        if (!build.catalogVersion) {
            build.catalogVersion = '2026-02-04';
        }

        // Update timestamps
        if (!build.createdAt) {
            build.createdAt = new Date().toISOString();
        }
        build.updatedAt = new Date().toISOString();

        let shareCode = typeof payload.shareCode === 'string' ? payload.shareCode : undefined;
        if (!shareCode) {
            const existingRecord = buildsById.get(build.id);
            shareCode = existingRecord?.shareCode ?? allocateUniqueShareCode();
        }

        const record = {
            build,
            priceOverrides: payload.priceOverrides ?? {},
            nodeTargets: payload.nodeTargets ?? {},
            customCosts: payload.customCosts ?? [],
            shareCode,
        };

        // Store build by ID and code
        buildsById.set(build.id, record);
        buildIdByShareCode.set(shareCode, build.id);

        res.json({
            id: build.id,
            shareCode,
            url: `/list/${shareCode}`,
        });
    } catch (error) {
        console.error('Error saving build:', error);
        res.status(500).json({ error: 'Failed to save build' });
    }
});

// GET /api/builds/share/:shareCode - Get a build bundle by short share code
router.get('/share/:shareCode', (req, res) => {
    try {
        const { shareCode } = req.params;
        const buildId = buildIdByShareCode.get(shareCode);

        if (!buildId) {
            return res.status(404).json({ error: 'Build not found' });
        }

        const record = buildsById.get(buildId);

        if (!record) {
            return res.status(404).json({ error: 'Build not found' });
        }

        res.json(record);
    } catch (error) {
        console.error('Error loading shared build:', error);
        res.status(500).json({ error: 'Failed to load build' });
    }
});

// GET /api/builds/:id - Get a build by ID
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const record = buildsById.get(id);

        if (!record) {
            return res.status(404).json({ error: 'Build not found' });
        }

        res.json(record);
    } catch (error) {
        console.error('Error loading build:', error);
        res.status(500).json({ error: 'Failed to load build' });
    }
});

export default router;
