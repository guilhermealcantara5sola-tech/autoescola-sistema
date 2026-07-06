import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  LogOut, 
  User as UserIcon, 
  Calendar as CalendarIcon, 
  Car, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Erro ao sair da conta:', err);
    }
  };

  // Saudação de acordo com o horário do dia
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Renderizar conteúdo do Dashboard dependendo do tipo de perfil
  const renderDashboardContent = () => {
    const role = profile?.tipo || 'aluno';

    switch (role) {
      case 'admin':
        return (
          <div className="fade-in">
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Painel de Controle do Administrador</h3>
            <div className="grid-cols-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>Total de Alunos</p>
                    <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0' }}>48</h2>
                  </div>
                  <div style={{ backgroundColor: 'var(--primary-glow)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                    <Users size={24} style={{ color: 'var(--primary)' }} />
                  </div>
                </div>
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>Aulas Hoje</p>
                    <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0' }}>12</h2>
                  </div>
                  <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                    <Clock size={24} style={{ color: 'var(--accent)' }} />
                  </div>
                </div>
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>Confirmadas (WhatsApp)</p>
                    <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0' }}>90%</h2>
                  </div>
                  <div style={{ backgroundColor: 'var(--success-bg)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                    <CheckCircle size={24} style={{ color: 'var(--success)' }} />
                  </div>
                </div>
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>Frota Ativa</p>
                    <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0' }}>4</h2>
                  </div>
                  <div style={{ backgroundColor: 'rgba(79, 70, 229, 0.15)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                    <Car size={24} style={{ color: 'var(--primary)' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Atividades Recentes</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ color: 'var(--foreground)', fontWeight: 500, fontSize: '0.9rem' }}>João Silva confirmou a aula prática</p>
                      <p style={{ fontSize: '0.75rem' }}>Amanhã às 14:00 • Placa: ABC-1234</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>WhatsApp</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <AlertCircle size={18} style={{ color: 'var(--error)' }} />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ color: 'var(--foreground)', fontWeight: 500, fontSize: '0.9rem' }}>Maria Oliveira cancelou a aula prática</p>
                      <p style={{ fontSize: '0.75rem' }}>Amanhã às 09:30 • Placa: XYZ-5678</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--error-bg)', color: 'var(--error-text)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>WhatsApp</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'instrutor':
        return (
          <div className="fade-in">
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Minha Agenda de Aulas</h3>
            <div className="grid-cols-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <h4 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <CalendarIcon size={20} style={{ color: 'var(--primary)' }} />
                  <span>Aulas de Amanhã</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>08:00 - 09:00</span>
                      <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>Confirmada</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--foreground)' }}>Aluno: Carlos Eduardo</p>
                    <p style={{ fontSize: '0.8rem' }}>Veículo: Hyundai HB20 (XYZ-5678)</p>
                  </div>
                  <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>10:30 - 11:30</span>
                      <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#b45309', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>Pendente</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--foreground)' }}>Aluna: Amanda Souza</p>
                    <p style={{ fontSize: '0.8rem' }}>Veículo: Honda CG 160 (MNO-9012)</p>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem' }}>
                <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Resumo de Horários</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
                  <p style={{ fontSize: '0.9rem' }}>🚗 <strong>Aulas de Carro esta semana:</strong> 18 horas</p>
                  <p style={{ fontSize: '0.9rem' }}>🏍️ <strong>Aulas de Moto esta semana:</strong> 6 horas</p>
                  <p style={{ fontSize: '0.9rem' }}>📈 <strong>Avaliação dos Alunos:</strong> ⭐ 4.9 (24 avaliações)</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'aluno':
      default:
        return (
          <div className="fade-in">
            <div className="grid-cols-2" style={{ gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'left' }}>
                  <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Próxima Aula Agendada</h4>
                  <div style={{ padding: '1.25rem', backgroundColor: 'var(--muted-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ backgroundColor: 'var(--primary-glow)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                      <Car size={32} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', color: 'var(--foreground)', fontWeight: 600 }}>Aula Prática de Carro</h3>
                      <p style={{ fontSize: '0.9rem' }}>Terça-feira, 7 de Julho • 14:00 - 15:00</p>
                      <p style={{ fontSize: '0.85rem' }}>Instrutor: Roberto Nunes • Veículo: Chevrolet Onix (ABC-1234)</p>
                    </div>
                  </div>

                  <h4 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 600 }}>Aulas Recentes Concluídas</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--foreground)', margin: 0 }}>Aula Prática - Carro</p>
                        <p style={{ fontSize: '0.8rem', margin: 0 }}>03/07/2026 • Roberto Nunes</p>
                      </div>
                      <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>Realizada</span>
                    </div>
                    <div style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--foreground)', margin: 0 }}>Aula Prática - Carro</p>
                        <p style={{ fontSize: '0.8rem', margin: 0 }}>30/06/2026 • Roberto Nunes</p>
                      </div>
                      <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>Realizada</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }}>Agendar Nova Aula</button>
                  <button className="btn btn-secondary" style={{ flex: 1 }}>Ver Grade Horária</button>
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem', textAlign: 'left' }}>
                <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Meu Progresso</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      <span>Aulas Práticas Realizadas</span>
                      <strong style={{ color: 'var(--foreground)' }}>8 de 20</strong>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '40%', height: '100%', backgroundColor: 'var(--primary)' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      <span>Presença em Aulas Teóricas</span>
                      <strong style={{ color: 'var(--foreground)' }}>100%</strong>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--success)' }}></div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', padding: '0.75rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.5rem', fontSize: '0.85rem', border: '1px solid var(--success-border)' }}>
                    <span>💡</span>
                    <span><strong>Dica:</strong> Fique atento ao WhatsApp na véspera da sua aula para confirmar seu horário.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <header className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.25rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🚗</span>
          <span style={{ fontFamily: 'var(--font-heading)' }}>AutoEscola Connect</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 600 }}>
              <UserIcon size={16} style={{ margin: 'auto' }} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.2 }}>
                {profile?.nome_completo || 'Usuário'}
              </p>
              <p style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                {profile?.tipo || 'Aluno'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout} 
            className="btn btn-secondary" 
            style={{ padding: '0.5rem 1rem', height: '38px', gap: '0.25rem' }}
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 1.5rem', flex: 1 }}>
        <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
            {getGreeting()}, {profile?.nome_completo?.split(' ')[0] || 'Visitante'}!
          </h1>
          <p style={{ fontSize: '0.95rem' }}>Aqui está o resumo de suas atividades na autoescola.</p>
        </div>

        {renderDashboardContent()}
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '1.5rem 0', marginTop: 'auto', fontSize: '0.85rem', color: 'var(--muted)' }}>
        <div className="container">
          <p>© {new Date().getFullYear()} AutoEscola Connect. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};
