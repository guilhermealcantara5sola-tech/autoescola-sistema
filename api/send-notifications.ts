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
    let leadHours = 24;

    // Fetch the global lead hours from the database config
    if (!agendamentoId) {
      try {
        const { data: configData } = await supabase
          .from('configuracoes')
          .select('valor')
          .eq('chave', 'whatsapp_antecedencia')
          .single();
        if (configData && configData.valor) {
          leadHours = parseInt(configData.valor, 10);
        }
      } catch (e) {
        console.log('Using default 24h lead time (table configuracoes not found or error)');
      }
    }

    let query = supabase
      .from('agendamentos')
      .select(`
        *,
        aluno:aluno_id ( nome_completo, telefone )
      `);

    if (agendamentoId) {
      console.log(`Sending single WhatsApp notification for booking ID: ${agendamentoId}`);
      query = query.eq('id', agendamentoId);
    } else {
      // Fetch classes for today and the next 3 days to cover all possible lead times
      const today = new Date();
      today.setHours(today.getHours() - 3); // Brazil Time
      const todayStr = today.toISOString().split('T')[0];

      const maxDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
      const maxDateStr = maxDate.toISOString().split('T')[0];

      console.log(`Scanning database for classes scheduled between: ${todayStr} and ${maxDateStr}`);
      query = query
        .gte('data', todayStr)
        .lte('data', maxDateStr)
        .in('status', ['pendente', 'confirmado'])
        .in('whatsapp_status', ['nao_enviado', 'erro']);
    }

    const { data: agendamentos, error: dbError } = await query;

    if (dbError) throw dbError;

    if (!agendamentos || agendamentos.length === 0) {
      return res.status(200).json({
        message: agendamentoId 
          ? `Booking with ID ${agendamentoId} not found.`
          : 'No classes found needing WhatsApp notifications.',
        results: []
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

      const cleanPhone = formatBrazilianPhone(aluno.telefone);
      const formattedPhone = `whatsapp:${cleanPhone}`;
      const rawName = aluno.nome_completo || 'Aluno';
      const firstName = rawName.split(' ')[0];

      // Calculate hours remaining until class start
      const classStartStr = `${item.data}T${item.hora_inicio}`;
      const classDate = new Date(`${classStartStr}-03:00`); // Brazil timezone
      const now = new Date();
      const diffMs = classDate.getTime() - now.getTime();
      const hoursRemaining = diffMs / (1000 * 60 * 60);

      // If we are scanning automatically, verify if this class is due
      if (!agendamentoId) {
        const L = item.whatsapp_antecedencia !== undefined && item.whatsapp_antecedencia !== null
          ? Number(item.whatsapp_antecedencia)
          : leadHours;

        // Skip if class is in the past, or starts further than the lead hours
        if (hoursRemaining <= 0 || hoursRemaining > L) {
          continue;
        }
      }

      let classTypeLabel = '';
      if (item.tipo_aula === 'pratica_carro') classTypeLabel = 'Prática de Carro';
      else if (item.tipo_aula === 'pratica_moto') classTypeLabel = 'Prática de Moto';
      else classTypeLabel = 'Teórica';

      const hora = item.hora_inicio.substring(0, 5);

      // Calculate diff in days to make text dynamic (hoje, amanhã, or no dia XX/XX/XXXX)
      const classDayDate = new Date(item.data + 'T12:00:00');
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const diffTime = classDayDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let dayText = '';
      if (diffDays === 0) dayText = 'hoje';
      else if (diffDays === 1) dayText = 'amanhã';
      else dayText = `no dia ${classDayDate.toLocaleDateString('pt-BR')}`;

      // Build message body
      const bodyText = `Olá ${firstName}, confirma sua aula de ${classTypeLabel} ${dayText} (${classDayDate.toLocaleDateString('pt-BR')}) às ${hora}? Responda 1 para CONFIRMAR ou 2 para CANCELAR.`;

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
      results
    });

  } catch (err: any) {
    console.error('Internal server error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
