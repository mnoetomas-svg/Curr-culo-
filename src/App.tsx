import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminSetupModal } from './components/AdminSetupModal';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { Navbar, type AppView } from './components/Navbar';
import { PremiumLockModal } from './components/PremiumLockModal';
import { ResumeEditor } from './components/ResumeEditor';
import { TemplateLibrary } from './components/TemplateLibrary';
import { UserDashboard } from './components/UserDashboard';
import { PlatformProvider, usePlatform } from './context/PlatformContext';
import { createBlankResumeData } from './data/defaultTemplates';
import type { ResumeData, ResumeDocument, ResumeTemplate } from './types';

function MainAppContent() {
  const {
    loading,
    settings,
    user,
    templates,
    toasts,
    dismissToast,
    isTemplateUnlocked,
  } = usePlatform();

  const [view, setView] = useState<AppView>('home');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'recover'>('login');
  const [adminSetupOpen, setAdminSetupOpen] = useState(false);

  // Active editor session state
  const [activeTemplate, setActiveTemplate] = useState<ResumeTemplate | null>(null);
  const [editingResumeDoc, setEditingResumeDoc] = useState<ResumeDocument | null>(null);
  const [editorInitialData, setEditorInitialData] = useState<ResumeData | null>(null);

  // Locked Premium Modal state
  const [lockedPremiumTemplate, setLockedPremiumTemplate] = useState<ResumeTemplate | null>(null);

  const handleNavigate = (nextView: AppView, sectionId?: string) => {
    if (nextView === 'admin' && user?.role !== 'admin') {
      setView('home');
      return;
    }
    if (nextView === 'dashboard' && !user) {
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
    }
    setView(nextView);

    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectTemplate = (template: ResumeTemplate) => {
    if (template.tier === 'premium' && !isTemplateUnlocked(template)) {
      setLockedPremiumTemplate(template);
      return;
    }
    setEditingResumeDoc(null);
    setActiveTemplate(template);
    setEditorInitialData(createBlankResumeData(template));
    setView('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenSavedResume = (doc: ResumeDocument) => {
    const tpl = templates.find((t) => t.id === doc.templateId) || templates[0];
    if (tpl && tpl.tier === 'premium' && !isTemplateUnlocked(tpl)) {
      setLockedPremiumTemplate(tpl);
      return;
    }
    setEditingResumeDoc(doc);
    setActiveTemplate(tpl);
    setEditorInitialData(structuredClone(doc.data));
    setView('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <div className="text-xl font-bold font-display-serif text-slate-900">
            A carregar plataforma...
          </div>
          <p className="text-xs text-slate-500">A preparar biblioteca de modelos e configurações</p>
        </div>
      </div>
    );
  }

  // Maintenance Gate for non-admin visitors
  if (settings.maintenanceMode && user?.role !== 'admin') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 text-white"
        style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
      >
        <div className="max-w-lg w-full bg-white/5 border border-white/15 rounded-2xl p-8 text-center space-y-4">
          <ShieldAlert
            className="w-10 h-10 mx-auto"
            style={{ color: settings.accentColor || '#C59B27' }}
          />
          <h1 className="text-2xl font-bold font-display-serif">{settings.platformName}</h1>
          <p className="text-sm text-slate-300 leading-relaxed">{settings.maintenanceMessage}</p>
          <div className="pt-4">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthModalOpen(true);
              }}
              className="text-xs font-semibold text-slate-300 hover:text-white underline"
            >
              Acesso exclusivo da administração
            </button>
          </div>
        </div>

        <AuthModal
          open={authModalOpen}
          initialMode={authMode}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => setView('admin')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {view !== 'admin' && (
        <Navbar
          currentView={view}
          onNavigate={handleNavigate}
          onOpenAuth={(mode = 'login') => {
            setAuthMode(mode);
            setAuthModalOpen(true);
          }}
        />
      )}

      <div className="flex-1">
        {view === 'home' && (
          <LandingPage
            onNavigate={handleNavigate}
            onSelectTemplate={handleSelectTemplate}
            onOpenSetupAdmin={() => setAdminSetupOpen(true)}
          />
        )}

        {view === 'templates' && (
          <TemplateLibrary onSelectTemplate={handleSelectTemplate} />
        )}

        {view === 'editor' && activeTemplate && editorInitialData && (
          <ResumeEditor
            template={activeTemplate}
            existingResume={editingResumeDoc}
            initialData={editorInitialData}
            onBackToTemplates={() => setView('templates')}
            onSelectDifferentTemplate={(nextTpl) => {
              if (nextTpl.tier === 'premium' && !isTemplateUnlocked(nextTpl)) {
                setLockedPremiumTemplate(nextTpl);
                return;
              }
              setActiveTemplate(nextTpl);
            }}
            onRequireAuth={() => {
              setAuthMode('login');
              setAuthModalOpen(true);
            }}
            onSavedResume={(saved) => setEditingResumeDoc(saved)}
          />
        )}

        {view === 'dashboard' && user && (
          <UserDashboard
            onOpenResume={handleOpenSavedResume}
            onCreateNew={() => setView('templates')}
            onSelectTemplate={handleSelectTemplate}
            onGoToAdmin={() => setView('admin')}
          />
        )}

        {view === 'admin' && user?.role === 'admin' && (
          <AdminDashboard
            onExitAdmin={() => handleNavigate('home')}
            onNavigate={(nextView) => handleNavigate(nextView)}
          />
        )}
      </div>

      {view !== 'admin' && view !== 'editor' && (
        <Footer
          onNavigate={handleNavigate}
          onOpenSetupAdmin={() => setAdminSetupOpen(true)}
        />
      )}

      {/* Premium Lock Modal */}
      <PremiumLockModal
        template={lockedPremiumTemplate}
        onClose={() => setLockedPremiumTemplate(null)}
        onRequireAuth={() => {
          setAuthMode('register');
          setAuthModalOpen(true);
        }}
      />

      {/* User Authentication Modal */}
      <AuthModal
        open={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Secure One-Time Initial Master Admin Setup Modal */}
      <AdminSetupModal
        open={adminSetupOpen}
        onClose={() => setAdminSetupOpen(false)}
        onCompleted={() => {
          setAdminSetupOpen(false);
          setView('admin');
        }}
      />

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 no-print">
          {toasts.map((item) => (
            <div
              key={item.id}
              className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-medium flex items-start justify-between gap-3 ${
                item.type === 'error'
                  ? 'bg-red-950 text-white border-red-800'
                  : item.type === 'success'
                  ? 'bg-slate-900 text-white border-emerald-500/40'
                  : 'bg-slate-900 text-white border-slate-700'
              }`}
            >
              <span className="leading-relaxed">{item.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(item.id)}
                className="text-slate-400 hover:text-white shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <PlatformProvider>
      <MainAppContent />
    </PlatformProvider>
  );
}
