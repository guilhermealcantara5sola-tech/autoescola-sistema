/// <reference types="node" />
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed. Must be POST.' });
  }

  const { phone } = req.body || {};

  if (!phone) {
    return res.status(400).json({ error: 'Falta o parâmetro telefone.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const senderNumber = process.env.TWILIO_SENDER_NUMBER || 'whatsapp:+14155238886';

  if (!accountSid || !authToken) {
    return res.status(500).json({ error: 'Twilio credentials not configured' });
  }

  // Format phone: keep only numbers and '+'
  let cleanPhone = phone.trim().replace(/[^\d+]/g, '');
  if (!cleanPhone.startsWith('+')) {
    cleanPhone = `+55${cleanPhone}`;
  }
  const formattedPhone = `whatsapp:${cleanPhone}`;

  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes expiry

  try {
    // 1. Save or update OTP in the database
    const { error: dbError } = await supabase
      .from('otps')
      .upsert({ telefone: cleanPhone, codigo: otpCode, expira_em: expiresAt });

    if (dbError) throw dbError;

    // 2. Send code via Twilio WhatsApp
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const params = new URLSearchParams();
    params.append('To', formattedPhone);
    params.append('From', senderNumber);
    params.append('Body', `Seu código de confirmação para a Autoescola Connect é: *${otpCode}*. Ele expira em 5 minutos.`);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const json = await response.json();

    if (response.ok && json.sid) {
      return res.status(200).json({ success: true, message: 'Código enviado com sucesso!' });
    } else {
      console.error('Twilio OTP Error:', json);
      return res.status(500).json({ error: json.message || 'Erro ao enviar WhatsApp.' });
    }
  } catch (err: any) {
    console.error('Internal OTP send error:', err);
    return res.status(500).json({ error: err.message || 'Erro interno.' });
  }
}
