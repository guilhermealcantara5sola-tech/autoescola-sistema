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

  const { email, code, password } = req.body || {};

  if (!email || !code || !password) {
    return res.status(400).json({ error: 'Falta e-mail, código ou nova senha.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseKey) {
    return res.status(500).json({ error: 'Service role key not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Find user in auth.users by email
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    const authUser = usersData.users.find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
    if (!authUser) {
      return res.status(404).json({ error: 'Nenhum usuário cadastrado com este e-mail.' });
    }

    // 2. Find profile in public.perfis to get their phone number
    const { data: profile, error: profileError } = await supabase
      .from('perfis')
      .select('telefone')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile || !profile.telefone) {
      return res.status(404).json({ error: 'Usuário encontrado, mas não possui telefone no perfil.' });
    }

    const cleanPhone = formatBrazilianPhone(profile.telefone);

    // 3. Verify OTP
    const { data: otpData, error: otpError } = await supabase
      .from('otps')
      .select('*')
      .eq('telefone', cleanPhone)
      .single();

    if (otpError) {
      return res.status(400).json({ error: `Erro no banco (OTP): ${otpError.message}` });
    }
    if (!otpData) {
      return res.status(400).json({ error: 'Código de verificação não encontrado no banco de dados para este telefone.' });
    }

    const expiresAt = new Date(otpData.expira_em);
    const now = new Date();
    if (now.getTime() > expiresAt.getTime()) {
      return res.status(400).json({ error: 'Código expirado. Solicite outro.' });
    }

    if (otpData.codigo.trim() !== code.trim()) {
      return res.status(400).json({ error: 'Código de verificação incorreto.' });
    }

    // 4. Update user password in auth.users via admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: password
    });

    if (updateError) {
      throw updateError;
    }

    // 5. Delete the used OTP code
    await supabase.from('otps').delete().eq('telefone', cleanPhone);

    return res.status(200).json({ success: true, message: 'Senha redefinida com sucesso!' });
  } catch (err: any) {
    console.error('Password reset OTP error:', err);
    return res.status(500).json({ error: err.message || 'Erro interno do servidor.' });
  }
}
