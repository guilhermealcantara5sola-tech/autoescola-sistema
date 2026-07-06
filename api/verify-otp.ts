/// <reference types="node" />
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed. Must be POST.' });
  }

  const { phone, code } = req.body || {};

  if (!phone || !code) {
    return res.status(400).json({ error: 'Falta telefone ou código.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  let cleanPhone = phone.trim().replace(/[^\d+]/g, '');
  if (!cleanPhone.startsWith('+')) {
    cleanPhone = `+55${cleanPhone}`;
  }

  try {
    // Query OTP from database
    const { data, error } = await supabase
      .from('otps')
      .select('*')
      .eq('telefone', cleanPhone)
      .single();

    if (error || !data) {
      return res.status(400).json({ error: 'Código não encontrado ou não gerado para este telefone.' });
    }

    // Check expiry
    const expiresAt = new Date(data.expira_em);
    const now = new Date();

    if (now.getTime() > expiresAt.getTime()) {
      return res.status(400).json({ error: 'Código expirado. Por favor, gere um novo código.' });
    }

    // Check code matches
    if (data.codigo.trim() !== code.trim()) {
      return res.status(400).json({ error: 'Código incorreto. Tente novamente.' });
    }

    // Success! We keep the OTP for the next step where it will be verified and deleted.
    return res.status(200).json({ success: true, verified: true });
  } catch (err: any) {
    console.error('Internal OTP verification error:', err);
    return res.status(500).json({ error: err.message || 'Erro interno.' });
  }
}
