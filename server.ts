import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-memory split store + persistent JSON file cache
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'splits.json');

interface SplitRecord {
  id: string;
  data: any;
  updatedAt: string;
}

const splitsMap = new Map<string, SplitRecord>();

// Ensure data directory and load existing splits
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      Object.entries(parsed).forEach(([key, val]: [string, any]) => {
        splitsMap.set(key, val);
      });
    }
  }
} catch (err) {
  console.warn('Could not initialize persistent storage:', err);
}

function persistToDisk() {
  try {
    const obj: Record<string, SplitRecord> = {};
    splitsMap.forEach((v, k) => {
      obj[k] = v;
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist splits to disk:', err);
  }
}

// ---------------- API ROUTES ----------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Get a split by ID
app.get('/api/splits/:id', (req, res) => {
  const { id } = req.params;
  const record = splitsMap.get(id);
  if (!record) {
    return res.status(404).json({ error: 'Split not found' });
  }
  return res.json({
    id: record.id,
    group: record.data,
    updatedAt: record.updatedAt,
  });
});

// Create or update a split
app.post('/api/splits/:id', (req, res) => {
  const { id } = req.params;
  const group = req.body;

  if (!group || typeof group !== 'object') {
    return res.status(400).json({ error: 'Invalid group data' });
  }

  const existing = splitsMap.get(id);
  const now = new Date().toISOString();

  // Normalize updated at timestamp
  const updatedAt = group.updatedAt || now;
  group.updatedAt = updatedAt;

  const record: SplitRecord = {
    id,
    data: group,
    updatedAt,
  };

  splitsMap.set(id, record);
  persistToDisk();

  return res.json({
    success: true,
    id,
    group,
    updatedAt,
  });
});

// Polling check endpoint (lightweight check if a split has updated since a timestamp)
app.get('/api/splits/:id/poll', (req, res) => {
  const { id } = req.params;
  const since = req.query.since as string;
  const record = splitsMap.get(id);

  if (!record) {
    return res.status(404).json({ error: 'Split not found' });
  }

  if (since && record.updatedAt === since) {
    return res.json({ updated: false, updatedAt: record.updatedAt });
  }

  return res.json({
    updated: true,
    group: record.data,
    updatedAt: record.updatedAt,
  });
});

// URL Shortener API endpoint using TinyURL + fallbacks
app.post('/api/shorten', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    // 1. If already short, return it
    if (url.length < 35 && !url.includes('#s=N4')) {
      return res.json({ shortUrl: url });
    }

    // 2. Call TinyURL API from server (no CORS restrictions!)
    try {
      const tinyApiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const tinyRes = await fetch(tinyApiUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'nooswise-app/1.0' },
      });
      clearTimeout(timeoutId);

      if (tinyRes.ok) {
        const text = await tinyRes.text();
        if (text && text.startsWith('http')) {
          return res.json({ shortUrl: text.trim() });
        }
      }
    } catch (tinyErr) {
      // TinyURL timed out or failed, try next
    }

    // 3. Fallback to is.gd
    try {
      const isgdUrl = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const isgdRes = await fetch(isgdUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (isgdRes.ok) {
        const text = await isgdRes.text();
        if (text && text.startsWith('http')) {
          return res.json({ shortUrl: text.trim() });
        }
      }
    } catch (isgdErr) {
      // Fallback
    }

    // 4. Return the original url
    return res.json({ shortUrl: url });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to shorten URL' });
  }
});

// Short URL redirect route for /s/:id
app.get('/s/:id', (req, res) => {
  const { id } = req.params;
  return res.redirect(`/#/s/${id}`);
});

// ---------------- VITE & FRONTEND SERVING ----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`nooswise server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
