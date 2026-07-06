import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../contexts/AuthContext';

interface InstrutorDashboardProps {
  user: User;
  profile: Profile;
}

interface Agendamento {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  tipo_aula: 'pratica_carro' | 'pratica_moto' | 'teorica';
  status: 'pendente' | 'confirmado' | 'cancelado' | 'realizado';
  whatsapp_status: string;
  aluno: { nome_completo: string; telefone: string } | null;
  veiculo: { modelo: string; placa: string } | null;
}

export const InstrutorDashboard: React.FC<InstrutorDashboardProps> = ({ user }) => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAgenda = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id, data, hora_inicio, hora_fim, tipo_aula, status, whatsapp_status,
          aluno:aluno_id ( nome_completo, telefone ),
          veiculo:veiculo_id ( modelo, placa )
        `)
        .eq('instrutor_id', user.id)
        .eq('data', selectedDate)
        .order('hora_inicio', { ascending: true });

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        id: item.id,
        data: item.data,
        hora_inicio: item.hora_inicio,
        hora_fim: item.hora_fim,
        tipo_aula: item.tipo_aula,
        status: item.status,
        whatsapp_status: item.whatsapp_status,
        aluno: Array.isArray(item.aluno) ? item.aluno[0] : item.aluno,
        veiculo: Array.isArray(item.veiculo) ? item.veiculo[0] : item.veiculo,
      })) as Agendamento[];

      setAgendamentos(formatted);
    } catch (err: any) {
      console.error('Erro ao buscar agenda do instrutor:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgenda();
  }, [user.id, selectedDate]);

  const updateStatus = async (id: string, newStatus: 'realizado' | 'cancelado') => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch (err: any) {
      console.error('Erro ao atualizar status da aula:', err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'pratica_carro': return '🚗 Carro';
      case 'pratica_moto': return '🏍️ Moto';
      case 'teorica': return '📖 Teórica';
      default: return tipo;
    }
  };

  // Stats for the chosen date
  const aulasHoje = agendamentos.length;
  const concluidasHoje = agendamentos.filter(a => a.status === 'realizado').length;
  const pendentesHoje = agendamentos.filter(a => a.status === 'pendente' || a.status === 'confirmado').length;

  return (
    <div className="fade-in">
      <h3 style={{ marginBottom: '1.5rem', fontWeight: 600, textAlign: 'left' }}>Minha Agenda de Aulas</h3>

      {/* Date picker and stats header */}
      <div className="grid-cols-2" style={{ gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Date Selector Card */}
        <div className="card" style={{ padding: '1.5rem', textAlign: 'left' }}>
          <label className="form-label" htmlFor="agendaDate" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Calendar size={18} style={{ color: 'var(--primary)' }} />
            <span>Selecionar Data da Agenda</span>
          </label>
          <input 
            id="agendaDate"
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ fontSize: '1rem', height: '42px' }}
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.75rem', margin: 0 }}>
            Visualizando agenda para: <strong>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
          </p>
        </div>

        {/* Stats Card */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>Aulas no Dia</p>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--foreground)' }}>{aulasHoje}</h2>
          </div>
          <div style={{ width: '1px', height: '50px', backgroundColor: 'var(--border)' }}></div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--success-text)', margin: 0 }}>Concluídas</p>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--success)' }}>{concluidasHoje}</h2>
          </div>
          <div style={{ width: '1px', height: '50px', backgroundColor: 'var(--border)' }}></div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: '#b45309', margin: 0 }}>Pendentes</p>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--accent)' }}>{pendentesHoje}</h2>
          </div>
        </div>

      </div>

      {/* Main Agenda list */}
      <div className="card" style={{ padding: '1.5rem', textAlign: 'left' }}>
        <h4 style={{ marginBottom: '1.25rem', fontWeight: 600 }}>Horários e Presenças</h4>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', flexDirection: 'column', gap: '1rem' }}>
            <Loader2 className="spin" size={28} style={{ color: 'var(--primary)' }} />
            <p style={{ color: 'var(--muted)' }}>Carregando horários...</p>
          </div>
        ) : agendamentos.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {agendamentos.map((item) => (
              <div 
                key={item.id}
                style={{ 
                  padding: '1.25rem', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}
              >
                {/* Left info */}
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', minWidth: '90px', padding: '0.5rem', backgroundColor: 'var(--muted-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--foreground)', display: 'block' }}>
                      {item.hora_inicio.substring(0, 5)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      até {item.hora_fim.substring(0, 5)}
                    </span>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 600, color: 'var(--foreground)', fontSize: '1.05rem' }}>
                      {item.aluno ? item.aluno.nome_completo : 'Aluno não informado'}
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>
                      Telefone: {item.aluno ? item.aluno.telefone : 'N/A'} • Tipo: {getTipoLabel(item.tipo_aula)}
                    </p>
                    {item.veiculo && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem', margin: 0 }}>
                        Veículo: {item.veiculo.modelo} ({item.veiculo.placa})
                      </p>
                    )}
                  </div>
                </div>

                {/* Right actions/status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
                  
                  {/* WhatsApp status display */}
                  <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block' }}>WhatsApp Confirm:</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: item.whatsapp_status === 'confirmado_aluno' ? 'var(--success)' : 'var(--muted)' }}>
                      {
                        item.whatsapp_status === 'confirmado_aluno' ? '✅ Confirmado' :
                        item.whatsapp_status === 'recusado_aluno' ? '❌ Cancelado' :
                        item.whatsapp_status === 'enviado' ? '📤 Enviado' : '⏳ Não enviado'
                      }
                    </span>
                  </div>

                  {/* Actions depending on status */}
                  {item.status === 'realizado' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>
                      <CheckCircle2 size={18} />
                      <span>Concluída</span>
                    </div>
                  ) : item.status === 'cancelado' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--error)', fontWeight: 600, fontSize: '0.9rem' }}>
                      <XCircle size={18} />
                      <span>Cancelada</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => updateStatus(item.id, 'cancelado')}
                        className="btn btn-secondary" 
                        style={{ height: '36px', padding: '0 0.75rem', borderColor: 'var(--error-border)', color: 'var(--error-text)' }}
                        disabled={updatingId !== null}
                      >
                        Não Compareceu
                      </button>
                      <button 
                        onClick={() => updateStatus(item.id, 'realizado')}
                        className="btn btn-primary" 
                        style={{ height: '36px', padding: '0 0.75rem', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                        disabled={updatingId !== null}
                      >
                        Concluir Aula
                      </button>
                    </div>
                  )}

                </div>

              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
            Nenhuma aula agendada para este dia.
          </div>
        )}
      </div>

    </div>
  );
};
