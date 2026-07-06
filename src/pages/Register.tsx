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

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState('');

  const formatBrazilianPhone = (p: string) => {
    let clean = p.replace(/\D/g, '');
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
  };

  const handleSendOtp = async () => {
    if (!phone) return;
    setSendingOtp(true);
    setOtpError(null);
    setOtpSuccess(null);
    try {
      const formattedPhone = formatBrazilianPhone(phone);
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      });
      const data = await response.json();
      if (response.ok) {
        setOtpSent(true);
        setOtpSuccess('Código enviado para o seu WhatsApp!');
      } else {
        setOtpError(data.error || 'Erro ao enviar código.');
        alert('Erro ao enviar código: ' + (data.error || 'Verifique se rodou a tabela no Supabase.'));
      }
    } catch (err: any) {
      setOtpError('Erro de conexão ao enviar código.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!phone || !otpCode) return;
    setVerifyingOtp(true);
    setOtpError(null);
    setOtpSuccess(null);
    try {
      const formattedPhone = formatBrazilianPhone(phone);
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, code: otpCode }),
      });
      const data = await response.json();
      if (response.ok && data.verified) {
        setOtpVerified(true);
        setOtpSuccess('WhatsApp verificado com sucesso!');
      } else {
        setOtpError(data.error || 'Código incorreto ou expirado.');
      }
    } catch (err: any) {
      setOtpError('Erro de conexão ao verificar código.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpVerified) {
      setError('Por favor, confirme seu número de telefone via código do WhatsApp antes de realizar o cadastro.');
      return;
    }

    if ((role === 'instrutor' || role === 'admin') && authCode !== 'AUTO2026') {
      setError('Código de autorização administrativa incorreto.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formattedPhone = formatBrazilianPhone(phone);
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome_completo: fullName,
            tipo: role,
            telefone: formattedPhone,
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

            {(role === 'instrutor' || role === 'admin') && (
              <div className="form-group fade-in" style={{
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}>
                <label className="form-label" htmlFor="authCode" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  Código de Autorização Administrativa
                </label>
                <input
                  id="authCode"
                  type="password"
                  className="form-control"
                  placeholder="Digite a senha de liberação (Ex: AUTO2026)"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="phone">
                Telefone (WhatsApp)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
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
                    placeholder="DDD e número (Ex: 3397054462)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={otpVerified || sendingOtp}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
                {!otpVerified && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || !phone}
                    className="btn btn-secondary"
                    style={{ height: '42px', padding: '0 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                  >
                    {sendingOtp ? 'Enviando...' : otpSent ? 'Reenviar' : 'Enviar Código'}
                  </button>
                )}
                {otpVerified && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--success)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    gap: '0.25rem',
                    padding: '0 0.5rem'
                  }}>
                    ✅ Verificado
                  </span>
                )}
              </div>
            </div>

            {otpSent && !otpVerified && (
              <div className="form-group fade-in" style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                padding: '1rem', 
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border)',
                marginBottom: '1rem'
              }}>
                <label className="form-label" htmlFor="otpCode" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  Insira o código enviado ao seu WhatsApp:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id="otpCode"
                    type="text"
                    maxLength={6}
                    className="form-control"
                    placeholder="Código de 6 dígitos"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.1rem', fontWeight: 'bold' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={verifyingOtp || otpCode.length < 6}
                    className="btn btn-primary"
                    style={{ height: '42px', padding: '0 1.5rem' }}
                  >
                    {verifyingOtp ? 'Verificando...' : 'Confirmar'}
                  </button>
                </div>
                {otpError && <p style={{ color: 'var(--error)', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>⚠️ {otpError}</p>}
                {otpSuccess && <p style={{ color: 'var(--success)', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>✅ {otpSuccess}</p>}
              </div>
            )}

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
