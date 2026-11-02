import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  CreditCard,
  Download,
  Edit3,
  Eye,
  FileText,
  FolderKanban,
  Home,
  LayoutDashboard,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  Trash2,
  Type,
  Unlock,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import type {
  AuditLog,
  PaymentRequest,
  Promotion,
  ResumeDocument,
  ResumeTemplate,
  SiteSettings,
  SupportTicket,
  TemplateLayoutType,
  TemplateUnlock,
  User,
} from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';
import { ScaledA4Preview } from './ResumeRenderer';

type AdminSection =
  | 'overview'
  | 'users'
  | 'templates'
  | 'finance'
  | 'resumes'
  | 'texts'
  | 'settings'
  | 'maintenance';

interface AdminUserRow extends User {
  resumeCount: number;
  unlockedTemplateIds: string[];
}

interface EnrichedResume extends ResumeDocument {
  ownerEmail: string;
  ownerName: string;
  templateName: string;
}

const LAYOUT_OPTIONS: { id: TemplateLayoutType; label: string }[] = [
  { id: 'executive-imperial', label: 'Executivo Imperial (Cabeçalho Escuro & Dourado + 2 Colunas)' },
  { id: 'sidebar-left', label: 'Duas Colunas — Barra Lateral Esquerda' },
  { id: 'sidebar-right', label: 'Duas Colunas — Barra Lateral Direita' },
  { id: 'corporate-split', label: 'Corporativo Sofisticado Dividido' },
  { id: 'graphic-modern', label: 'Moderno com Elementos Gráficos & Barras' },
  { id: 'international-grid', label: 'Grelha Internacional Técnica' },
  { id: 'classic-serif', label: 'Clássico Institucional (1 Coluna)' },
  { id: 'modern-clean', label: 'Moderno Limpo (1 Coluna)' },
  { id: 'minimal-editorial', label: 'Minimalista Editorial (1 Coluna)' },
  { id: 'academic-formal', label: 'Académico / Administrativo Formal' },
];

