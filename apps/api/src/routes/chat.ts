import { Router, type Request, type Response } from 'express';
import type { ChatRequest, ChatResponse } from '@cadence/shared';
import { env } from '../env.js';
import { activeModel, createChatCompletion } from '../openai.js';

export const chatRouter: Router = Router();

chatRouter.post('/', async (req: Request, res: Response) => {
  if (env.aiMode !== 'live') {
    return res.status(400).json({
      error: 'Chat endpoint requires AI_MODE=live. Use POST /api/state { action: "coach" } for the protocol-grounded coach.',
    });
  }

  const body = req.body as ChatRequest;
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: 'Body must include a non-empty `messages` array.' });
  }

  try {
    const content = await createChatCompletion(body.messages);
    const response: ChatResponse = {
      message: { role: 'assistant', content },
      model: activeModel,
    };
    return res.json(response);
  } catch (err) {
    console.error('[chat] completion failed:', err);
    return res.status(502).json({ error: 'LLM request failed.' });
  }
});
