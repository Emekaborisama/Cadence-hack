import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';
import { chatRouter } from './routes/chat.js';
import { stateRouter } from './routes/state.js';

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', aiMode: env.aiMode, model: env.model });
});

app.use('/api/chat', chatRouter);
app.use('/api/state', stateRouter);

// Production: serve the built web app from this same service (one Railway
// service, one URL, no CORS). In dev Vite serves the app on 5173 and proxies
// /api here, so this block is effectively inert.
const here = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(here, '../../web/dist');
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  // SPA fallback: any non-API route resolves to index.html (client routing).
  app.get(/^\/(?!api\/|health).*/, (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

app.listen(env.port, () => {
  console.log(
    `[api] http://localhost:${env.port} · AI_MODE=${env.aiMode} · model=${env.model} · web=${existsSync(webDist) ? 'served' : 'dev-proxy'}`,
  );
});
