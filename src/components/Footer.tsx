import React, { useState } from 'react';
import { X } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import type { AppView } from './Navbar';

interface FooterProps {
  onNavigate: (view: AppView, sectionId?: string) => void;
  onOpenSetupAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenSetupAdmin }) => {
  const { settings, hasAdmin, t } = usePlatform();
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  return (
    <>
      <footer
        className="text-white border-t border-slate-800 no-print"
        style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-white/10">
            <div className="md:col-span-5">
              <div className="text-2xl font-bold font-display-serif tracking-tight text-white">
                {settings.logoText || settings.platformName || 'AurumCV'}
              </div>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-md">
                {t('footer.description')}
              </p>
              <div className="mt-5 text-xs text-slate-400 space-y-1">
                {settings.contactAddress && <div>{settings.contactAddress}</div>}
                {settings.contactEmail && <div>E-mail: {settings.contactEmail}</div>}
              </div>
            </div>

            <div className="md:col-span-3">
              <h4
                className="text-xs font-semibold uppercase tracking-wider mb-4"
                style={{ color: settings.accentColor || '#C59B27' }}
              >
                Plataforma
              </h4>
              <ul className="space-y-2.5 text-sm text-slate-300">
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('templates')}
                    className="hover:text-white transition-colors"
                  >
                    {t('nav.templates', 'Modelos')}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('home', 'como-funciona')}
                    className="hover:text-white transition-colors"
                  >
                    {t('nav.howItWorks', 'Como Funciona')}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('home', 'perguntas')}
                    className="hover:text-white transition-colors"
                  >
                    {t('nav.faq', 'Perguntas')}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('home', 'contacto')}
                    className="hover:text-white transition-colors"
                  >
                    {t('nav.contact', 'Contacto')}
                  </button>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4">
              <h4
                className="text-xs font-semibold uppercase tracking-wider mb-4"
                style={{ color: settings.accentColor || '#C59B27' }}
              >
                Informação Institucional & Legal
              </h4>
              <ul className="space-y-2.5 text-sm text-slate-300">
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalModal('terms')}
                    className="hover:text-white transition-colors"
                  >
                    {t('legal.termsTitle', 'Termos e Condições')}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalModal('privacy')}
                    className="hover:text-white transition-colors"
                  >
                    {t('legal.privacyTitle', 'Política de Privacidade')}
                  </button>
                </li>
                {!hasAdmin && onOpenSetupAdmin && (
                  <li className="pt-2">
                    <button
                      type="button"
                      onClick={onOpenSetupAdmin}
                      className="text-xs font-semibold underline hover:opacity-90"
                      style={{ color: settings.accentColor || '#C59B27' }}
                    >
                      Configuração Inicial do Administrador Principal
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div>
              © {new Date().getFullYear()} {settings.platformName}. {t('footer.copyright')}
            </div>
            <div className="flex items-center gap-4">
              {settings.socialLinks?.linkedin && (
                <a
                  href={settings.socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  LinkedIn
                </a>
              )}
              {settings.socialLinks?.instagram && (
                <a
                  href={settings.socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  Instagram
                </a>
              )}
              {settings.socialLinks?.facebook && (
                <a
                  href={settings.socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  Facebook
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* Legal Modal */}
      {legalModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold font-display-serif text-slate-900">
                {legalModal === 'terms' ? t('legal.termsTitle') : t('legal.privacyTitle')}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {legalModal === 'terms' ? t('legal.termsContent') : t('legal.privacyContent')}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-5 py-2 text-xs font-semibold text-white rounded-lg"
                style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
