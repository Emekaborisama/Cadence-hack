import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { chatRouter } from './routes/chat.js';

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', model: env.model });
});

app.use('/api/chat', chatRouter);

app.listen(env.port, () => {
  console.log(`[api] listening on http://localhost:${env.port} (model: ${env.model})`);
});
