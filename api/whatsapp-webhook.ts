import { createClient } from '@supabase/supabase-js';

// Helper to return a TwiML XML response to reply to the user's WhatsApp message instantly
function sendTwiMLReply(res: any, text: string) {
  res.setHeader('Content-Type', 'text/xml');
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${text}</Message>
</Response>`;
  return res.status(200).send(twiml);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed. Must be POST.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = req.body || {};
    const fromPhone = body.From || ''; // E.g. "whatsapp:+5511988881111"
    const msgText = (body.Body || '').trim();

    console.log(`Received incoming WhatsApp webhook from: ${fromPhone} | Message: ${msgText}`);

    if (!fromPhone) {
      return res.status(400).json({ error: 'Missing From parameter.' });
    }

    // Clean phone number: remove 'whatsapp:' prefix
    const cleanedPhone = fromPhone.replace('whatsapp:', '').trim();

    // 1. Find the student profile by matching the phone number
    const { data: profiles, error: dbError } = await supabase
      .from('perfis')
      .select('id, nome_completo, telefone')
      .eq('telefone', cleanedPhone);

    if (dbError) throw dbError;

    let profile = profiles?.[0];

    // Fallback: If no exact match (due to formatting variations like missing country code '+55'),
    // do a fuzzy match using the last 8 digits of the incoming phone number.
    if (!profile && cleanedPhone.length >= 8) {
      const last8Digits = cleanedPhone.substring(cleanedPhone.length - 8);
      const { data: allProfiles } = await supabase
        .from('perfis')
        .select('id, nome_completo, telefone')
        .eq('tipo', 'aluno');

      profile = allProfiles?.find(p => {
        const dbClean = (p.telefone || '').replace(/\D/g, '');
        return dbClean.endsWith(last8Digits);
      });
    }

    if (!profile) {
      console.log(`No student profile found matching phone: ${cleanedPhone}`);
      return sendTwiMLReply(
        res,
        'Olá! Não encontramos nenhum aluno cadastrado com este número de telefone no sistema da autoescola.'
      );
    }

    console.log(`Matched student profile: ${profile.nome_completo} (ID: ${profile.id})`);

    // 2. Fetch the student's next pending or confirmed class (starting from today)
    const today = new Date();
    // Adjust UTC to Brazil timezone
    today.setHours(today.getHours() - 3);
    const todayStr = today.toISOString().split('T')[0];

    const { data: agendamentos, error: classError } = await supabase
      .from('agendamentos')
      .select('id, data, hora_inicio, status, tipo_aula')
      .eq('aluno_id', profile.id)
      .gte('data', todayStr)
      .in('status', ['pendente', 'confirmado'])
      .order('data', { ascending: true })
      .order('hora_inicio', { ascending: true })
      .limit(1);

    if (classError) throw classError;

    const agendamento = agendamentos?.[0];

    if (!agendamento) {
      console.log(`No pending/confirmed classes found for student: ${profile.nome_completo}`);
      return sendTwiMLReply(
        res,
        `Olá ${profile.nome_completo.split(' ')[0]}, você não tem nenhuma aula pendente de confirmação para os próximos dias.`
      );
    }

    // 3. Process the response
    if (msgText === '1') {
      // Confirm the class
      const { error: updateError } = await supabase
        .from('agendamentos')
        .update({
          status: 'confirmado',
          whatsapp_status: 'confirmado_aluno'
        })
        .eq('id', agendamento.id);

      if (updateError) throw updateError;

      console.log(`Class ${agendamento.id} successfully CONFIRMED by student.`);
      return sendTwiMLReply(
        res,
        `Obrigado, ${profile.nome_completo.split(' ')[0]}! Sua aula foi CONFIRMADA com sucesso no sistema. Nos vemos amanhã!`
      );

    } else if (msgText === '2') {
      // Cancel the class
      const { error: updateError } = await supabase
        .from('agendamentos')
        .update({
          status: 'cancelado',
          whatsapp_status: 'recusado_aluno'
        })
        .eq('id', agendamento.id);

      if (updateError) throw updateError;

      console.log(`Class ${agendamento.id} successfully CANCELLED by student.`);
      return sendTwiMLReply(
        res,
        `Sua aula foi CANCELADA no sistema. Por favor, entre em contato com a secretaria da autoescola para realizar o reagendamento.`
      );

    } else {
      // Invalid response text
      console.log(`Invalid response text received: "${msgText}"`);
      return sendTwiMLReply(
        res,
        `Olá ${profile.nome_completo.split(' ')[0]}! Não entendi sua resposta. Para confirmar sua aula de amanhã, responda apenas:\n\n*1* para CONFIRMAR\n*2* para CANCELAR.`
      );
    }

  } catch (err: any) {
    console.error('Error in WhatsApp webhook handler:', err);
    return sendTwiMLReply(
      res,
      'Desculpe, ocorreu um erro interno ao processar sua mensagem. Por favor, tente novamente mais tarde.'
    );
  }
}
