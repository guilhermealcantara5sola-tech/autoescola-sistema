import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, ArrowLeft, Send, Lock } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);
  
  const navigate = useNavigate();

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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setSendingOtp(true);
    setError(null);
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
        setError(data.error || 'Erro ao enviar código. Verifique se digitou o número correto.');
        alert('Erro ao enviar código: ' + (data.error || 'Verifique se rodou a tabela otps no Supabase.'));
      }
    } catch (err: any) {
      setError('Erro de conexão ao enviar código.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !otpCode) return;
    setVerifyingOtp(true);
    setError(null);
    setOtpError(null);
    
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
        setOtpSuccess('Código verificado com sucesso! Crie sua nova senha abaixo.');
      } else {
        setOtpError(data.error || 'Código incorreto ou expirado.');
      }
    } catch (err: any) {
      setOtpError('Erro de conexão ao verificar código.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setResettingPassword(true);
    setError(null);

    try {
      const formattedPhone = formatBrazilianPhone(phone);
      const response = await fetch('/api/reset-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, code: otpCode, password: newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.error || 'Erro ao redefinir a senha.');
      }
    } catch (err: any) {
      setError('Erro de conexão ao redefinir senha.');
    } finally {
      setResettingPassword(false);
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
            Recupere o acesso à sua conta recebendo um código de segurança via WhatsApp.
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
              <div>Senha redefinida com sucesso! Redirecionando para login...</div>
            </div>
          )}

          {/* Passo 1: Digitar Telefone */}
          {!otpSent && !otpVerified && (
            <form onSubmit={handleSendOtp}>
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
                    placeholder="DDD e número (Ex: 3397054462)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem', height: '45px' }}
                disabled={sendingOtp || !phone}
              >
                {sendingOtp ? (
                  <span>Enviando código...</span>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Enviar Código por WhatsApp</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Passo 2: Confirmar Código OTP */}
          {otpSent && !otpVerified && (
            <form onSubmit={handleVerifyOtp}>
              <div className="form-group">
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', textAlign: 'center', marginBottom: '1rem' }}>
                  Enviamos um código de segurança de 6 dígitos para o WhatsApp <strong>{phone}</strong>.
                </p>
                <label className="form-label" htmlFor="otpCode">
                  Código de Confirmação
                </label>
                <input
                  id="otpCode"
                  type="text"
                  maxLength={6}
                  className="form-control"
                  placeholder="Ex: 123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem', fontWeight: 'bold' }}
                  required
                />
              </div>

              {otpError && <p style={{ color: 'var(--error)', fontSize: '0.8rem', margin: '0.5rem 0' }}>⚠️ {otpError}</p>}
              {otpSuccess && <p style={{ color: 'var(--success)', fontSize: '0.8rem', margin: '0.5rem 0' }}>✅ {otpSuccess}</p>}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem', height: '45px' }}
                disabled={verifyingOtp || otpCode.length < 6}
              >
                {verifyingOtp ? 'Confirmando...' : 'Confirmar Código'}
              </button>
              
              <button
                type="button"
                onClick={handleSendOtp}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '0.5rem', height: '40px', fontSize: '0.85rem' }}
                disabled={sendingOtp}
              >
                Reenviar Código
              </button>
            </form>
          )}

          {/* Passo 3: Criar Nova Senha */}
          {otpVerified && !success && (
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label" htmlFor="newPassword">
                  Nova Senha
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
                    id="newPassword"
                    type="password"
                    className="form-control"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">
                  Confirmar Nova Senha
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
                    id="confirmPassword"
                    type="password"
                    className="form-control"
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem', height: '45px' }}
                disabled={resettingPassword}
              >
                {resettingPassword ? 'Redefinindo...' : 'Alterar Senha'}
              </button>
            </form>
          )}

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
