import express from 'express';

const router = express.Router();

// POST /api/validate - Validate a build
router.post('/', (req, res) => {
    try {
        const build = req.body;

        // Import validation rules (will be mirrored from frontend)
        // For now, return placeholder
        const issues: any[] = [];

        // Basic validation placeholder
        if (!build.chassis) {
            issues.push({
                code: 'CHASSIS_MISSING',
                severity: 'error',
                path: 'chassis',
                message: 'A chassis must be selected',
            });
        }

        res.json({
            valid: issues.filter((i) => i.severity === 'error').length === 0,
            issues,
        });
    } catch (error) {
        console.error('Error validating build:', error);
        res.status(500).json({ error: 'Validation failed' });
    }
});

export default router;
