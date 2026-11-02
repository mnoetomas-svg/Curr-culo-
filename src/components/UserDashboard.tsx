import React, { useCallback, useEffect, useState } from 'react';
import {
  Copy,
  Edit3,
  FilePlus2,
  LifeBuoy,
  LogOut,
  MessageCircle,
  Shield,
  Trash2,
  Unlock,
  User as UserIcon,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import type { PaymentRequest, ResumeDocument, ResumeTemplate, SupportTicket } from '../types';
import { buildWhatsappUnlockLink, formatCurrency, formatDateTime } from '../utils/format';
import { ScaledA4Preview } from './ResumeRenderer';

interface UserDashboardProps {
  onOpenResume: (doc: ResumeDocument) => void;
  onCreateNew: () => void;
  onSelectTemplate: (tpl: ResumeTemplate) => void;
  onGoToAdmin: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  onOpenResume,
  onCreateNew,
  onSelectTemplate,
  onGoToAdmin,
}) => {
  const {
    user,
    settings,
    texts,
    templates,
    unlockedTemplateIds,
    t,
    apiFetch,
    notify,
    logout,
    refreshBootstrap,
  } = usePlatform();

  const [tab, setTab] = useState<'resumes' | 'unlocked' | 'payments' | 'profile' | 'support'>(
    'resumes'
  );
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Profile form
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '');
  const [city, setCity] = useState(user?.city || '');
  const [country, setCountry] = useState(user?.country || 'Angola');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Support ticket form
  const [supSubject, setSupSubject] = useState('');
  const [supMessage, setSupMessage] = useState('');

  const loadWorkspace = useCallback(async () => {
    setLoadingData(true);
    try {
      const [resData, payData, supData] = await Promise.all([
        apiFetch<{ resumes: ResumeDocument[] }>('/api/resumes'),
        apiFetch<{ paymentRequests: PaymentRequest[] }>('/api/payment-requests/my'),
        apiFetch<{ tickets: SupportTicket[] }>('/api/support/my'),
      ]);
      setResumes(resData.resumes || []);
      setPayments(payData.paymentRequests || []);
      setTickets(supData.tickets || []);
    } catch (err: any) {
      notify(err.message || 'Erro ao carregar os dados da conta.', 'error');
    } finally {
      setLoadingData(false);
    }
  }, [apiFetch, notify]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const handleDuplicate = async (id: string) => {
    try {
      const res = await apiFetch<{ resume: ResumeDocument }>(`/api/resumes/${id}/duplicate`, {
        method: 'POST',
      });
      setResumes((prev) => [res.resume, ...prev]);
      notify('Currículo duplicado com sucesso.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDeleteResume = async (id: string) => {
    try {
      await apiFetch(`/api/resumes/${id}`, { method: 'DELETE' });
      setResumes((prev) => prev.filter((r) => r.id !== id));
      notify('Currículo eliminado.', 'info');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName, phone, whatsapp, city, country }),
      });
      await refreshBootstrap();
      notify('Perfil pessoal atualizado com sucesso.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ ticket: SupportTicket }>('/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: user?.fullName,
          email: user?.email,
          subject: supSubject,
          message: supMessage,
          type: 'support',
        }),
      });
      setTickets((prev) => [res.ticket, ...prev]);
      setSupSubject('');
      setSupMessage('');
      notify('Pedido de assistência enviado ao administrador.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const unlockedTemplates = templates.filter(
    (tpl) => tpl.tier === 'premium' && unlockedTemplateIds.includes(tpl.id)
  );

  return (
    <div className="bg-slate-50 min-h-[82vh] py-10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-200">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Conta Pessoal · {user?.email}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display-serif mt-1">
              {t('dashboard.title')}
            </h1>
            <p className="text-sm text-slate-600 mt-1">{t('dashboard.subtitle')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {user?.role === 'admin' && (
              <button
                type="button"
                onClick={onGoToAdmin}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-950 rounded-lg"
                style={{ backgroundColor: settings.accentColor || '#C59B27' }}
              >
                <Shield className="w-4 h-4" />
                <span>Painel Administrativo</span>
              </button>
            )}
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white rounded-lg"
              style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Novo Currículo</span>
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg mt-6 mb-8 overflow-x-auto w-fit max-w-full">
          {[
            { id: 'resumes', label: `Os Meus Currículos (${resumes.length})` },
            { id: 'unlocked', label: `Modelos Premium Adquiridos (${unlockedTemplates.length})` },
            { id: 'payments', label: `Pedidos de Desbloqueio (${payments.length})` },
            { id: 'profile', label: 'Perfil Pessoal' },
            { id: 'support', label: 'Suporte & Assistência' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as any)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 transition-colors ${
                tab === item.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loadingData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            {/* 1. MY RESUMES */}
            {tab === 'resumes' && (
              <div>
                {resumes.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                    <p className="text-sm text-slate-600">{t('dashboard.emptyResumes')}</p>
                    <button
                      type="button"
                      onClick={onCreateNew}
                      className="mt-4 px-5 py-2.5 text-xs font-semibold text-white rounded-lg"
                      style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                    >
                      Escolher modelo e criar currículo
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {resumes.map((doc) => {
                      const tpl =
                        templates.find((item) => item.id === doc.templateId) || templates[0];
                      return (
                        <div
                          key={doc.id}
                          className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
                        >
                          <div className="bg-slate-100 p-4 border-b border-slate-200">
                            <div className="rounded overflow-hidden border border-slate-200 bg-white">
                              <ScaledA4Preview
                                template={tpl}
                                data={doc.data}
                                texts={texts}
                                maxHeightPx={260}
                              />
                            </div>
                          </div>
                          <div className="p-5 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="text-xs text-slate-500">
                                {tpl?.name} · Atualizado em {formatDateTime(doc.updatedAt)}
                              </div>
                              <h3 className="text-base font-bold text-slate-900 mt-1">
                                {doc.title}
                              </h3>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => onOpenResume(doc)}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white rounded-lg"
                                style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Editar / PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicate(doc.id)}
                                className="p-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg"
                                title="Duplicar currículo"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteResume(doc.id)}
                                className="p-2 text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg"
                                title="Eliminar currículo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. UNLOCKED PREMIUM MODELS */}
            {tab === 'unlocked' && (
              <div>
                {unlockedTemplates.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                    <Unlock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">
                      Ainda não possui modelos Premium adquiridos. Explore a coleção executiva e
                      solicite o desbloqueio via WhatsApp.
                    </p>
                    <button
                      type="button"
                      onClick={onCreateNew}
                      className="mt-4 px-5 py-2.5 text-xs font-semibold text-slate-950 rounded-lg"
                      style={{ backgroundColor: settings.accentColor || '#C59B27' }}
                    >
                      Explorar modelos Premium
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {unlockedTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="text-xs font-semibold text-emerald-700">
                            Acesso Vitalício Desbloqueado · {tpl.category}
                          </div>
                          <h3 className="text-base font-bold text-slate-900 mt-1">{tpl.name}</h3>
                          <p className="text-xs text-slate-600 mt-1.5">{tpl.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectTemplate(tpl)}
                          className="mt-4 w-full py-2.5 text-xs font-semibold text-white rounded-lg"
                          style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                        >
                          Criar currículo com este modelo
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. PAYMENT / UNLOCK REQUESTS HISTORY */}
            {tab === 'payments' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {payments.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-600">
                    Não existem pedidos de desbloqueio registados na sua conta.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                          <th className="py-3 px-4">Modelo Premium</th>
                          <th className="py-3 px-4">Valor</th>
                          <th className="py-3 px-4">Estado</th>
                          <th className="py-3 px-4">Data</th>
                          <th className="py-3 px-4 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {payments.map((pay) => {
                          const waUrl = buildWhatsappUnlockLink(
                            settings.whatsappNumber,
                            settings.whatsappMessageTemplate,
                            pay.templateName,
                            user?.email
                          );
                          return (
                            <tr key={pay.id} className="hover:bg-slate-50/70">
                              <td className="py-3.5 px-4 font-semibold text-slate-900">
                                {pay.templateName}
                              </td>
                              <td className="py-3.5 px-4 font-data-mono tabular-nums">
                                {formatCurrency(pay.amount, pay.currency)}
                              </td>
                              <td className="py-3.5 px-4">
                                {pay.status === 'approved' ? (
                                  <span className="font-semibold text-emerald-700">
                                    Confirmado & Desbloqueado
                                  </span>
                                ) : pay.status === 'rejected' ? (
                                  <span className="font-semibold text-red-600">Rejeitado</span>
                                ) : (
                                  <span className="font-semibold text-amber-700">
                                    Aguarda Confirmação
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-slate-500 tabular-nums">
                                {formatDateTime(pay.createdAt)}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {pay.status === 'pending' && waUrl && (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 underline"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>Abrir WhatsApp</span>
                                  </a>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 4. PERSONAL PROFILE */}
            {tab === 'profile' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form
                  onSubmit={handleUpdateProfile}
                  className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                >
                  <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <UserIcon className="w-4 h-4" />
                    <span>Dados do Perfil</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Telefone
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        WhatsApp
                      </label>
                      <input
                        type="text"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        País
                      </label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-semibold text-white rounded-lg"
                    style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                  >
                    Guardar Alterações
                  </button>
                </form>

                <form
                  onSubmit={handleChangePassword}
                  className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 h-fit"
                >
                  <h3 className="text-base font-bold text-slate-900">Alterar Palavra-passe</h3>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Palavra-passe atual
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nova palavra-passe (mínimo 6 caracteres)
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
                    className="px-5 py-2.5 text-xs font-semibold text-white rounded-lg"
                    style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                  >
                    Atualizar Palavra-passe
                  </button>
                </form>
              </div>
            )}

            {/* 5. SUPPORT & ASSISTANCE */}
            {tab === 'support' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleSendSupport}
                  className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4 h-fit"
                >
                  <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <LifeBuoy className="w-4 h-4" />
                    <span>Solicitar Assistência</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Assunto
                    </label>
                    <input
                      type="text"
                      required
                      value={supSubject}
                      onChange={(e) => setSupSubject(e.target.value)}
                      placeholder="Ex: Ajuda com pagamento ou edição de CV"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Descrição detalhada
                    </label>
                    <textarea
                      rows={4}
                      required
                      minLength={5}
                      value={supMessage}
                      onChange={(e) => setSupMessage(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-semibold text-white rounded-lg"
                    style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                  >
                    Enviar Pedido
                  </button>
                </form>

                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="text-base font-bold text-slate-900 mb-4">
                    Histórico de Atendimento
                  </h3>
                  {tickets.length === 0 ? (
                    <p className="text-xs text-slate-500">Nenhum pedido de suporte submetido.</p>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map((tk) => (
                        <div key={tk.id} className="p-4 rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="font-semibold text-slate-900">{tk.subject}</span>
                            <span>
                              {tk.status === 'resolved' ? 'Resolvido' : 'Em análise'} ·{' '}
                              {formatDateTime(tk.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 mt-1.5">{tk.message}</p>
                          {tk.adminReply && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-xs text-emerald-900 bg-emerald-50/70 p-2.5 rounded">
                              <strong>Resposta da Administração:</strong> {tk.adminReply}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
