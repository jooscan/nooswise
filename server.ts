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

// Live SSE subscribers per split ID
const sseClients = new Map<string, Set<express.Response>>();

function broadcastToClients(groupId: string, data: any) {
  const clients = sseClients.get(groupId);
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify({ type: 'GROUP_UPDATED', group: data, updatedAt: data.updatedAt })}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

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

// Seed default 'weekend-getaway' split if not already existing
if (!splitsMap.has('weekend-getaway')) {
  const defaultWeekendGetaway = {
    id: 'weekend-getaway',
    name: 'Weekend Getaway',
    currency: 'CAD',
    myETransferEmail: '',
    createdAt: '2026-10-08T10:00:00.000Z',
    updatedAt: new Date().toISOString(),
    members: [
      {
        id: 'm-you',
        name: 'Joyce',
        isCurrentUser: true,
        initials: 'JC',
        avatarUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png',
        avatarEmoji: '💖',
        avatarBg: 'from-[#FCE4EC] to-[#F8BBD0]',
        characterName: 'Eevee',
        email: '',
        paymentHandle: '',
      },
      {
        id: 'm-sarah',
        name: 'Joanna',
        isCurrentUser: false,
        initials: 'JN',
        avatarUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/175.png',
        avatarEmoji: '✨',
        avatarBg: 'from-[#FFF9C4] to-[#FFF176]',
        characterName: 'Togepi',
        email: 'joanna.n@gmail.com',
        paymentHandle: 'joanna.n@gmail.com',
      },
      {
        id: 'm-alex',
        name: 'Alex',
        isCurrentUser: false,
        initials: 'AM',
        avatarUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/39.png',
        avatarEmoji: '🌸',
        avatarBg: 'from-[#F8BBD0] to-[#E1BEE7]',
        characterName: 'Jigglypuff',
        email: 'alex.m@gmail.com',
        paymentHandle: 'alex.m@gmail.com',
      },
      {
        id: 'm-michael',
        name: 'Michael',
        isCurrentUser: false,
        initials: 'MJ',
        avatarUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
        avatarEmoji: '⭐',
        avatarBg: 'from-[#FFFDE7] to-[#FFE082]',
        characterName: 'Pikachu',
        email: 'michael.j@gmail.com',
        paymentHandle: 'michael.j@gmail.com',
      },
    ],
    expenses: [
      {
        id: 'exp-1',
        title: 'Sunday Brunch',
        amount: 124.5,
        currency: 'CAD',
        paidByMemberId: 'm-sarah',
        category: 'food',
        date: 'Today',
        splitType: 'equally',
        splits: [
          { memberId: 'm-you', amount: 31.125 },
          { memberId: 'm-sarah', amount: 31.125 },
          { memberId: 'm-alex', amount: 31.125 },
          { memberId: 'm-michael', amount: 31.125 },
        ],
        notes: 'Bottomless mimosas and brunch plates at Bistro Riviera',
      },
      {
        id: 'exp-2',
        title: 'London Pub Drinks',
        amount: 87.18,
        currency: 'CAD',
        originalAmount: 50.0,
        originalCurrency: 'GBP',
        exchangeRate: 1.7436,
        paidByMemberId: 'm-you',
        category: 'drinks',
        date: 'Yesterday',
        splitType: 'equally',
        splits: [
          { memberId: 'm-you', amount: 21.795 },
          { memberId: 'm-sarah', amount: 21.795 },
          { memberId: 'm-alex', amount: 21.795 },
          { memberId: 'm-michael', amount: 21.795 },
        ],
        notes: 'Draft pints and bar snacks (paid £50.00 GBP)',
      },
      {
        id: 'exp-3',
        title: 'Groceries',
        amount: 86.2,
        currency: 'CAD',
        paidByMemberId: 'm-alex',
        category: 'home',
        date: 'Oct 12',
        splitType: 'exact',
        splits: [
          { memberId: 'm-you', amount: 20.0 },
          { memberId: 'm-sarah', amount: 22.2 },
          { memberId: 'm-alex', amount: 24.0 },
          { memberId: 'm-michael', amount: 20.0 },
        ],
        notes: 'Snacks, wine, cheeses, breakfast supplies',
      },
      {
        id: 'exp-4',
        title: 'Airbnb Beachside Villa',
        amount: 589.3,
        currency: 'CAD',
        paidByMemberId: 'm-michael',
        category: 'home',
        date: 'Oct 10',
        splitType: 'equally',
        splits: [
          { memberId: 'm-you', amount: 147.325 },
          { memberId: 'm-sarah', amount: 147.325 },
          { memberId: 'm-alex', amount: 147.325 },
          { memberId: 'm-michael', amount: 147.325 },
        ],
        notes: 'Beachside Villa - 2 nights',
      },
    ],
    settlements: [],
  };
  splitsMap.set('weekend-getaway', {
    id: 'weekend-getaway',
    data: defaultWeekendGetaway,
    updatedAt: defaultWeekendGetaway.updatedAt,
  });
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

  // Broadcast instantly to all connected SSE clients (other phones, laptops, tabs)
  broadcastToClients(id, group);

  return res.json({
    success: true,
    id,
    group,
    updatedAt,
  });
});

// SSE Live Real-Time Stream Endpoint for instant cross-device updates
app.get('/api/splits/:id/stream', (req, res) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Register client
  if (!sseClients.has(id)) {
    sseClients.set(id, new Set());
  }
  const clientSet = sseClients.get(id)!;
  clientSet.add(res);

  // Send current state immediately on connect
  const current = splitsMap.get(id);
  if (current) {
    res.write(
      `data: ${JSON.stringify({
        type: 'INITIAL_STATE',
        group: current.data,
        updatedAt: current.updatedAt,
      })}\n\n`
    );
  }

  // Keep-alive heartbeat every 20 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clientSet.delete(res);
    if (clientSet.size === 0) {
      sseClients.delete(id);
    }
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