interface AdminDashboardProps {
  onExitAdmin: () => void;
  onNavigate?: (view: 'home' | 'templates' | 'dashboard') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExitAdmin, onNavigate }) => {
  const {
    settings,
    texts,
    textCatalog,
    templates,
    apiFetch,
    notify,
    refreshBootstrap,
    updateLocalSettings,
    updateLocalTexts,
    logout,
  } = usePlatform();

  const [section, setSection] = useState<AdminSection>('overview');

  // Overview state
  const [stats, setStats] = useState<any>(null);
  const [topTemplates, setTopTemplates] = useState<ResumeTemplate[]>([]);
  const [recentAudit, setRecentAudit] = useState<AuditLog[]>([]);

  // Users state
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserForUnlock, setSelectedUserForUnlock] = useState<AdminUserRow | null>(null);
  const [grantTemplateId, setGrantTemplateId] = useState('');

  // Templates state
  const [adminTemplates, setAdminTemplates] = useState<ResumeTemplate[]>(templates);
  const [editingTpl, setEditingTpl] = useState<Partial<ResumeTemplate> | null>(null);
  const [tplSearch, setTplSearch] = useState('');
  const [newCatInput, setNewCatInput] = useState('');
  const [newCatTier, setNewCatTier] = useState<'free' | 'premium'>('premium');

  // Finance state
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [unlocks, setUnlocks] = useState<TemplateUnlock[]>([]);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'all'
  );
  const [manualPayEmail, setManualPayEmail] = useState('');
  const [manualPayTplId, setManualPayTplId] = useState('');
  const [manualPayAmount, setManualPayAmount] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoTitle, setPromoTitle] = useState('');
  const [promoPercent, setPromoPercent] = useState('20');

  // Resumes & Support state
  const [allResumes, setAllResumes] = useState<EnrichedResume[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [inspectingResume, setInspectingResume] = useState<EnrichedResume | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // Global Text Editor state
  const [textDrafts, setTextDrafts] = useState<Record<string, string>>(texts);
  const [textSearch, setTextSearch] = useState('');
  const [textSectionFilter, setTextSectionFilter] = useState('all');
  const [savingTexts, setSavingTexts] = useState(false);

  // Settings & Maintenance state
  const [settingsForm, setSettingsForm] = useState<SiteSettings>(settings);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    setTextDrafts(texts);
  }, [texts]);

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  const loadSectionData = useCallback(
    async (sec: AdminSection) => {
      try {
        if (sec === 'overview') {
          const res = await apiFetch('/api/admin/overview');
          setStats(res.stats);
          setTopTemplates(res.topTemplates || []);
          setRecentAudit(res.recentAudit || []);
        } else if (sec === 'users') {
          const res = await apiFetch('/api/admin/users');
          setUsers(res.users || []);
        } else if (sec === 'templates') {
          const res = await apiFetch('/api/admin/templates');
          setAdminTemplates(res.templates || []);
        } else if (sec === 'finance') {
          const [payRes, usrRes] = await Promise.all([
            apiFetch('/api/admin/payments'),
            apiFetch('/api/admin/users'),
          ]);
          setPayments(payRes.paymentRequests || []);
          setUnlocks(payRes.unlocks || []);
          setPromos(payRes.promotions || []);
          setUsers(usrRes.users || []);
        } else if (sec === 'resumes') {
          const res = await apiFetch('/api/admin/resumes');
          setAllResumes(res.resumes || []);
          setSupportTickets(res.supportTickets || []);
        } else if (sec === 'maintenance') {
          const res = await apiFetch('/api/admin/audit-logs');
          setAuditLogs(res.auditLogs || []);
        }
      } catch (err: any) {
        notify(err.message || 'Erro ao carregar dados administrativos.', 'error');
      }
    },
    [apiFetch, notify]
  );

  useEffect(() => {
    loadSectionData(section);
  }, [section, loadSectionData]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleToggleUserStatus = async (u: AdminUserRow) => {
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    try {
      await apiFetch(`/api/admin/users/${u.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      notify(
        nextStatus === 'suspended' ? 'Conta suspensa.' : 'Conta reativada com sucesso.',
        'success'
      );
      loadSectionData('users');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDeleteUser = async (u: AdminUserRow) => {
    try {
      await apiFetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      notify(`Utilizador ${u.email} eliminado.`, 'info');
      loadSectionData('users');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleGrantManualUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForUnlock || !grantTemplateId) return;
    try {
      await apiFetch(`/api/admin/users/${selectedUserForUnlock.id}/unlock`, {
        method: 'POST',
        body: JSON.stringify({ templateId: grantTemplateId }),
      });
      notify('Modelo Premium desbloqueado manualmente para o utilizador!', 'success');
      setGrantTemplateId('');
      const res = await apiFetch('/api/admin/users');
      setUsers(res.users || []);
      const updated = (res.users || []).find((x: AdminUserRow) => x.id === selectedUserForUnlock.id);
      setSelectedUserForUnlock(updated || null);
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleRevokeUserUnlock = async (userId: string, templateId: string) => {
    try {
      await apiFetch(`/api/admin/users/${userId}/unlock/${templateId}`, {
        method: 'DELETE',
      });
      notify('Acesso ao modelo revogado.', 'info');
      const res = await apiFetch('/api/admin/users');
      setUsers(res.users || []);
      if (selectedUserForUnlock?.id === userId) {
        const updated = (res.users || []).find((x: AdminUserRow) => x.id === userId);
        setSelectedUserForUnlock(updated || null);
      }
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  // Templates handlers
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTpl?.name) return;
    try {
      if (editingTpl.id) {
        await apiFetch(`/api/admin/templates/${editingTpl.id}`, {
          method: 'PUT',
          body: JSON.stringify(editingTpl),
        });
        notify('Modelo atualizado com sucesso.', 'success');
      } else {
        await apiFetch('/api/admin/templates', {
          method: 'POST',
          body: JSON.stringify(editingTpl),
        });
        notify('Novo modelo criado e adicionado à biblioteca!', 'success');
      }
      setEditingTpl(null);
      await loadSectionData('templates');
      await refreshBootstrap();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDuplicateTemplate = async (id: string) => {
    try {
      await apiFetch(`/api/admin/templates/${id}/duplicate`, { method: 'POST' });
      notify('Modelo duplicado com sucesso.', 'success');
      await loadSectionData('templates');
      await refreshBootstrap();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleToggleTemplateActive = async (tpl: ResumeTemplate) => {
    try {
      await apiFetch(`/api/admin/templates/${tpl.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !tpl.active }),
      });
      notify(tpl.active ? 'Modelo desativado.' : 'Modelo ativado.', 'info');
      await loadSectionData('templates');
      await refreshBootstrap();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await apiFetch(`/api/admin/templates/${id}`, { method: 'DELETE' });
      notify('Modelo removido.', 'info');
      await loadSectionData('templates');
      await refreshBootstrap();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCatInput.trim();
    if (!clean) return;
    const nextSettings: SiteSettings = {
      ...settingsForm,
      categoriesFree:
        newCatTier === 'free' && !settingsForm.categoriesFree.includes(clean)
          ? [...settingsForm.categoriesFree, clean]
          : settingsForm.categoriesFree,
      categoriesPremium:
        newCatTier === 'premium' && !settingsForm.categoriesPremium.includes(clean)
          ? [...settingsForm.categoriesPremium, clean]
          : settingsForm.categoriesPremium,
    };
    try {
      const res = await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(nextSettings),
      });
      updateLocalSettings(res.settings);
      setSettingsForm(res.settings);
      setNewCatInput('');
      notify('Nova categoria adicionada com sucesso.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  // Payments & Unlocks handlers
  const handleApprovePayment = async (id: string) => {
    try {
      await apiFetch(`/api/admin/payments/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ adminNotes: 'Pagamento verificado e aprovado.' }),
      });
      notify('Pagamento confirmado! Modelo Premium desbloqueado para o utilizador.', 'success');
      loadSectionData('finance');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleRejectPayment = async (id: string) => {
    try {
      await apiFetch(`/api/admin/payments/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ adminNotes: 'Pagamento não confirmado.' }),
      });
      notify('Pedido rejeitado.', 'info');
      loadSectionData('finance');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleRegisterManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/payments/manual', {
        method: 'POST',
        body: JSON.stringify({
          userEmail: manualPayEmail,
          templateId: manualPayTplId,
          amount: manualPayAmount ? Number(manualPayAmount) : undefined,
        }),
      });
      setManualPayEmail('');
      setManualPayTplId('');
      setManualPayAmount('');
      notify('Pagamento registado e modelo desbloqueado!', 'success');
      loadSectionData('finance');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleToggleUnlockRecord = async (unlockId: string) => {
    try {
      await apiFetch(`/api/admin/unlocks/${unlockId}/revoke`, { method: 'POST' });
      notify('Estado do acesso atualizado.', 'info');
      loadSectionData('finance');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/promotions', {
        method: 'POST',
        body: JSON.stringify({
          code: promoCode,
          title: promoTitle,
          discountPercent: Number(promoPercent),
          appliesToTemplateId: 'all',
        }),
      });
      setPromoCode('');
      setPromoTitle('');
      notify('Promoção criada com sucesso.', 'success');
      await loadSectionData('finance');
      await refreshBootstrap();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDeletePromo = async (id: string) => {
    try {
      await apiFetch(`/api/admin/promotions/${id}`, { method: 'DELETE' });
      notify('Promoção eliminada.', 'info');
      await loadSectionData('finance');
      await refreshBootstrap();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  // Global Texts Save
  const handleSaveAllTexts = async () => {
    setSavingTexts(true);
    try {
      const res = await apiFetch('/api/admin/texts', {
        method: 'PUT',
        body: JSON.stringify({ updates: textDrafts }),
      });
      updateLocalTexts(res.texts);
      notify(
        'Todos os textos foram guardados e atualizados imediatamente em toda a plataforma!',
        'success'
      );
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSavingTexts(false);
    }
  };

  const handleResetSingleText = async (key: string) => {
    try {
      const res = await apiFetch('/api/admin/texts/reset', {
        method: 'POST',
        body: JSON.stringify({ key }),
      });
      updateLocalTexts(res.texts);
      setTextDrafts(res.texts);
      notify('Texto reposto para o valor padrão.', 'info');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  // Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsForm),
      });
      updateLocalSettings(res.settings);
      notify('Configurações institucionais guardadas e aplicadas!', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  // Backup Download & Restore
  const handleDownloadBackup = async () => {
    try {
      const data = await apiFetch('/api/admin/backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${settings.platformName.toLowerCase()}_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify('Cópia de segurança transferida com sucesso.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await apiFetch('/api/admin/restore', {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      await refreshBootstrap();
      notify('Cópia de segurança restaurada com sucesso!', 'success');
    } catch (err: any) {
      notify(err.message || 'Ficheiro de cópia inválido.', 'error');
    }
  };

  // Filtered lists
  const textSections = useMemo(
    () => Array.from(new Set(textCatalog.map((item) => item.section))),
    [textCatalog]
  );

  const filteredTextEntries = useMemo(() => {
    const q = textSearch.trim().toLowerCase();
    return textCatalog.filter((entry) => {
      if (textSectionFilter !== 'all' && entry.section !== textSectionFilter) return false;
      if (q) {
        const currentVal = textDrafts[entry.key] ?? entry.value;
        const hay = `${entry.label} ${entry.key} ${currentVal} ${entry.section}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [textCatalog, textSectionFilter, textSearch, textDrafts]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const filteredPayments = useMemo(() => {
    if (paymentFilter === 'all') return payments;
    return payments.filter((p) => p.status === paymentFilter);
  }, [payments, paymentFilter]);

  const filteredAdminTemplates = useMemo(() => {
    const q = tplSearch.trim().toLowerCase();
    if (!q) return adminTemplates;
    return adminTemplates.filter(
      (tpl) =>
        tpl.name.toLowerCase().includes(q) || tpl.category.toLowerCase().includes(q)
    );
  }, [adminTemplates, tplSearch]);

  const premiumTemplatesList = useMemo(
    () => adminTemplates.filter((t) => t.tier === 'premium'),
    [adminTemplates]
  );

  const navItems: { id: AdminSection; label: string; icon: any }[] = [
    { id: 'overview', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'finance', label: 'Financeiro & Pagamentos', icon: CreditCard },
    { id: 'users', label: 'Gestão de Utilizadores', icon: Users },
    { id: 'templates', label: 'Gestão de Modelos', icon: FolderKanban },
    { id: 'texts', label: 'Gestão de Todos os Textos', icon: Type },
    { id: 'resumes', label: 'Currículos & Suporte', icon: FileText },
    { id: 'settings', label: 'Configurações Gerais', icon: Settings },
    { id: 'maintenance', label: 'Manutenção & Auditoria', icon: ShieldAlert },
  ];

  const activeSectionLabel =
    navItems.find((item) => item.id === section)?.label || 'Painel Geral';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <aside
        className="w-full lg:w-68 shrink-0 text-white flex flex-col justify-between lg:sticky lg:top-0 lg:h-screen"
        style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
      >
        <div className="flex flex-col min-h-0 flex-1">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onExitAdmin}
              title="Voltar à Página Inicial"
              className="text-left group focus:outline-none"
            >
              <div
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: settings.accentColor || '#C59B27' }}
              >
                Controlo Total Exclusivo
              </div>
              <div className="text-lg font-bold font-display-serif mt-0.5 group-hover:underline">
                Administração · {settings.platformName}
              </div>
            </button>

            <button
              type="button"
              onClick={onExitAdmin}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg text-slate-950 shadow-sm whitespace-nowrap shrink-0 transition-opacity hover:opacity-90"
              style={{ backgroundColor: settings.accentColor || '#C59B27' }}
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Página Inicial</span>
            </button>
          </div>

          <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-y-auto flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    active ? 'text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                  style={
                    active ? { backgroundColor: settings.accentColor || '#C59B27' } : undefined
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:flex flex-col gap-2 p-4 border-t border-white/10">
          <button
            type="button"
            onClick={onExitAdmin}
            className="w-full py-2.5 px-3 text-xs font-bold text-slate-950 rounded-lg inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-90 whitespace-nowrap"
            style={{ backgroundColor: settings.accentColor || '#C59B27' }}
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Voltar à Página Inicial</span>
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              onExitAdmin();
            }}
            className="w-full py-2 px-3 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/15 rounded-lg inline-flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Sticky Admin Top Bar — Always Accessible on Mobile, Tablet & Desktop */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-5 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
            <span className="font-semibold text-slate-900 whitespace-nowrap">Área Administrativa</span>
            <span>/</span>
            <span className="truncate font-medium text-slate-700">{activeSectionLabel}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white rounded-lg shadow-xs transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
              style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Voltar à Página Inicial</span>
            </button>

            <button
              type="button"
              onClick={() => (onNavigate ? onNavigate('templates') : onExitAdmin())}
              className="hidden sm:inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Ver Modelos
            </button>

            <button
              type="button"
              onClick={() => (onNavigate ? onNavigate('dashboard') : onExitAdmin())}
              className="hidden md:inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              A Minha Conta
            </button>

            <button
              type="button"
              onClick={() => {
                logout();
                onExitAdmin();
              }}
              title="Terminar Sessão"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        <div className="p-5 sm:p-8 flex-1">
        {/* ================================================================ */}
        {/* 1. PAINEL GERAL                                                  */}
        {/* ================================================================ */}
        {section === 'overview' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 font-display-serif">
                  Painel Geral da Plataforma
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visão em tempo real de utilizadores, currículos, modelos e pagamentos WhatsApp.
                </p>
              </div>
              {!settings.whatsappNumber && (
                <button
                  type="button"
                  onClick={() => setSection('settings')}
                  className="px-4 py-2 text-xs font-semibold bg-amber-100 text-amber-950 border border-amber-300 rounded-lg"
                >
                  Configurar Número de WhatsApp Oficial →
                </button>
              )}
            </div>

            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Utilizadores Registados', val: stats.totalUsers },
                  { label: 'Currículos Criados', val: stats.totalResumes },
                  { label: 'Modelos Gratuitos', val: stats.freeTemplates },
                  { label: 'Modelos Premium', val: stats.premiumTemplates },
                  { label: 'Pedidos Pendentes', val: stats.pendingPayments },
                  { label: 'Pagamentos Confirmados', val: stats.approvedPayments },
                  { label: 'Desbloqueios Ativos', val: stats.activeUnlocks },
                  {
                    label: 'Receita Confirmada',
                    val: formatCurrency(stats.confirmedRevenue, settings.currency),
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="bg-white p-5 rounded-xl border border-slate-200"
                  >
                    <div className="text-xs text-slate-500">{kpi.label}</div>
                    <div className="text-2xl font-bold font-data-mono text-slate-900 mt-1.5 tabular-nums">
                      {kpi.val}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Top Templates */}
              <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-bold text-slate-900 mb-4">Modelos Mais Utilizados</h2>
                <div className="divide-y divide-slate-100">
                  {topTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="py-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">{tpl.name}</span>
                        <span className="text-slate-400"> · </span>
                        <span className="text-slate-500">
                          {tpl.tier === 'premium' ? 'Premium' : 'Gratuito'}
                        </span>
                      </div>
                      <span className="font-data-mono font-semibold text-slate-700 tabular-nums">
                        {tpl.usageCount} usos
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-bold text-slate-900 mb-4">
                  Atividade Administrativa Recente
                </h2>
                {recentAudit.length === 0 ? (
                  <p className="text-xs text-slate-500">Sem registos recentes.</p>
                ) : (
                  <div className="space-y-3">
                    {recentAudit.slice(0, 6).map((log) => (
                      <div key={log.id} className="text-xs border-b border-slate-100 pb-2.5">
                        <div className="flex justify-between text-slate-500">
                          <span className="font-semibold text-slate-800">{log.action}</span>
                          <span className="tabular-nums">{formatDateTime(log.createdAt)}</span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{log.details}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* 2. GESTÃO FINANCEIRA, PAGAMENTOS WHATSAPP & PROMOÇÕES            */}
        {/* ================================================================ */}
        {section === 'finance' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-display-serif">
                Gestão Financeira, Pagamentos & Desbloqueios
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Confirme pagamentos recebidos via WhatsApp para desbloquear automaticamente o modelo
                Premium na conta do utilizador.
              </p>
            </div>

            {/* Filter + Pending Requests Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-slate-900">
                  Pedidos de Desbloqueio ({filteredPayments.length})
                </h2>
                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                  {(
                    [
                      { id: 'all', label: 'Todos' },
                      { id: 'pending', label: 'Pendentes' },
                      { id: 'approved', label: 'Confirmados' },
                      { id: 'rejected', label: 'Rejeitados' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setPaymentFilter(f.id)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md ${
                        paymentFilter === f.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredPayments.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500">
                  Nenhum pedido de pagamento neste filtro.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-4">Utilizador</th>
                        <th className="py-3 px-4">Modelo Solicitado</th>
                        <th className="py-3 px-4">Valor</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4">Data</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {filteredPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{pay.userName}</div>
                            <div className="text-slate-500">{pay.userEmail}</div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {pay.templateName}
                            {pay.promoCode && (
                              <span className="block text-[11px] text-emerald-700">
                                Cupão: {pay.promoCode}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-data-mono font-semibold tabular-nums">
                            {formatCurrency(pay.amount, pay.currency)}
                          </td>
                          <td className="py-3 px-4">
                            {pay.status === 'pending' && (
                              <span className="font-semibold text-amber-700">Pendente</span>
                            )}
                            {pay.status === 'approved' && (
                              <span className="font-semibold text-emerald-700">Confirmado</span>
                            )}
                            {pay.status === 'rejected' && (
                              <span className="font-semibold text-red-600">Rejeitado</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 tabular-nums">
                            {formatDateTime(pay.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            {pay.status !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleApprovePayment(pay.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Confirmar & Desbloquear</span>
                              </button>
                            )}
                            {pay.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleRejectPayment(pay.id)}
                                className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
                              >
                                Rejeitar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Manual Payment Registration + Promotions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <form
                onSubmit={handleRegisterManualPayment}
                className="bg-white p-6 rounded-xl border border-slate-200 space-y-4"
              >
                <h3 className="text-sm font-bold text-slate-900">
                  Registar Pagamento Recebido & Desbloquear Manualmente
                </h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail do Utilizador Registado
                  </label>
                  <input
                    type="email"
                    required
                    list="registered-users-emails"
                    value={manualPayEmail}
                    onChange={(e) => setManualPayEmail(e.target.value)}
                    placeholder="cliente@exemplo.ao"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  <datalist id="registered-users-emails">
                    {users.map((u) => (
                      <option key={u.id} value={u.email}>
                        {u.fullName}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Modelo Premium a Desbloquear
                  </label>
                  <select
                    required
                    value={manualPayTplId}
                    onChange={(e) => setManualPayTplId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Selecione um modelo Premium...</option>
                    {premiumTemplatesList.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({formatCurrency(tpl.price, settings.currency)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor Pago ({settings.currency}) — opcional (usa preço do modelo se vazio)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={manualPayAmount}
                    onChange={(e) => setManualPayAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-data-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-xs font-semibold text-white rounded-lg"
                  style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                >
                  Confirmar Pagamento e Libertar Modelo
                </button>
              </form>

              {/* Promotions & Discounts */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Promoções e Códigos de Desconto</h3>
                <form onSubmit={handleCreatePromo} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Código (ex: ANGOLA25)"
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg uppercase font-data-mono"
                  />
                  <input
                    type="text"
                    required
                    value={promoTitle}
                    onChange={(e) => setPromoTitle(e.target.value)}
                    placeholder="Descrição"
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={promoPercent}
                      onChange={(e) => setPromoPercent(e.target.value)}
                      placeholder="%"
                      className="w-20 px-2.5 py-2 text-xs border border-slate-300 rounded-lg font-data-mono"
                    />
                    <button
                      type="submit"
                      className="flex-1 px-3 py-2 text-xs font-semibold text-slate-950 rounded-lg"
                      style={{ backgroundColor: settings.accentColor || '#C59B27' }}
                    >
                      Criar
                    </button>
                  </div>
                </form>

                <div className="divide-y divide-slate-100">
                  {promos.map((pr) => (
                    <div key={pr.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-data-mono font-bold text-slate-900">{pr.code}</span>
                        <span className="text-slate-500">
                          {' '}
                          · -{pr.discountPercent}% · {pr.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePromo(pr.id)}
                        className="text-red-600 hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Unlocks List (Block/Restore granted access) */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">
                  Controlo de Acessos Premium Concedidos ({unlocks.length})
                </h3>
              </div>
              {unlocks.length === 0 ? (
                <div className="p-6 text-xs text-slate-500">Ainda não existem desbloqueios concedidos.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                        <th className="py-2.5 px-4">Utilizador</th>
                        <th className="py-2.5 px-4">Modelo Premium</th>
                        <th className="py-2.5 px-4">Concedido por</th>
                        <th className="py-2.5 px-4">Estado</th>
                        <th className="py-2.5 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {unlocks.map((u) => (
                        <tr key={u.id}>
                          <td className="py-2.5 px-4">{u.userEmail}</td>
                          <td className="py-2.5 px-4 font-semibold">{u.templateName}</td>
                          <td className="py-2.5 px-4 text-slate-500">{u.grantedBy}</td>
                          <td className="py-2.5 px-4">
                            {u.active ? (
                              <span className="text-emerald-700 font-semibold">Ativo</span>
                            ) : (
                              <span className="text-red-600 font-semibold">Bloqueado</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleUnlockRecord(u.id)}
                              className="px-3 py-1 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50"
                            >
                              {u.active ? 'Bloquear acesso' : 'Reativar acesso'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* 3. GESTÃO DE UTILIZADORES                                        */}
        {/* ================================================================ */}
        {section === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 font-display-serif">
                  Gestão de Utilizadores ({users.length})
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pesquise contas, consulte perfis, suspenda/reative ou gira desbloqueios Premium.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Pesquisar nome ou e-mail..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                      <th className="py-3 px-4">Nome & E-mail</th>
                      <th className="py-3 px-4">Função</th>
                      <th className="py-3 px-4">Currículos</th>
                      <th className="py-3 px-4">Premium</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Controlo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{u.fullName}</div>
                          <div className="text-slate-500">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          {u.role === 'admin' ? (
                            <span className="font-semibold text-amber-700">Administrador</span>
                          ) : (
                            <span className="text-slate-600">Utilizador</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-data-mono tabular-nums">{u.resumeCount}</td>
                        <td className="py-3 px-4 font-data-mono tabular-nums">
                          {u.unlockedTemplateIds.length} modelo(s)
                        </td>
                        <td className="py-3 px-4">
                          {u.status === 'active' ? (
                            <span className="font-semibold text-emerald-700">Ativa</span>
                          ) : (
                            <span className="font-semibold text-red-600">Suspensa</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => setSelectedUserForUnlock(u)}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg"
                          >
                            Gerir Premium
                          </button>
                          {u.role !== 'admin' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleUserStatus(u)}
                                className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50"
                              >
                                {u.status === 'active' ? 'Suspender' : 'Reativar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                Eliminar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal to Manage User Premium Unlocks */}
            {selectedUserForUnlock && (
              <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Acessos Premium — {selectedUserForUnlock.fullName}
                      </h3>
                      <p className="text-xs text-slate-500">{selectedUserForUnlock.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUserForUnlock(null)}
                      className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleGrantManualUnlock} className="flex gap-2">
                    <select
                      required
                      value={grantTemplateId}
                      onChange={(e) => setGrantTemplateId(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Selecionar modelo Premium para desbloquear...</option>
                      {premiumTemplatesList.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-3.5 py-2 text-xs font-semibold text-white rounded-lg"
                      style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                    >
                      Desbloquear
                    </button>
                  </form>

                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {selectedUserForUnlock.unlockedTemplateIds.length === 0 ? (
                      <p className="text-xs text-slate-500 py-3">
                        Nenhum modelo Premium desbloqueado para este utilizador.
                      </p>
                    ) : (
                      selectedUserForUnlock.unlockedTemplateIds.map((tplId) => {
                        const found = adminTemplates.find((x) => x.id === tplId);
                        return (
                          <div
                            key={tplId}
                            className="py-2 flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-slate-800">
                              {found?.name || tplId}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleRevokeUserUnlock(selectedUserForUnlock.id, tplId)
                              }
                              className="text-red-600 hover:underline font-medium"
                            >
                              Bloquear / Revogar
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* 4. GESTÃO DE MODELOS E CATEGORIAS                                */}
        {/* ================================================================ */}
        {section === 'templates' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 font-display-serif">
                  Gestão de Modelos de Currículos ({adminTemplates.length})
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Crie novos modelos, defina preços, duplique, ative/desative e organize categorias.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tplSearch}
                  onChange={(e) => setTplSearch(e.target.value)}
                  placeholder="Filtrar modelos..."
                  className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() =>
                    setEditingTpl({
                      name: '',
                      tier: 'premium',
                      category: settings.categoriesPremium[0] || 'Currículos executivos de alto nível',
                      description: '',
                      price: settings.defaultPremiumPrice,
                      active: true,
                      layoutType: 'executive-imperial',
                      primaryColor: '#0B192C',
                      accentColor: '#C59B27',
                      defaultFont: 'editorial',
                      showPhoto: true,
                      photoShape: 'circle',
                      skillStyle: 'bars',
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 rounded-lg shrink-0"
                  style={{ backgroundColor: settings.accentColor || '#C59B27' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Modelo</span>
                </button>
              </div>
            </div>

            {/* Category Organizer */}
            <form
              onSubmit={handleAddCategory}
              className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <span className="text-xs font-bold text-slate-800 shrink-0">
                Nova Categoria de Currículos:
              </span>
              <select
                value={newCatTier}
                onChange={(e) => setNewCatTier(e.target.value as any)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="free">Para Modelos Gratuitos</option>
                <option value="premium">Para Modelos Premium</option>
              </select>
              <input
                type="text"
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                placeholder="Ex: Currículos para juristas e advogados"
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white rounded-lg"
                style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
              >
                Adicionar Categoria
              </button>
            </form>

            {/* Templates Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                      <th className="py-3 px-4">Modelo</th>
                      <th className="py-3 px-4">Categoria</th>
                      <th className="py-3 px-4">Tipo / Preço</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredAdminTemplates.map((tpl) => (
                      <tr key={tpl.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 border border-slate-300"
                              style={{ backgroundColor: tpl.primaryColor }}
                            />
                            <span className="font-semibold text-slate-900">{tpl.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{tpl.category}</td>
                        <td className="py-3 px-4 font-data-mono tabular-nums">
                          {tpl.tier === 'free' ? (
                            <span className="text-emerald-700 font-semibold">Gratuito</span>
                          ) : (
                            <span className="text-slate-900 font-semibold">
                              Premium · {formatCurrency(tpl.price, settings.currency)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleTemplateActive(tpl)}
                            className={`font-semibold underline ${
                              tpl.active ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          >
                            {tpl.active ? 'Ativo' : 'Desativado'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingTpl(structuredClone(tpl))}
                            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded"
                            title="Editar modelo"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateTemplate(tpl.id)}
                            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded"
                            title="Duplicar modelo"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(tpl.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Eliminar modelo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Create / Edit Template Modal */}
            {editingTpl && (
              <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-4">
                <form
                  onSubmit={handleSaveTemplate}
                  className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 p-6 space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <h3 className="text-base font-bold text-slate-900">
                      {editingTpl.id ? 'Editar Modelo de Currículo' : 'Criar Novo Modelo'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingTpl(null)}
                      className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nome do Modelo
                      </label>
                      <input
                        type="text"
                        required
                        value={editingTpl.name || ''}
                        onChange={(e) => setEditingTpl({ ...editingTpl, name: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nível de Acesso
                      </label>
                      <select
                        value={editingTpl.tier || 'free'}
                        onChange={(e) =>
                          setEditingTpl({
                            ...editingTpl,
                            tier: e.target.value as 'free' | 'premium',
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="free">Gratuito</option>
                        <option value="premium">Premium (Bloqueado até pagamento)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Categoria
                      </label>
                      <select
                        value={editingTpl.category || ''}
                        onChange={(e) =>
                          setEditingTpl({ ...editingTpl, category: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                      >
                        {(editingTpl.tier === 'premium'
                          ? settingsForm.categoriesPremium
                          : settingsForm.categoriesFree
                        ).map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {editingTpl.tier === 'premium' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Preço ({settings.currency})
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editingTpl.price ?? settings.defaultPremiumPrice}
                          onChange={(e) =>
                            setEditingTpl({ ...editingTpl, price: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-data-mono"
                        />
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Arquitetura Estrutural A4
                      </label>
                      <select
                        value={editingTpl.layoutType || 'sidebar-left'}
                        onChange={(e) =>
                          setEditingTpl({
                            ...editingTpl,
                            layoutType: e.target.value as TemplateLayoutType,
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                      >
                        {LAYOUT_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cor Principal (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editingTpl.primaryColor || '#0B192C'}
                          onChange={(e) =>
                            setEditingTpl({ ...editingTpl, primaryColor: e.target.value })
                          }
                          className="h-9 w-12 rounded border border-slate-300"
                        />
                        <input
                          type="text"
                          value={editingTpl.primaryColor || '#0B192C'}
                          onChange={(e) =>
                            setEditingTpl({ ...editingTpl, primaryColor: e.target.value })
                          }
                          className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-data-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cor de Destaque / Dourado (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editingTpl.accentColor || '#C59B27'}
                          onChange={(e) =>
                            setEditingTpl({ ...editingTpl, accentColor: e.target.value })
                          }
                          className="h-9 w-12 rounded border border-slate-300"
                        />
                        <input
                          type="text"
                          value={editingTpl.accentColor || '#C59B27'}
                          onChange={(e) =>
                            setEditingTpl({ ...editingTpl, accentColor: e.target.value })
                          }
                          className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-data-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Estilo das Competências
                      </label>
                      <select
                        value={editingTpl.skillStyle || 'bars'}
                        onChange={(e) =>
                          setEditingTpl({ ...editingTpl, skillStyle: e.target.value as any })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="bars">Barras Gráficas de Progresso</option>
                        <option value="grid">Grelha com Marcadores</option>
                        <option value="inline">Linha Contínua Minimalista</option>
                        <option value="list">Lista Clássica</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-4 pt-5">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={Boolean(editingTpl.showPhoto)}
                          onChange={(e) =>
                            setEditingTpl({
                              ...editingTpl,
                              showPhoto: e.target.checked,
                              photoShape: e.target.checked ? 'circle' : 'none',
                            })
                          }
                        />
                        Suporta Fotografia
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={editingTpl.active !== false}
                          onChange={(e) =>
                            setEditingTpl({ ...editingTpl, active: e.target.checked })
                          }
                        />
                        Visível no Site
                      </label>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Descrição do Modelo
                      </label>
                      <textarea
                        rows={2}
                        value={editingTpl.description || ''}
                        onChange={(e) =>
                          setEditingTpl({ ...editingTpl, description: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        URL opcional de imagem de capa personalizada (deixe em branco para gerar pré-visualização A4 automática realista)
                      </label>
                      <input
                        type="text"
                        value={editingTpl.previewImageUrl || ''}
                        onChange={(e) =>
                          setEditingTpl({ ...editingTpl, previewImageUrl: e.target.value })
                        }
                        placeholder="Opcional: /api/uploads/..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingTpl(null)}
                      className="px-4 py-2 text-xs font-semibold bg-slate-100 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-semibold text-white rounded-lg"
                      style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                    >
                      Guardar Modelo
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* 5. GESTÃO DE TODOS OS TEXTOS (EDITOR GLOBAL DE TEXTOS)           */}
        {/* ================================================================ */}
        {section === 'texts' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 font-display-serif">
                  Gestão de todos os textos
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Edite títulos, descrições, botões, menus, bloqueio Premium, FAQ, Termos e
                  mensagens. As alterações refletem-se imediatamente em todo o site.
                </p>
              </div>
              <button
                type="button"
                disabled={savingTexts}
                onClick={handleSaveAllTexts}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 rounded-lg shrink-0"
                style={{ backgroundColor: settings.accentColor || '#C59B27' }}
              >
                <Save className="w-4 h-4" />
                <span>{savingTexts ? 'A guardar...' : 'Guardar Todas as Alterações'}</span>
              </button>
            </div>

            {/* Search & Section Filter */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3">
              <select
                value={textSectionFilter}
                onChange={(e) => setTextSectionFilter(e.target.value)}
                className="px-3.5 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg"
              >
                <option value="all">Todas as Secções ({textCatalog.length} textos)</option>
                {textSections.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>

              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={textSearch}
                  onChange={(e) => setTextSearch(e.target.value)}
                  placeholder="Pesquisar qualquer palavra, frase, botão ou mensagem..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* Editable Entries */}
            <div className="space-y-3">
              {filteredTextEntries.map((entry) => {
                const val = textDrafts[entry.key] ?? entry.value;
                return (
                  <div
                    key={entry.key}
                    className="bg-white p-4 rounded-xl border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs">
                        <span className="font-bold text-slate-900">{entry.label}</span>
                        <span className="text-slate-400"> · </span>
                        <span className="text-slate-500">{entry.section}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleResetSingleText(entry.key)}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900"
                        title="Repor texto padrão"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Repor padrão</span>
                      </button>
                    </div>

                    {entry.multiline ? (
                      <textarea
                        rows={3}
                        value={val}
                        onChange={(e) =>
                          setTextDrafts((prev) => ({ ...prev, [entry.key]: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                      />
                    ) : (
                      <input
                        type="text"
                        value={val}
                        onChange={(e) =>
                          setTextDrafts((prev) => ({ ...prev, [entry.key]: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* 6. GESTÃO DE CURRÍCULOS E SUPORTE                                */}
        {/* ================================================================ */}
        {section === 'resumes' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-display-serif">
                Gestão de Currículos & Suporte ao Utilizador
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Apoio técnico, resposta a mensagens de contacto e moderação responsável.
              </p>
            </div>

            {/* Support Tickets */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-bold text-slate-900 mb-4">
                Mensagens de Contacto, Assistência e Denúncias ({supportTickets.length})
              </h2>
              {supportTickets.length === 0 ? (
                <p className="text-xs text-slate-500">Sem pedidos pendentes.</p>
              ) : (
                <div className="space-y-4">
                  {supportTickets.map((tk) => (
                    <div key={tk.id} className="p-4 rounded-lg border border-slate-200 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{tk.subject}</span>
                          <span className="text-slate-500">
                            {' '}
                            · {tk.userName} ({tk.userEmail})
                          </span>
                        </div>
                        <span
                          className={`font-semibold ${
                            tk.status === 'resolved' ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {tk.status === 'resolved' ? 'Resolvido' : 'Aberto'} ·{' '}
                          {formatDateTime(tk.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700">{tk.message}</p>
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <input
                          type="text"
                          value={replyDrafts[tk.id] ?? tk.adminReply ?? ''}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({ ...prev, [tk.id]: e.target.value }))
                          }
                          placeholder="Escrever resposta de suporte ao utilizador..."
                          className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/support/${tk.id}`, {
                              method: 'PUT',
                              body: JSON.stringify({
                                adminReply: replyDrafts[tk.id] ?? tk.adminReply ?? '',
                                status: 'resolved',
                              }),
                            });
                            notify('Resposta registada e pedido marcado como resolvido.', 'success');
                            loadSectionData('resumes');
                          }}
                          className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg"
                          style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                        >
                          Responder & Resolver
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumes Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h2 className="text-sm font-bold text-slate-900">
                  Currículos Guardados ({allResumes.length})
                </h2>
              </div>
              {allResumes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Ainda não existem currículos guardados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                        <th className="py-3 px-4">Título</th>
                        <th className="py-3 px-4">Utilizador</th>
                        <th className="py-3 px-4">Modelo</th>
                        <th className="py-3 px-4">Atualizado</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {allResumes.map((r) => (
                        <tr key={r.id}>
                          <td className="py-3 px-4 font-semibold text-slate-900">{r.title}</td>
                          <td className="py-3 px-4 text-slate-600">{r.ownerEmail}</td>
                          <td className="py-3 px-4 text-slate-600">{r.templateName}</td>
                          <td className="py-3 px-4 text-slate-500 tabular-nums">
                            {formatDateTime(r.updatedAt)}
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => setInspectingResume(r)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-100 rounded-lg"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Consultar</span>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await apiFetch(`/api/admin/resumes/${r.id}`, { method: 'DELETE' });
                                notify('Currículo eliminado por moderação.', 'info');
                                loadSectionData('resumes');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {inspectingResume && (
              <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">
                      Suporte Administrativo — {inspectingResume.title} ({inspectingResume.ownerEmail})
                    </span>
                    <button
                      type="button"
                      onClick={() => setInspectingResume(null)}
                      className="p-1 text-slate-500"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-slate-200 p-6">
                    <div className="max-w-[660px] mx-auto shadow-lg">
                      <ScaledA4Preview
                        template={
                          adminTemplates.find((x) => x.id === inspectingResume.templateId) ||
                          adminTemplates[0]
                        }
                        data={inspectingResume.data}
                        texts={texts}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* 7. CONFIGURAÇÕES GERAIS                                          */}
        {/* ================================================================ */}
        {section === 'settings' && (
          <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 font-display-serif">
                  Configurações Gerais da Plataforma
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Personalize a marca, cores institucionais, WhatsApp de recebimento, moeda (AOA /
                  internacional) e regras do editor.
                </p>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 rounded-lg"
                style={{ backgroundColor: settings.accentColor || '#C59B27' }}
              >
                <Save className="w-4 h-4" />
                <span>Guardar Configurações</span>
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Plataforma
                </label>
                <input
                  type="text"
                  value={settingsForm.platformName}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, platformName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Texto do Logótipo no Topo
                </label>
                <input
                  type="text"
                  value={settingsForm.logoText}
                  onChange={(e) => setSettingsForm({ ...settingsForm, logoText: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cor Institucional Principal (Azul-Escuro)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settingsForm.primaryColor}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, primaryColor: e.target.value })
                    }
                    className="h-9 w-12 rounded border border-slate-300"
                  />
                  <input
                    type="text"
                    value={settingsForm.primaryColor}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, primaryColor: e.target.value })
                    }
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-data-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cor Institucional Secundária (Dourado)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settingsForm.accentColor}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, accentColor: e.target.value })
                    }
                    className="h-9 w-12 rounded border border-slate-300"
                  />
                  <input
                    type="text"
                    value={settingsForm.accentColor}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, accentColor: e.target.value })
                    }
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-data-mono"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Número Oficial de WhatsApp para Pagamentos Premium (com código do país, ex:
                  244923000000)
                </label>
                <input
                  type="text"
                  value={settingsForm.whatsappNumber}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })
                  }
                  placeholder="Ex: 244923000000"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-amber-300 rounded-lg font-data-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mensagem Automática do WhatsApp (use [NOME DO MODELO] para inserir o nome)
                </label>
                <textarea
                  rows={2}
                  value={settingsForm.whatsappMessageTemplate}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      whatsappMessageTemplate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Moeda Oficial Utilizada
                </label>
                <select
                  value={settingsForm.currency}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, currency: e.target.value as any })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="AOA">Kwanza Angolano (AOA / Kz)</option>
                  <option value="EUR">Euro (EUR / €)</option>
                  <option value="USD">Dólar Americano (USD / $)</option>
                  <option value="BRL">Real Brasileiro (BRL / R$)</option>
                  <option value="MZN">Metical Moçambicano (MZN / MT)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preço Padrão para Novos Modelos Premium
                </label>
                <input
                  type="number"
                  min="0"
                  value={settingsForm.defaultPremiumPrice}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      defaultPremiumPrice: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-data-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail Institucional de Contacto
                </label>
                <input
                  type="email"
                  value={settingsForm.contactEmail}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, contactEmail: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Localização / Endereço Institucional
                </label>
                <input
                  type="text"
                  value={settingsForm.contactAddress}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, contactAddress: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Qualidade de Resolução PDF A4
                </label>
                <select
                  value={settingsForm.pdfQualityScale}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      pdfQualityScale: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value={2}>Padrão Rápido (2x DPI)</option>
                  <option value={3}>Alta Resolução Impressão A4 (3x DPI)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Redes Sociais (LinkedIn / Instagram / Facebook URLs)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="LinkedIn"
                    value={settingsForm.socialLinks.linkedin}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        socialLinks: { ...settingsForm.socialLinks, linkedin: e.target.value },
                      })
                    }
                    className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Instagram"
                    value={settingsForm.socialLinks.instagram}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        socialLinks: { ...settingsForm.socialLinks, instagram: e.target.value },
                      })
                    }
                    className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Facebook"
                    value={settingsForm.socialLinks.facebook}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        socialLinks: { ...settingsForm.socialLinks, facebook: e.target.value },
                      })
                    }
                    className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </form>
        )}

        {/* ================================================================ */}
        {/* 8. MANUTENÇÃO, CONTROLO DO SITE, BACKUP E AUDITORIA              */}
        {/* ================================================================ */}
        {section === 'maintenance' && (
          <div className="space-y-8 max-w-5xl">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-display-serif">
                Manutenção, Segurança & Auditoria
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Controle o acesso público, registo de contas, cópias de segurança e registo de
                auditoria.
              </p>
            </div>

            <form
              onSubmit={handleSaveSettings}
              className="bg-white p-6 rounded-xl border border-slate-200 space-y-4"
            >
              <h2 className="text-sm font-bold text-slate-900">Controlo Operacional do Site</h2>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Modo de Manutenção (Fechar temporariamente o acesso público)
                    </div>
                    <div className="text-xs text-slate-500">
                      Apenas o administrador autenticado continuará a aceder à plataforma.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.maintenanceMode}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, maintenanceMode: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                </label>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mensagem Personalizada Durante a Manutenção
                  </label>
                  <textarea
                    rows={2}
                    value={settingsForm.maintenanceMessage}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, maintenanceMessage: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <label className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Permitir Registo de Novos Utilizadores
                    </div>
                    <div className="text-xs text-slate-500">
                      Desative caso pretenda restringir temporariamente a criação de novas contas.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.allowRegistration}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, allowRegistration: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Ativar Sistema de Códigos Promocionais
                    </div>
                    <div className="text-xs text-slate-500">
                      Permite aplicar cupões de desconto na janela de modelos Premium.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.enablePromotions}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, enablePromotions: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold text-white rounded-lg"
                style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
              >
                Aplicar Definições de Controlo
              </button>
            </form>

            {/* Backup & Restore */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Cópias de Segurança dos Dados (Backup & Restauro)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Exporte uma cópia integral em JSON de modelos, textos, configurações, currículos e
                  histórico financeiro.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg"
                  style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Backup</span>
                </button>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Restaurar JSON</span>
                  <input
                    type="file"
                    accept="application/json"
                    onChange={handleRestoreBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Immutable Audit Log */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">
                  Histórico de Auditoria e Operações Administrativas ({auditLogs.length})
                </h3>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <div key={log.id} className="px-5 py-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-data-mono font-bold text-slate-900">{log.action}</span>
                      <span className="text-slate-500"> · {log.actorEmail}</span>
                      <p className="text-slate-600 mt-0.5">{log.details}</p>
                    </div>
                    <span className="text-slate-400 tabular-nums shrink-0">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
};
