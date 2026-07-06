import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Send, Lock } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(''); // Retrieved from backend, hidden
  const [maskedPhone, setMaskedPhone] = useState(''); // Retrieved from backend, shown
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSendingOtp(true);
    setError(null);
    setOtpError(null);
    setOtpSuccess(null);
    
    try {
      const response = await fetch('/api/send-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        setPhone(data.phone);
        setMaskedPhone(data.maskedPhone);
        setOtpSent(true);
        setOtpSuccess('Código de segurança enviado ao seu WhatsApp!');
      } else {
        setError(data.error || 'Erro ao processar solicitação de recuperação.');
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
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode }),
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
      const response = await fetch('/api/reset-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode, password: newPassword }),
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

          {/* Passo 1: Digitar Email */}
          {!otpSent && !otpVerified && (
            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Seu E-mail Cadastrado
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
                disabled={sendingOtp || !email}
              >
                {sendingOtp ? (
                  <span>Buscando conta...</span>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Recuperar via WhatsApp</span>
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
                  Enviamos um código de segurança de 6 dígitos para o WhatsApp cadastrado:<br/>
                  <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>{maskedPhone}</strong>
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
