import { useState } from 'react';
import { Button, Card, CardBody, CardHeader, Chip, Input, Spinner } from '@heroui/react';
import type { ChatMessage } from '@cadence/shared';
import { sendChat } from './api.js';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const res = await sendChat(next);
      setMessages([...next, res.message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cadence</h1>
        <Chip color="primary" variant="flat" size="sm">
          OpenAI · PWA
        </Chip>
      </header>

      <Card className="flex-1">
        <CardHeader className="text-default-500 text-sm">
          Ask anything — this calls the Node API, which calls OpenAI.
        </CardHeader>
        <CardBody className="gap-3">
          {messages.length === 0 && (
            <p className="text-default-400 text-sm">No messages yet. Say hello 👋</p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === 'user' ? 'self-end text-right' : 'self-start text-left'}
            >
              <Chip
                color={m.role === 'user' ? 'primary' : 'default'}
                variant={m.role === 'user' ? 'solid' : 'flat'}
                className="mb-1"
                size="sm"
              >
                {m.role}
              </Chip>
              <p className="whitespace-pre-wrap text-sm">{m.content}</p>
            </div>
          ))}
          {loading && <Spinner size="sm" label="Thinking…" />}
          {error && <p className="text-danger text-sm">{error}</p>}
        </CardBody>
      </Card>

      <div className="flex gap-2">
        <Input
          value={input}
          onValueChange={setInput}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message…"
          aria-label="Message"
        />
        <Button color="primary" onPress={handleSend} isDisabled={loading || !input.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
