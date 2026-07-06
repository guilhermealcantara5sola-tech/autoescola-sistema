/// <reference types="node" />
import { createClient } from '@supabase/supabase-js';

function formatBrazilianPhone(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('55') && (clean.length === 12 || clean.length === 13)) {
    clean = clean.substring(2);
  }
  if (clean.length === 11) {
    const ddd = parseInt(clean.substring(0, 2), 10);
    const leadingNine = clean.charAt(2);
    if (ddd >= 31 && leadingNine === '9') {
      clean = clean.substring(0, 2) + clean.substring(3);
    }
  }
  return `+55${clean}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed. Must be POST.' });
  }

  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Falta o e-mail para recuperação.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseKey) {
    return res.status(500).json({ error: 'Chave de serviço (service_role) não configurada.' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Find user in auth.users by email
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    const authUser = (usersData.users as any[]).find((u: any) => u.email?.toLowerCase() === email.trim().toLowerCase());
    if (!authUser) {
      return res.status(404).json({ error: 'Nenhum usuário cadastrado com este e-mail.' });
    }

    // 2. Find profile in public.perfis to get their phone number
    const { data: profile, error: profileError } = await supabase
      .from('perfis')
      .select('nome_completo, telefone')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile || !profile.telefone) {
      return res.status(404).json({ error: 'Usuário encontrado, mas não possui telefone cadastrado no perfil.' });
    }

    const rawPhone = profile.telefone;
    const cleanPhone = formatBrazilianPhone(rawPhone);

    // Generate masked phone: e.g. "(33) *****-4462"
    let maskedPhone = rawPhone;
    const digitsOnly = rawPhone.replace(/\D/g, '');
    if (digitsOnly.length >= 8) {
      const ddd = digitsOnly.substring(0, digitsOnly.length - 8);
      const last4 = digitsOnly.substring(digitsOnly.length - 4);
      maskedPhone = `(${ddd}) *****-${last4}`;
    }

    // 3. Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // 4. Save or update OTP in the database
    const { error: dbError } = await supabase
      .from('otps')
      .upsert({ telefone: cleanPhone, codigo: otpCode, expira_em: expiresAt });

    if (dbError) throw dbError;

    // 5. Send code via Twilio WhatsApp
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const senderNumber = process.env.TWILIO_SENDER_NUMBER || 'whatsapp:+14155238886';

    if (!accountSid || !authToken) {
      return res.status(500).json({ error: 'Twilio credentials not configured' });
    }

    const formattedPhone = `whatsapp:${cleanPhone}`;
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const params = new URLSearchParams();
    params.append('To', formattedPhone);
    params.append('From', senderNumber);
    params.append('Body', `Seu código de segurança para redefinir sua senha na Autoescola Connect é: *${otpCode}*. Ele expira em 5 minutos.`);

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
      return res.status(200).json({ 
        success: true, 
        maskedPhone, 
        phone: cleanPhone 
      });
    } else {
      console.error('Twilio Send OTP Error:', json);
      return res.status(500).json({ error: json.message || 'Erro ao enviar WhatsApp.' });
    }

  } catch (err: any) {
    console.error('Password reset OTP error:', err);
    return res.status(500).json({ error: err.message || 'Erro interno.' });
  }
}
