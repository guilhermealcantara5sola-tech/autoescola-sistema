import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Mail, Lock, Phone, Calendar, UserPlus } from 'lucide-react';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [role, setRole] = useState<'aluno' | 'instrutor' | 'admin'>('aluno');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome_completo: fullName,
            tipo: role,
            telefone: phone,
            data_nascimento: birthDate,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err: any) {
      setError('Erro inesperado ao realizar cadastro. Tente novamente.');
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
          <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', fontWeight: 600 }}>Nova Conta</h2>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <span>✅</span>
              <div>Cadastro realizado com sucesso! Redirecionando para a tela de login...</div>
            </div>
          )}

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">
                Nome Completo
              </label>
              <div style={{ position: 'relative' }}>
                <User 
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
                  id="fullName"
                  type="text"
                  className="form-control"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

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
              <label className="form-label" htmlFor="password">
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock 
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
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label" htmlFor="phone">
                  Telefone (WhatsApp)
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone 
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
                    id="phone"
                    type="tel"
                    className="form-control"
                    placeholder="+5511999999999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="birthDate">
                  Data de Nascimento
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar 
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
                    id="birthDate"
                    type="date"
                    className="form-control"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="role">
                Tipo de Usuário
              </label>
              <select
                id="role"
                className="form-control"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                <option value="aluno">Aluno</option>
                <option value="instrutor">Instrutor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem', height: '45px' }}
              disabled={loading}
            >
              {loading ? (
                <span>Criando Conta...</span>
              ) : (
                <>
                  <UserPlus size={18} />
                  <span>Cadastrar Conta</span>
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
            <span>Já tem uma conta? </span>
            <Link to="/login" style={{ fontWeight: 600 }}>
              Faça login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
