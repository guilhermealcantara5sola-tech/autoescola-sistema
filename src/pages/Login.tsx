import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { KeyRound, Mail, LogIn } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message === 'Invalid login credentials' 
          ? 'E-mail ou senha incorretos.' 
          : authError.message);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError('Ocorreu um erro ao realizar login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div className="auth-logo">
            <span>🚗 AutoEscola Connect</span>
          </div>
          <p style={{ fontSize: '0.95rem' }}>Agendamento e controle de aulas na palma da mão</p>
        </div>

        <div className="card glass-card fade-in">
          <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', fontWeight: 600 }}>Entrar na Conta</h2>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                E-mail
              </label>
              <div style={{ position: 'relative' }}>
                <Mail 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--muted)' 
                  }} 
                />
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="password">
                  Senha
                </label>
                <Link to="/forgot-password" style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                  Esqueceu a senha?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <KeyRound 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--muted)' 
                  }} 
                />
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem', height: '45px' }}
              disabled={loading}
            >
              {loading ? (
                <span>Acessando...</span>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Acessar Portal</span>
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
            <span>Novo por aqui? </span>
            <Link to="/register" style={{ fontWeight: 600 }}>
              Crie uma conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
