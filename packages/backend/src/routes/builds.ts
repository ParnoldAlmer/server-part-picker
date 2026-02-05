import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// In-memory storage for demo (replace with DB in production)
const builds = new Map<string, any>();

// POST /api/builds - Save a build
router.post('/', (req, res) => {
    try {
        const build = req.body;

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

        // Store build
        builds.set(build.id, build);

        res.json({ id: build.id, url: `/builds/${build.id}` });
    } catch (error) {
        console.error('Error saving build:', error);
        res.status(500).json({ error: 'Failed to save build' });
    }
});

// GET /api/builds/:id - Get a build by ID
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const build = builds.get(id);

        if (!build) {
            return res.status(404).json({ error: 'Build not found' });
        }

        res.json(build);
    } catch (error) {
        console.error('Error loading build:', error);
        res.status(500).json({ error: 'Failed to load build' });
    }
});

export default router;
