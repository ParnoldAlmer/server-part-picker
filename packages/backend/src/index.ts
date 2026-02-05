import express from 'express';
import cors from 'cors';
import catalogRoutes from './routes/catalog.js';
import buildsRoutes from './routes/builds.js';
import validateRoutes from './routes/validate.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/catalog', catalogRoutes);
app.use('/api/builds', buildsRoutes);
app.use('/api/validate', validateRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`ServerSpec API running on http://localhost:${PORT}`);
});
