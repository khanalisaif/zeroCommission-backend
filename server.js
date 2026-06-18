import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './src/config/db.js';
import applicationRoutes from './src/routes/applicationRoutes.js';
import documentRoutes from './src/routes/documentRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import { errorHandler, notFound } from './src/middleware/errorMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Connect to MongoDB ────────────────────────────────────────────────────
connectDB();

// ─── Express App Setup ─────────────────────────────────────────────────────
const app = express();

const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, '') : 'http://localhost:5173';

app.use(
  cors({
    origin: [clientUrl, 'http://localhost:5173', 'http://localhost:5174', 'https://zerocommission.netlify.app'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ─── Body Parsers ──────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Serve uploaded files statically ──────────────────────────────────────
// Files accessible at: http://localhost:5000/uploads/<token>/<filename>
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Health Check Route ────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('Welcome to Zero Commission');
});

// ─── API Routes ────────────────────────────────────────────────────────────
app.use('/api/applications', applicationRoutes);
// Nested: /api/applications/:token/documents
app.use('/api/applications/:token/documents', documentRoutes);
// Admin routes
app.use('/api/admin', adminRoutes);

// ─── 404 & Error Handlers ──────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log(`  🏦  ZeroCommission Backend`);
  console.log(`  🌐  Server running on port ${PORT}`);
  console.log(`  🔗  http://localhost:${PORT}`);
  console.log(`  📊  API: http://localhost:${PORT}/api/applications`);
  console.log(`  📁  Files: http://localhost:${PORT}/uploads`);
  console.log('═══════════════════════════════════════════════');
  console.log('');
});
