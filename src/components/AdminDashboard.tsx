import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Car, Calendar, Shield, Trash2, Plus, RefreshCw, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../contexts/AuthContext';

interface AdminDashboardProps {
  user: User;
  profile: Profile;
}

interface Vehicle {
  id: string;
  modelo: string;
  placa: string;
  tipo: 'carro' | 'moto';
  ativo: boolean;
  created_at: string;
}

interface Instructor {
  id: string;
  nome_completo: string;
  telefone: string;
  email?: string;
  created_at: string;
}

interface Agendamento {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  tipo_aula: string;
  status: string;
  whatsapp_status: string;
  aluno: { nome_completo: string } | null;
  instrutor: { nome_completo: string } | null;
  veiculo: { modelo: string; placa: string } | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'agendamentos' | 'veiculos' | 'instrutores'>('geral');
  const [loading, setLoading] = useState(true);

  // Data states
  const [metrics, setMetrics] = useState({ totalAlunos: 0, totalInstrutores: 0, totalAulasHoje: 0, totalVeiculos: 0 });
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [veiculos, setVeiculos] = useState<Vehicle[]>([]);
  const [instrutores, setInstrutores] = useState<Instructor[]>([]);

  // Form modals state
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New vehicle form fields
  const [newModelo, setNewModelo] = useState('');
  const [newPlaca, setNewPlaca] = useState('');
  const [newTipo, setNewTipo] = useState<'carro' | 'moto'>('carro');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // Alunos count
      const { count: alunosCount } = await supabase
        .from('perfis')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'aluno');

      // Instrutores count
      const { count: instrutoresCount } = await supabase
        .from('perfis')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'instrutor');

      // Aulas hoje count
      const { count: aulasHojeCount } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact', head: true })
        .eq('data', todayStr);

      // Veiculos count
      const { count: veiculosCount } = await supabase
        .from('veiculos')
        .select('*', { count: 'exact', head: true });

      setMetrics({
        totalAlunos: alunosCount || 0,
        totalInstrutores: instrutoresCount || 0,
        totalAulasHoje: aulasHojeCount || 0,
        totalVeiculos: veiculosCount || 0
      });
    } catch (err: any) {
      console.error('Erro ao buscar métricas:', err.message);
    }
  };

  const fetchAgendamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id, data, hora_inicio, hora_fim, tipo_aula, status, whatsapp_status,
          aluno:aluno_id ( nome_completo ),
          instrutor:instrutor_id ( nome_completo ),
          veiculo:veiculo_id ( modelo, placa )
        `)
        .order('data', { ascending: false })
        .limit(100);

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
        instrutor: Array.isArray(item.instrutor) ? item.instrutor[0] : item.instrutor,
        veiculo: Array.isArray(item.veiculo) ? item.veiculo[0] : item.veiculo,
      })) as Agendamento[];

      setAgendamentos(formatted);
    } catch (err: any) {
      console.error('Erro ao buscar agendamentos:', err.message);
    }
  };

  const fetchVeiculos = async () => {
    try {
      const { data, error } = await supabase
        .from('veiculos')
        .select('*')
        .order('modelo', { ascending: true });
      if (error) throw error;
      setVeiculos(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar veículos:', err.message);
    }
  };

  const fetchInstrutores = async () => {
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('id, nome_completo, telefone, created_at')
        .eq('tipo', 'instrutor')
        .order('nome_completo', { ascending: true });
      if (error) throw error;
      setInstrutores(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar instrutores:', err.message);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchMetrics(),
      fetchAgendamentos(),
      fetchVeiculos(),
      fetchInstrutores()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, [user.id]);

  // Actions
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('veiculos')
        .insert({
          modelo: newModelo,
          placa: newPlaca.toUpperCase(),
          tipo: newTipo,
          ativo: true
        });

      if (error) throw error;

      setShowVehicleModal(false);
      setNewModelo('');
      setNewPlaca('');
      fetchVeiculos();
      fetchMetrics();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao adicionar veículo.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVehicleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('veiculos')
        .update({ ativo: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      setVeiculos(prev => prev.map(v => v.id === id ? { ...v, ativo: !currentStatus } : v));
    } catch (err: any) {
      console.error('Erro ao alternar status do veículo:', err.message);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja deletar este veículo?')) return;
    try {
      const { error } = await supabase
        .from('veiculos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setVeiculos(prev => prev.filter(v => v.id !== id));
      fetchMetrics();
    } catch (err: any) {
      console.error('Erro ao deletar veículo:', err.message);
    }
  };

  const handleCancelAgendamento = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja cancelar esta aula?')) return;
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'cancelado' })
        .eq('id', id);

      if (error) throw error;
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelado' } : a));
    } catch (err: any) {
      console.error('Erro ao cancelar agendamento:', err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'realizado':
        return <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>Realizada</span>;
      case 'confirmado':
        return <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>Confirmada</span>;
      case 'cancelado':
        return <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--error-bg)', color: 'var(--error-text)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>Cancelada</span>;
      default:
        return <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#b45309', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>Pendente</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="spin" size={32} style={{ color: 'var(--primary)' }} />
        <p>Carregando painel do administrador...</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ textAlign: 'left' }}>
      
      {/* Navigation tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('geral')} 
          className={`btn ${activeTab === 'geral' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ height: '38px', borderRadius: 'var(--radius-sm)' }}
        >
          Visão Geral
        </button>
        <button 
          onClick={() => setActiveTab('agendamentos')} 
          className={`btn ${activeTab === 'agendamentos' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ height: '38px', borderRadius: 'var(--radius-sm)' }}
        >
          Monitor de Aulas
        </button>
        <button 
          onClick={() => setActiveTab('veiculos')} 
          className={`btn ${activeTab === 'veiculos' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ height: '38px', borderRadius: 'var(--radius-sm)' }}
        >
          Frota de Veículos
        </button>
        <button 
          onClick={() => setActiveTab('instrutores')} 
          className={`btn ${activeTab === 'instrutores' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ height: '38px', borderRadius: 'var(--radius-sm)' }}
        >
          Corpo de Instrutores
        </button>
        <button 
          onClick={loadAllData}
          className="btn btn-secondary"
          style={{ height: '38px', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          <RefreshCw size={14} />
          <span>Atualizar Tudo</span>
        </button>
      </div>

      {/* Tab: General overview metrics */}
      {activeTab === 'geral' && (
        <div className="fade-in">
          <div className="grid-cols-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>Total de Alunos</p>
                <h2 style={{ fontSize: '2.25rem', fontWeight: 700, margin: '0.25rem 0 0' }}>{metrics.totalAlunos}</h2>
              </div>
              <div style={{ backgroundColor: 'var(--primary-glow)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <Users size={24} style={{ color: 'var(--primary)' }} />
              </div>
            </div>

            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>Instrutores</p>
                <h2 style={{ fontSize: '2.25rem', fontWeight: 700, margin: '0.25rem 0 0' }}>{metrics.totalInstrutores}</h2>
              </div>
              <div style={{ backgroundColor: 'rgba(79, 70, 229, 0.15)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <Shield size={24} style={{ color: 'var(--primary)' }} />
              </div>
            </div>

            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>Aulas Hoje</p>
                <h2 style={{ fontSize: '2.25rem', fontWeight: 700, margin: '0.25rem 0 0' }}>{metrics.totalAulasHoje}</h2>
              </div>
              <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <Calendar size={24} style={{ color: 'var(--accent)' }} />
              </div>
            </div>

            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>Veículos Cadastrados</p>
                <h2 style={{ fontSize: '2.25rem', fontWeight: 700, margin: '0.25rem 0 0' }}>{metrics.totalVeiculos}</h2>
              </div>
              <div style={{ backgroundColor: 'var(--success-bg)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <Car size={24} style={{ color: 'var(--success)' }} />
              </div>
            </div>

          </div>

          {/* Quick status message */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Status da Operação</h4>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
              O sistema está operando normalmente. O webhook do WhatsApp está pronto para receber respostas de confirmação de agendamentos. Acesse a aba <strong>Monitor de Aulas</strong> para visualizar a grade completa e o status de confirmação enviado a cada aluno.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Agendamentos Monitor list */}
      {activeTab === 'agendamentos' && (
        <div className="card fade-in" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>Monitoramento Geral de Aulas</h4>
          
          {agendamentos.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Data/Hora</th>
                    <th style={{ padding: '0.75rem' }}>Aluno</th>
                    <th style={{ padding: '0.75rem' }}>Instrutor</th>
                    <th style={{ padding: '0.75rem' }}>Aula / Veículo</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem' }}>WhatsApp</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {agendamentos.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ fontWeight: 600, display: 'block' }}>{new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{item.hora_inicio.substring(0, 5)} - {item.hora_fim.substring(0, 5)}</span>
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                        {item.aluno ? item.aluno.nome_completo : 'Ex-aluno'}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {item.instrutor ? item.instrutor.nome_completo : 'Não informado'}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ display: 'block', fontWeight: 500 }}>{item.tipo_aula === 'teorica' ? 'Teórica' : item.tipo_aula === 'pratica_carro' ? 'Prática Carro' : 'Prática Moto'}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{item.veiculo ? `${item.veiculo.modelo} (${item.veiculo.placa})` : 'Sem veículo'}</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {getStatusBadge(item.status)}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem', fontWeight: 500 }}>
                        {
                          item.whatsapp_status === 'confirmado_aluno' ? <span style={{ color: 'var(--success)' }}>✅ Confirmado</span> :
                          item.whatsapp_status === 'recusado_aluno' ? <span style={{ color: 'var(--error)' }}>❌ Recusado</span> :
                          item.whatsapp_status === 'enviado' ? <span style={{ color: '#2563eb' }}>📤 Enviado</span> : <span style={{ color: 'var(--muted)' }}>⏳ Não enviado</span>
                        }
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {item.status !== 'cancelado' && item.status !== 'realizado' ? (
                          <button 
                            onClick={() => handleCancelAgendamento(item.id)}
                            className="btn btn-secondary" 
                            style={{ padding: '0.2rem 0.5rem', height: '28px', fontSize: '0.75rem', borderColor: 'var(--error-border)', color: 'var(--error-text)' }}
                          >
                            Cancelar
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Finalizado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--muted)' }}>Nenhum agendamento encontrado no sistema.</p>
          )}
        </div>
      )}

      {/* Tab: Vehicle Fleet Management (CRUD) */}
      {activeTab === 'veiculos' && (
        <div className="card fade-in" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h4 style={{ fontWeight: 600, margin: 0 }}>Frota Cadastrada</h4>
            <button 
              onClick={() => setShowVehicleModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', height: '36px' }}
            >
              <Plus size={16} />
              <span>Novo Veículo</span>
            </button>
          </div>

          {veiculos.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Modelo</th>
                    <th style={{ padding: '0.75rem' }}>Placa</th>
                    <th style={{ padding: '0.75rem' }}>Tipo</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {veiculos.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{v.modelo}</td>
                      <td style={{ padding: '0.75rem' }}>{v.placa}</td>
                      <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{v.tipo}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 600, backgroundColor: v.ativo ? 'var(--success-bg)' : 'rgba(255,255,255,0.05)', color: v.ativo ? 'var(--success-text)' : 'var(--muted)' }}>
                          {v.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        <button 
                          onClick={() => toggleVehicleActive(v.id, v.ativo)}
                          className="btn btn-secondary" 
                          style={{ padding: '0.2rem 0.5rem', height: '28px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          {v.ativo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          <span>{v.ativo ? 'Desativar' : 'Ativar'}</span>
                        </button>
                        <button 
                          onClick={() => handleDeleteVehicle(v.id)}
                          className="btn btn-secondary" 
                          style={{ padding: '0.2rem 0.5rem', height: '28px', fontSize: '0.75rem', borderColor: 'var(--error-border)', color: 'var(--error-text)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Trash2 size={12} />
                          <span>Excluir</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--muted)' }}>Nenhum veículo cadastrado na frota.</p>
          )}
        </div>
      )}

      {/* Tab: Instructors list */}
      {activeTab === 'instrutores' && (
        <div className="card fade-in" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>Instrutores da Autoescola</h4>
          
          {instrutores.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Nome Completo</th>
                    <th style={{ padding: '0.75rem' }}>Telefone</th>
                    <th style={{ padding: '0.75rem' }}>Cadastrado em</th>
                  </tr>
                </thead>
                <tbody>
                  {instrutores.map((i) => (
                    <tr key={i.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{i.nome_completo}</td>
                      <td style={{ padding: '0.75rem' }}>{i.telefone || 'N/A'}</td>
                      <td style={{ padding: '0.75rem' }}>{new Date(i.created_at).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--muted)' }}>Nenhum instrutor cadastrado no banco de dados.</p>
          )}
        </div>
      )}

      {/* Vehicle Creation Modal */}
      {showVehicleModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }} className="fade-in">
          <div className="card glass-card" style={{ maxWidth: '450px', width: '100%', padding: '2rem', position: 'relative' }}>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Cadastrar Novo Veículo</h3>

            {errorMsg && (
              <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
                <span>⚠️</span>
                <div>{errorMsg}</div>
              </div>
            )}

            <form onSubmit={handleAddVehicle}>
              <div className="form-group">
                <label className="form-label" htmlFor="modelName">Modelo do Veículo</label>
                <input 
                  id="modelName"
                  type="text" 
                  className="form-control" 
                  placeholder="Ex: Fiat Argo - Manual" 
                  value={newModelo}
                  onChange={(e) => setNewModelo(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="plateNumber">Placa do Veículo</label>
                <input 
                  id="plateNumber"
                  type="text" 
                  className="form-control" 
                  placeholder="Ex: ABC1D23" 
                  value={newPlaca}
                  onChange={(e) => setNewPlaca(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="vehicleType">Tipo de Categoria</label>
                <select 
                  id="vehicleType"
                  className="form-control"
                  value={newTipo}
                  onChange={(e) => setNewTipo(e.target.value as any)}
                >
                  <option value="carro">🚗 Carro</option>
                  <option value="moto">🏍️ Moto</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowVehicleModal(false)}
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
                  disabled={submitting}
                >
                  {submitting ? 'Cadastrando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
