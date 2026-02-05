import express from 'express';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CATALOG_VERSION = '2026-02-04';

// Load all JSON data
async function loadCatalog() {
    const dataDir = join(__dirname, '../data');

    const [chassis, cpus, motherboards, memory, storage] = await Promise.all([
        readFile(join(dataDir, 'chassis.json'), 'utf-8').then(JSON.parse),
        readFile(join(dataDir, 'cpus.json'), 'utf-8').then(JSON.parse),
        readFile(join(dataDir, 'motherboards.json'), 'utf-8').then(JSON.parse),
        readFile(join(dataDir, 'memory.json'), 'utf-8').then(JSON.parse),
        readFile(join(dataDir, 'storage.json'), 'utf-8').then(JSON.parse),
    ]);

    return {
        version: CATALOG_VERSION,
        lastUpdated: new Date().toISOString(),
        chassis,
        cpus,
        motherboards,
        memory,
        storage,
    };
}

// GET /api/catalog - returns entire catalog
router.get('/', async (req, res) => {
    try {
        const catalog = await loadCatalog();
        res.json(catalog);
    } catch (error) {
        console.error('Error loading catalog:', error);
        res.status(500).json({ error: 'Failed to load catalog' });
    }
});

// GET /api/catalog/chassis
router.get('/chassis', async (req, res) => {
    try {
        const catalog = await loadCatalog();
        res.json(catalog.chassis);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load chassis' });
    }
});

// GET /api/catalog/cpus
router.get('/cpus', async (req, res) => {
    try {
        const catalog = await loadCatalog();
        const { platform, socket } = req.query;

        let filtered = catalog.cpus;
        if (platform) {
            filtered = filtered.filter((cpu: any) => cpu.platform === platform);
        }
        if (socket) {
            filtered = filtered.filter((cpu: any) => cpu.constraints.socket === socket);
        }

        res.json(filtered);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load CPUs' });
    }
});

// GET /api/catalog/motherboards
router.get('/motherboards', async (req, res) => {
    try {
        const catalog = await loadCatalog();
        const { socket } = req.query;

        let filtered = catalog.motherboards;
        if (socket) {
            filtered = filtered.filter((mobo: any) => mobo.constraints.socket === socket);
        }

        res.json(filtered);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load motherboards' });
    }
});

// GET /api/catalog/memory
router.get('/memory', async (req, res) => {
    try {
        const catalog = await loadCatalog();
        const { ddrGen, type } = req.query;

        let filtered = catalog.memory;
        if (ddrGen) {
            filtered = filtered.filter((mem: any) => mem.constraints.ddrGen === parseInt(ddrGen as string));
        }
        if (type) {
            filtered = filtered.filter((mem: any) => mem.constraints.type === type);
        }

        res.json(filtered);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load memory' });
    }
});

// GET /api/catalog/storage
router.get('/storage', async (req, res) => {
    try {
        const catalog = await loadCatalog();
        res.json(catalog.storage);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load storage' });
    }
});

export default router;
