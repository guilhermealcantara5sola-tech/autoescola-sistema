import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, ArrowLeft, Send } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError('Erro ao enviar e-mail de recuperação. Tente novamente.');
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
        </div>

        <div className="card glass-card fade-in">
          <h2 style={{ marginBottom: '1rem', textAlign: 'center', fontWeight: 600 }}>Recuperar Senha</h2>
          <p style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            Insira seu e-mail para receber um link de redefinição de senha.
          </p>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <span>✅</span>
              <div>E-mail de recuperação enviado! Verifique sua caixa de entrada.</div>
            </div>
          )}

          <form onSubmit={handleReset}>
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

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem', height: '45px' }}
              disabled={loading}
            >
              {loading ? (
                <span>Enviando...</span>
              ) : (
                <>
                  <Send size={18} />
                  <span>Enviar E-mail</span>
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
              <ArrowLeft size={16} />
              <span>Voltar para o login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
