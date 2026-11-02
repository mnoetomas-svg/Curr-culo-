import React, { useState } from 'react';
import { X } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

interface AuthModalProps {
  open: boolean;
  initialMode?: 'login' | 'register' | 'recover';
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  initialMode = 'login',
  onClose,
  onSuccess,
}) => {
  const { settings, t, apiFetch, setAuthSession, notify } = usePlatform();
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setMode(initialMode);
    setGeneratedCode('');
  }, [initialMode, open]);

  if (!open) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuthSession(res.token, res.user, res.unlockedTemplateIds);
      notify(t('auth.welcomeSuccess'), 'success');
      onClose();
      onSuccess?.();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password }),
      });
      setAuthSession(res.token, res.user, res.unlockedTemplateIds);
      notify(t('auth.registerSuccess'), 'success');
      onClose();
      onSuccess?.();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/request-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setGeneratedCode(res.recoveryCode || '');
      setRecoveryCode(res.recoveryCode || '');
      notify(res.message, 'info');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code: recoveryCode, newPassword }),
      });
      notify(res.message, 'success');
      setGeneratedCode('');
      setMode('login');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold font-display-serif text-slate-900">
              {mode === 'login'
                ? t('auth.loginTitle')
                : mode === 'register'
                ? t('auth.registerTitle')
                : t('auth.recoverTitle')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'login'
                ? t('auth.loginSubtitle')
                : mode === 'register'
                ? t('auth.registerSubtitle')
                : t('auth.recoverSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.ao"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Palavra-passe</label>
                  <button
                    type="button"
                    onClick={() => setMode('recover')}
                    className="text-xs font-medium text-slate-600 hover:text-slate-950 underline"
                  >
                    Esqueceu a palavra-passe?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg hover:opacity-95 disabled:opacity-50"
                style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
              >
                {loading ? 'A entrar...' : 'Iniciar Sessão'}
              </button>

              {settings.allowRegistration && (
                <p className="text-center text-xs text-slate-600 pt-2">
                  Ainda não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="font-semibold text-slate-950 underline"
                  >
                    Criar conta gratuita
                  </button>
                </p>
              )}
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome completo
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: João Baptista Manuel"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.ao"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Palavra-passe (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg hover:opacity-95 disabled:opacity-50"
                style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
              >
                {loading ? 'A registar...' : 'Criar Conta'}
              </button>
              <p className="text-center text-xs text-slate-600 pt-2">
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-semibold text-slate-950 underline"
                >
                  Iniciar Sessão
                </button>
              </p>
            </form>
          )}

          {mode === 'recover' && (
            <div className="space-y-4">
              {!generatedCode ? (
                <form onSubmit={handleRequestRecovery} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail da conta
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@exemplo.ao"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg"
                    style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                  >
                    {loading ? 'A verificar...' : 'Gerar código de redefinição'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmRecovery} className="space-y-4">
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950">
                    Código de verificação validado para esta sessão:{' '}
                    <strong className="font-data-mono">{generatedCode}</strong>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Código de 6 dígitos
                    </label>
                    <input
                      type="text"
                      required
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-data-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nova palavra-passe
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg"
                    style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                  >
                    Guardar nova palavra-passe
                  </button>
                </form>
              )}

              <p className="text-center text-xs text-slate-600 pt-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-semibold text-slate-950 underline"
                >
                  Voltar ao início de sessão
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
