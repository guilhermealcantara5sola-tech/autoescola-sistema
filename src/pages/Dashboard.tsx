import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';
import { AlunoDashboard } from '../components/AlunoDashboard';
import { InstrutorDashboard } from '../components/InstrutorDashboard';
import { AdminDashboard } from '../components/AdminDashboard';

export const Dashboard: React.FC = () => {
  const { user, profile, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Erro ao sair da conta:', err);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const renderDashboardContent = () => {
    if (!user || !profile) return null;
    
    const role = profile.tipo || 'aluno';

    switch (role) {
      case 'admin':
        return <AdminDashboard user={user} profile={profile} />;
      case 'instrutor':
        return <InstrutorDashboard user={user} profile={profile} />;
      case 'aluno':
      default:
        return <AlunoDashboard user={user} profile={profile} />;
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
