import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

export type AppView = 'home' | 'templates' | 'editor' | 'dashboard' | 'admin';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView, sectionId?: string) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenAuth }) => {
  const { settings, user, t } = usePlatform();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (view: AppView, sectionId?: string) => {
    setMobileOpen(false);
    onNavigate(view, sectionId);
  };

  return (
    <header
      className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 no-print"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-5 sm:px-8 h-16">
        {/* Zone 1: Single clean brand wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="text-xl font-bold tracking-tight whitespace-nowrap shrink-0 font-display-serif text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded"
          style={{ color: settings.primaryColor || '#0B192C' }}
        >
          {settings.logoText || settings.platformName || 'AurumCV'}
        </button>

        {/* Zone 2: 4–5 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => handleNav('templates')}
            className={`hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              currentView === 'templates' ? 'border-amber-600 text-slate-950' : 'border-transparent'
            }`}
          >
            {t('nav.templates', 'Modelos')}
          </button>
          <button
            type="button"
            onClick={() => handleNav('home', 'como-funciona')}
            className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent"
          >
            {t('nav.howItWorks', 'Como Funciona')}
          </button>
          <button
            type="button"
            onClick={() => handleNav('home', 'vantagens')}
            className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent"
          >
            {t('nav.benefits', 'Vantagens')}
          </button>
          <button
            type="button"
            onClick={() => handleNav('home', 'perguntas')}
            className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent"
          >
            {t('nav.faq', 'Perguntas')}
          </button>
          {user && (
            <button
              type="button"
              onClick={() => handleNav(user.role === 'admin' ? 'admin' : 'dashboard')}
              className={`hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                currentView === 'dashboard' || currentView === 'admin'
                  ? 'border-amber-600 text-slate-950 font-semibold'
                  : 'border-transparent'
              }`}
            >
              {user.role === 'admin'
                ? t('nav.adminPanel', 'Administração')
                : t('nav.myAccount', 'A Minha Conta')}
            </button>
          )}
        </nav>

        {/* Zone 3: 1 primary action on desktop + mobile toggle */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <button
              type="button"
              onClick={() => handleNav('dashboard')}
              className="hidden sm:inline-flex items-center px-4 py-2 text-xs font-semibold text-white rounded-lg transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
              style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
            >
              {currentView === 'dashboard'
                ? t('nav.ctaCreate', 'Criar o meu currículo')
                : user.fullName.split(' ')[0]}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="hidden sm:inline-flex items-center px-4 py-2 text-xs font-semibold text-white rounded-lg transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
              style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
            >
              {t('nav.login', 'Iniciar Sessão')}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Abrir menu de navegação"
            className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 px-5 py-4 space-y-2 shadow-lg">
          <button
            type="button"
            onClick={() => handleNav('home')}
            className="block w-full text-left py-2.5 text-sm font-medium text-slate-800 border-b border-slate-100"
          >
            {t('nav.home', 'Página Inicial')}
          </button>
          <button
            type="button"
            onClick={() => handleNav('templates')}
            className="block w-full text-left py-2.5 text-sm font-medium text-slate-800 border-b border-slate-100"
          >
            {t('nav.templates', 'Modelos')}
          </button>
          <button
            type="button"
            onClick={() => handleNav('home', 'como-funciona')}
            className="block w-full text-left py-2.5 text-sm font-medium text-slate-800 border-b border-slate-100"
          >
            {t('nav.howItWorks', 'Como Funciona')}
          </button>
          <button
            type="button"
            onClick={() => handleNav('home', 'vantagens')}
            className="block w-full text-left py-2.5 text-sm font-medium text-slate-800 border-b border-slate-100"
          >
            {t('nav.benefits', 'Vantagens')}
          </button>
          <button
            type="button"
            onClick={() => handleNav('home', 'perguntas')}
            className="block w-full text-left py-2.5 text-sm font-medium text-slate-800 border-b border-slate-100"
          >
            {t('nav.faq', 'Perguntas')}
          </button>
          {user ? (
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleNav('dashboard')}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg text-center"
                style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
              >
                {t('nav.myAccount', 'A Minha Conta')}
              </button>
              {user.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => handleNav('admin')}
                  className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg text-center text-slate-900"
                  style={{ backgroundColor: settings.accentColor || '#C59B27' }}
                >
                  {t('nav.adminPanel', 'Administração')}
                </button>
              )}
            </div>
          ) : (
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenAuth('login');
                }}
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-white rounded-lg"
                style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
              >
                {t('nav.login', 'Iniciar Sessão')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenAuth('register');
                }}
                className="flex-1 py-2.5 px-4 text-sm font-semibold border border-slate-300 text-slate-800 rounded-lg"
              >
                Registar
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
