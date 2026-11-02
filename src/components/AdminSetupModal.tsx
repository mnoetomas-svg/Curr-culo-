import React, { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

interface AdminSetupModalProps {
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

export const AdminSetupModal: React.FC<AdminSetupModalProps> = ({ open, onClose, onCompleted }) => {
  const { settings, apiFetch, setAuthSession, notify } = usePlatform();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/auth/setup-admin', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          password,
          whatsappNumber,
        }),
      });
      setAuthSession(res.token, res.user, []);
      notify('Administrador Principal configurado com sucesso! Acesso total ativado.', 'success');
      onCompleted();
    } catch (err: any) {
      notify(err.message || 'Erro ao configurar administrador.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
        <div
          className="px-6 py-5 text-white flex items-center justify-between"
          style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: settings.accentColor || '#C59B27' }}
            >
              <ShieldCheck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display-serif text-white">
                Configuração Segura do Administrador Principal
              </h3>
              <p className="text-xs text-slate-300">
                Processo único de inicialização — bloqueado automaticamente após criação
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Defina as credenciais exclusivas do proprietário da plataforma e o número oficial de
            WhatsApp que receberá os pedidos de pagamento dos modelos Premium. Nenhuma credencial é
            exposta no código público.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Administrador Principal
            </label>
            <input
              type="text"
              required
              minLength={3}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome completo"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              E-mail Administrativo
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@seudominio.ao"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Palavra-passe Forte (mínimo 8 caracteres)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Número Oficial de WhatsApp para Pagamentos (com indicativo do país)
            </label>
            <input
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="Ex: 244923000000"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 font-data-mono"
            />
            <span className="text-[11px] text-slate-500">
              Pode alterar este número a qualquer momento em Configurações Gerais.
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-semibold text-slate-950 rounded-lg disabled:opacity-50"
              style={{ backgroundColor: settings.accentColor || '#C59B27' }}
            >
              {submitting ? 'A ativar controlo total...' : 'Criar Administrador Principal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
