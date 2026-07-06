/// <reference types="node" />
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Support both GET and POST for easy manual testing in the browser
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const senderNumber = process.env.TWILIO_SENDER_NUMBER || 'whatsapp:+14155238886';

  if (!accountSid || !authToken) {
    return res.status(500).json({
      error: 'Twilio credentials not configured in environment variables (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)'
    });
  }

  const formattedSender = senderNumber.startsWith('whatsapp:') ? senderNumber : `whatsapp:${senderNumber}`;

  try {
    const agendamentoId = req.query.id || (req.body && req.body.id);
    let targetDateStr = '';

    let query = supabase
      .from('agendamentos')
      .select(`
        id,
        data,
        hora_inicio,
        tipo_aula,
        aluno:aluno_id ( nome_completo, telefone )
      `);

    if (agendamentoId) {
      console.log(`Sending single WhatsApp notification for booking ID: ${agendamentoId}`);
      query = query.eq('id', agendamentoId);
    } else {
      // 1. Calculate tomorrow's date in Brazil Timezone (UTC-3)
      const targetDate = new Date();
      targetDate.setHours(targetDate.getHours() - 3 + 24);
      targetDateStr = targetDate.toISOString().split('T')[0];

      console.log(`Scanning database for classes scheduled on: ${targetDateStr}`);
      query = query
        .eq('data', targetDateStr)
        .in('status', ['pendente', 'confirmado'])
        .in('whatsapp_status', ['nao_enviado', 'erro']);
    }

    const { data: agendamentos, error: dbError } = await query;

    if (dbError) throw dbError;

    if (!agendamentos || agendamentos.length === 0) {
      return res.status(200).json({
        message: agendamentoId 
          ? `Booking with ID ${agendamentoId} not found.`
          : 'No classes found needing WhatsApp notifications for tomorrow.',
        date: targetDateStr || undefined
      });
    }

    const results = [];

    // 3. Loop and send WhatsApp messages via Twilio REST API
    for (const item of agendamentos) {
      const aluno = Array.isArray(item.aluno) ? item.aluno[0] : item.aluno;
      
      if (!aluno || !aluno.telefone) {
        results.push({ id: item.id, status: 'ignored', reason: 'Student profile has no phone number' });
        continue;
      }

      let phone = aluno.telefone.trim();
      // Clean phone number: keep only digits and '+'
      phone = phone.replace(/[^\d+]/g, '');
      // If it doesn't start with '+', assume Brazilian country code (+55)
      if (!phone.startsWith('+')) {
        phone = `+55${phone}`;
      }
      const formattedPhone = `whatsapp:${phone}`;
      const rawName = aluno.nome_completo || 'Aluno';
      const firstName = rawName.split(' ')[0];

      let classTypeLabel = '';
      if (item.tipo_aula === 'pratica_carro') classTypeLabel = 'Prática de Carro';
      else if (item.tipo_aula === 'pratica_moto') classTypeLabel = 'Prática de Moto';
      else classTypeLabel = 'Teórica';

      const hora = item.hora_inicio.substring(0, 5);

      // Calculate diff in days to make text dynamic (hoje, amanhã, or no dia XX/XX/XXXX)
      const classDate = new Date(item.data + 'T12:00:00');
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const diffTime = classDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let dayText = '';
      if (diffDays === 0) dayText = 'hoje';
      else if (diffDays === 1) dayText = 'amanhã';
      else dayText = `no dia ${classDate.toLocaleDateString('pt-BR')}`;

      // Build message body
      const bodyText = `Olá ${firstName}, confirma sua aula de ${classTypeLabel} ${dayText} (${classDate.toLocaleDateString('pt-BR')}) às ${hora}? Responda 1 para CONFIRMAR ou 2 para CANCELAR.`;

      try {
        const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const params = new URLSearchParams();
        params.append('To', formattedPhone);
        params.append('From', formattedSender);
        params.append('Body', bodyText);

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
          // Update status in database to 'enviado' and store the message SID
          await supabase
            .from('agendamentos')
            .update({
              whatsapp_status: 'enviado',
              mensagem_sid: json.sid
            })
            .eq('id', item.id);

          results.push({ id: item.id, student: rawName, phone: phone, status: 'sent', sid: json.sid });
        } else {
          console.error(`Twilio Error for student ${rawName}:`, json);
          await supabase
            .from('agendamentos')
            .update({ whatsapp_status: 'erro' })
            .eq('id', item.id);

          results.push({ id: item.id, student: rawName, status: 'error', detail: json.message || json });
        }
      } catch (err: any) {
        console.error(`Fetch exception for student ${rawName}:`, err);
        await supabase
          .from('agendamentos')
          .update({ whatsapp_status: 'erro' })
          .eq('id', item.id);

        results.push({ id: item.id, student: rawName, status: 'exception', message: err.message });
      }
    }

    return res.status(200).json({
      message: 'Processing finished.',
      date: targetDateStr || undefined,
      results
    });

  } catch (err: any) {
    console.error('Internal server error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
