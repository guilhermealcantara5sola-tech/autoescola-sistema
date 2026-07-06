import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Car, Calendar, Clock, CheckCircle, Plus, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../contexts/AuthContext';

interface AlunoDashboardProps {
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
  instrutor: { nome_completo: string } | null;
  veiculo: { modelo: string; placa: string } | null;
}

export const AlunoDashboard: React.FC<AlunoDashboardProps> = ({ user }) => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [proximaAula, setProximaAula] = useState<Agendamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [tipoAula, setTipoAula] = useState<'pratica_carro' | 'pratica_moto' | 'teorica'>('pratica_carro');
  const [selectedInstrutor, setSelectedInstrutor] = useState('');
  const [selectedVeiculo, setSelectedVeiculo] = useState('');
  const [dataAula, setDataAula] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [disponibilidades, setDisponibilidades] = useState<string[]>([]);
  const [loadingDisp, setLoadingDisp] = useState(false);

  // Database options
  const [instrutores, setInstrutores] = useState<{ id: string; nome_completo: string }[]>([]);
  const [veiculos, setVeiculos] = useState<{ id: string; modelo: string; placa: string; tipo: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all appointments for the student
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id, data, hora_inicio, hora_fim, tipo_aula, status, whatsapp_status,
          instrutor:instrutor_id ( nome_completo ),
          veiculo:veiculo_id ( modelo, placa )
        `)
        .eq('aluno_id', user.id)
        .order('data', { ascending: false })
        .order('hora_inicio', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        id: item.id,
        data: item.data,
        hora_inicio: item.hora_inicio,
        hora_fim: item.hora_fim,
        tipo_aula: item.tipo_aula,
        status: item.status,
        whatsapp_status: item.whatsapp_status,
        instrutor: Array.isArray(item.instrutor) ? item.instrutor[0] : item.instrutor,
        veiculo: Array.isArray(item.veiculo) ? item.veiculo[0] : item.veiculo,
      })) as Agendamento[];

      setAgendamentos(formatted);

      // Find next scheduled class (data >= current_date, status in ['pendente', 'confirmado'])
      const todayStr = new Date().toISOString().split('T')[0];
      const next = formatted
        .filter(a => a.data >= todayStr && (a.status === 'pendente' || a.status === 'confirmado'))
        .reverse()[0] || null; // Reverse because list is ordered desc
      
      setProximaAula(next);
    } catch (err: any) {
      console.error('Erro ao buscar dados do dashboard:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      // Fetch instructors
      const { data: instData, error: instErr } = await supabase
        .from('perfis')
        .select('id, nome_completo')
        .eq('tipo', 'instrutor');
      if (instErr) throw instErr;
      setInstrutores(instData || []);
      if (instData && instData.length > 0) setSelectedInstrutor(instData[0].id);

      // Fetch vehicles
      const { data: vecData, error: vecErr } = await supabase
        .from('veiculos')
        .select('id, modelo, placa, tipo')
        .eq('ativo', true);
      if (vecErr) throw vecErr;
      setVeiculos(vecData || []);
      if (vecData && vecData.length > 0) setSelectedVeiculo(vecData[0].id);
    } catch (err: any) {
      console.error('Erro ao carregar opções para agendamento:', err.message);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchOptions();

    // Inscrever em atualizações em tempo real para os agendamentos do aluno
    const channel = supabase
      .channel(`agendamentos_aluno_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agendamentos',
          filter: `aluno_id=eq.${user.id}`
        },
        () => {
          console.log('Realtime update: reloading dashboard data');
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const fetchAvailableSlots = async () => {
    if (!selectedInstrutor || !dataAula) {
      setDisponibilidades([]);
      return;
    }
    setLoadingDisp(true);
    try {
      const { data: slots, error: slotsErr } = await supabase
        .from('horarios_disponiveis')
        .select('hora_inicio')
        .eq('instrutor_id', selectedInstrutor)
        .eq('data', dataAula)
        .eq('disponivel', true);

      if (slotsErr) throw slotsErr;

      const { data: booked, error: bookedErr } = await supabase
        .from('agendamentos')
        .select('hora_inicio')
        .eq('instrutor_id', selectedInstrutor)
        .eq('data', dataAula)
        .not('status', 'eq', 'cancelado');

      if (bookedErr) throw bookedErr;

      const bookedHours = (booked || []).map(b => b.hora_inicio.substring(0, 5));
      const availableHours = (slots || [])
        .map(s => s.hora_inicio.substring(0, 5))
        .filter(h => !bookedHours.includes(h));

      setDisponibilidades(availableHours);
      if (availableHours.length > 0) {
        setHoraInicio(availableHours[0]);
      } else {
        setHoraInicio('');
      }
    } catch (err: any) {
      console.error('Erro ao buscar horários disponíveis:', err.message);
    } finally {
      setLoadingDisp(false);
    }
  };

  useEffect(() => {
    fetchAvailableSlots();
  }, [selectedInstrutor, dataAula]);

  const handleAgendar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    // Calculate end time (1 hour later)
    const hour = parseInt(horaInicio.split(':')[0]);
    const endHour = String(hour + 1).padStart(2, '0');
    const horaFim = `${endHour}:00:00`;
    const horaInicioFormatted = `${horaInicio}:00`;

    try {
      // 1. Verify Instructor Conflict (Double Booking)
      const { data: instrutorConflict, error: instError } = await supabase
        .from('agendamentos')
        .select('id')
        .eq('instrutor_id', selectedInstrutor)
        .eq('data', dataAula)
        .eq('hora_inicio', horaInicioFormatted)
        .not('status', 'eq', 'cancelado');

      if (instError) throw instError;

      if (instrutorConflict && instrutorConflict.length > 0) {
        setErrorMsg('Este instrutor já tem uma aula agendada para este dia e horário.');
        setSubmitting(false);
        return;
      }

      // 2. Verify Vehicle Conflict (Double Booking for practical classes)
      if (tipoAula !== 'teorica' && selectedVeiculo) {
        const { data: veiculoConflict, error: vecError } = await supabase
          .from('agendamentos')
          .select('id')
          .eq('veiculo_id', selectedVeiculo)
          .eq('data', dataAula)
          .eq('hora_inicio', horaInicioFormatted)
          .not('status', 'eq', 'cancelado');

        if (vecError) throw vecError;

        if (veiculoConflict && veiculoConflict.length > 0) {
          setErrorMsg('Este veículo já está agendado para outra aula neste mesmo horário.');
          setSubmitting(false);
          return;
        }
      }

      const { error } = await supabase.from('agendamentos').insert({
        aluno_id: user.id,
        instrutor_id: selectedInstrutor,
        veiculo_id: tipoAula === 'teorica' ? null : selectedVeiculo, // theoretical class doesn't strictly need a vehicle
        data: dataAula,
        hora_inicio: horaInicioFormatted,
        hora_fim: horaFim,
        tipo_aula: tipoAula,
        status: 'pendente',
        whatsapp_status: 'nao_enviado',
      });

      if (error) throw error;

      setShowModal(false);
      // Reset form
      setDataAula('');
      fetchDashboardData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar agendamento.');
    } finally {
      setSubmitting(false);
    }
  };

  // Stats calculation
  const totalConcluidas = agendamentos.filter(a => a.status === 'realizado' && a.tipo_aula !== 'teorica').length;
  const teoricasConcluidas = agendamentos.filter(a => a.status === 'realizado' && a.tipo_aula === 'teorica').length;
  const progressoPratica = Math.min((totalConcluidas / 20) * 100, 100);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'realizado':
        return <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>Realizada</span>;
      case 'confirmado':
        return <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>Confirmada</span>;
      case 'cancelado':
        return <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--error-bg)', color: 'var(--error-text)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>Cancelada</span>;
      default:
        return <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#b45309', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>Pendente</span>;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'pratica_carro': return '🚗 Prática de Carro';
      case 'pratica_moto': return '🏍️ Prática de Moto';
      case 'teorica': return '📖 Aula Teórica';
      default: return tipo;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="spin" size={32} style={{ color: 'var(--primary)' }} />
        <p>Carregando sua agenda de aluno...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="grid-cols-2" style={{ gridTemplateColumns: '1.7fr 1.3fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Next Scheduled Class Card */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'left' }}>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: 'var(--primary)' }} />
              <span>Próxima Aula Agendada</span>
            </h4>
            
            {proximaAula ? (
              <div style={{ padding: '1.25rem', backgroundColor: 'var(--muted-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ backgroundColor: 'var(--primary-glow)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {proximaAula.tipo_aula === 'pratica_moto' ? <Plus size={24} style={{ color: 'var(--primary)' }} /> : <Car size={32} style={{ color: 'var(--primary)' }} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--foreground)', fontWeight: 600 }}>
                    {getTipoLabel(proximaAula.tipo_aula)}
                  </h3>
                  <p style={{ fontSize: '0.9rem', margin: '0.2rem 0' }}>
                    {new Date(proximaAula.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>
                    Horário: {proximaAula.hora_inicio.substring(0, 5)} - {proximaAula.hora_fim.substring(0, 5)}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                    {proximaAula.instrutor ? `Instrutor: ${proximaAula.instrutor.nome_completo}` : ''}
                    {proximaAula.veiculo ? ` • Veículo: ${proximaAula.veiculo.modelo} (${proximaAula.veiculo.placa})` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                <Calendar size={32} style={{ color: 'var(--muted)', marginBottom: '0.5rem' }} />
                <p style={{ color: 'var(--muted)', margin: 0 }}>Você não tem nenhuma aula agendada no momento.</p>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button 
              onClick={() => { setShowModal(true); }}
              className="btn btn-primary" 
              style={{ flex: 1, height: '42px' }}
            >
              <Plus size={16} />
              <span>Agendar Nova Aula</span>
            </button>
            <button 
              onClick={fetchDashboardData}
              className="btn btn-secondary" 
              style={{ flex: 1, height: '42px' }}
            >
              <span>Atualizar Histórico</span>
            </button>
          </div>
        </div>

        {/* Student Progress Card */}
        <div className="card" style={{ padding: '1.5rem', textAlign: 'left' }}>
          <h4 style={{ marginBottom: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={18} style={{ color: 'var(--success)' }} />
            <span>Meu Progresso</span>
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Practical Classes Progress Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                <span>Aulas Práticas Realizadas</span>
                <strong style={{ color: 'var(--foreground)' }}>{totalConcluidas} de 20</strong>
              </div>
              <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--border)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${progressoPratica}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '5px', transition: 'width 0.5s ease-in-out' }}></div>
              </div>
            </div>

            {/* Theoretical Attendance */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>Aulas Teóricas Concluídas</p>
                <h3 style={{ fontSize: '1.5rem', margin: '0.2rem 0 0', fontWeight: 700, color: 'var(--foreground)' }}>{teoricasConcluidas}</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>100% Presença</span>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', padding: '0.75rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.5rem', fontSize: '0.85rem', border: '1px solid var(--success-border)', lineHeight: 1.4 }}>
              <span>💡</span>
              <span><strong>Dica:</strong> Lembre-se de confirmar sua presença respondendo ao WhatsApp enviado na véspera da sua aula!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Classes History list */}
      <div className="card" style={{ padding: '1.5rem', textAlign: 'left' }}>
        <h4 style={{ marginBottom: '1.25rem', fontWeight: 600 }}>Histórico Completo de Aulas</h4>
        
        {agendamentos.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {agendamentos.map((item) => (
              <div 
                key={item.id}
                style={{ 
                  padding: '1rem', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius-md)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  transition: 'transform 0.2s',
                }}
              >
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--foreground)', margin: '0 0 0.2rem 0' }}>
                    {getTipoLabel(item.tipo_aula)}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>
                    Data: {new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR')} • Horário: {item.hora_inicio.substring(0, 5)} - {item.hora_fim.substring(0, 5)}
                  </p>
                  {item.instrutor && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0.2rem 0 0 0' }}>
                      Instrutor: {item.instrutor.nome_completo} {item.veiculo ? `• Veículo: ${item.veiculo.modelo} (${item.veiculo.placa})` : ''}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                  {getStatusBadge(item.status)}
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                    WhatsApp: {
                      item.whatsapp_status === 'confirmado_aluno' ? '✅ Confirmado' :
                      item.whatsapp_status === 'recusado_aluno' ? '❌ Cancelado pelo Aluno' :
                      item.whatsapp_status === 'enviado' ? '📤 Enviado' : '⏳ Não enviado'
                    }
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--muted)' }}>
            Nenhuma aula encontrada no seu histórico de agendamentos.
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }} className="fade-in">
          <div className="card glass-card" style={{ maxWidth: '500px', width: '100%', padding: '2rem', textAlign: 'left', position: 'relative' }}>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Agendar Nova Aula</h3>
            
            {errorMsg && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                <span>⚠️</span>
                <div>{errorMsg}</div>
              </div>
            )}

            <form onSubmit={handleAgendar}>
              
              {/* Class Type */}
              <div className="form-group">
                <label className="form-label" htmlFor="classType">Tipo de Aula</label>
                <select 
                  id="classType" 
                  className="form-control" 
                  value={tipoAula}
                  onChange={(e) => setTipoAula(e.target.value as any)}
                >
                  <option value="pratica_carro">🚗 Prática de Carro</option>
                  <option value="pratica_moto">🏍️ Prática de Moto</option>
                  <option value="teorica">📖 Aula Teórica</option>
                </select>
              </div>

              {/* Date selection */}
              <div className="form-group">
                <label className="form-label" htmlFor="classDate">Data da Aula</label>
                <input 
                  id="classDate"
                  type="date"
                  className="form-control"
                  value={dataAula}
                  onChange={(e) => setDataAula(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              {/* Time selection */}
              <div className="form-group">
                <label className="form-label" htmlFor="classTime">Horário de Início</label>
                {loadingDisp ? (
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Buscando horários disponíveis...</p>
                ) : (
                  <select 
                    id="classTime"
                    className="form-control"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    required
                    disabled={!dataAula || disponibilidades.length === 0}
                  >
                    {!dataAula ? (
                      <option value="">Selecione uma data primeiro</option>
                    ) : disponibilidades.length > 0 ? (
                      disponibilidades.map(h => (
                        <option key={h} value={h}>{h} (Duração: 1h)</option>
                      ))
                    ) : (
                      <option value="">Nenhum horário liberado pelo instrutor para esta data</option>
                    )}
                  </select>
                )}
              </div>

              {/* Instructor selection */}
              <div className="form-group">
                <label className="form-label" htmlFor="classInstructor">Instrutor</label>
                <select 
                  id="classInstructor"
                  className="form-control"
                  value={selectedInstrutor}
                  onChange={(e) => setSelectedInstrutor(e.target.value)}
                  required
                >
                  {instrutores.length > 0 ? (
                    instrutores.map(i => <option key={i.id} value={i.id}>{i.nome_completo}</option>)
                  ) : (
                    <option value="">Nenhum instrutor disponível</option>
                  )}
                </select>
              </div>

              {/* Vehicle selection (only if practical class) */}
              {tipoAula !== 'teorica' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="classVehicle">Veículo</label>
                  <select 
                    id="classVehicle"
                    className="form-control"
                    value={selectedVeiculo}
                    onChange={(e) => setSelectedVeiculo(e.target.value)}
                    required
                  >
                    {veiculos.filter(v => tipoAula === 'pratica_carro' ? v.tipo === 'carro' : v.tipo === 'moto').length > 0 ? (
                      veiculos
                        .filter(v => tipoAula === 'pratica_carro' ? v.tipo === 'carro' : v.tipo === 'moto')
                        .map(v => <option key={v.id} value={v.id}>{v.modelo} ({v.placa})</option>)
                    ) : (
                      <option value="">Nenhum veículo disponível para esta categoria</option>
                    )}
                  </select>
                </div>
              )}

              {/* Submit & Cancel Buttons */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={submitting || !horaInicio || disponibilidades.length === 0}
                >
                  {submitting ? 'Reservando...' : 'Confirmar Agendamento'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};
