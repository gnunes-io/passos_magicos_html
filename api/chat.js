/**
 * Vercel Serverless Function — /api/chat
 * Proxy seguro para o webhook n8n da Bia (Assistente Psicopedagógica).
 * As credenciais ficam apenas em variáveis de ambiente Vercel — nunca no frontend.
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, sessionId } = req.body;
  if (!message || !sessionId)
    return res.status(400).json({ error: 'Missing required fields: message, sessionId' });

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const secret     = process.env.WEBHOOK_SECRET;

  if (!webhookUrl || !secret) {
    console.error('Missing env vars: N8N_WEBHOOK_URL or WEBHOOK_SECRET');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const upstream = await fetch(webhookUrl, {
      method:  'POST',
      headers: {
        'Content-Type':     'application/json',
        'x-webhook-secret': secret,
      },
      body: JSON.stringify({ message, sessionId }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error('n8n error:', upstream.status, text);
      return res.status(502).json({ error: 'Upstream error', reply: null });
    }

    const data = await upstream.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Internal server error', reply: null });
  }
};
