import React, { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, Lock, Mail, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import { MEDIA_ASSETS } from '../assets/media';
import { usePlatform } from '../context/PlatformContext';
import { createSampleResumeData } from '../data/defaultTemplates';
import type { ResumeTemplate } from '../types';
import { buildWhatsappUnlockLink, formatCurrency } from '../utils/format';
import type { AppView } from './Navbar';
import { ScaledA4Preview } from './ResumeRenderer';
import { TemplateCard } from './TemplateCard';

interface LandingPageProps {
  onNavigate: (view: AppView, sectionId?: string) => void;
  onSelectTemplate: (template: ResumeTemplate) => void;
  onOpenSetupAdmin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  onSelectTemplate,
  onOpenSetupAdmin,
}) => {
  const { settings, templates, texts, hasAdmin, t, apiFetch, notify, isTemplateUnlocked } =
    usePlatform();
  const [previewModalTpl, setPreviewModalTpl] = useState<ResumeTemplate | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sendingContact, setSendingContact] = useState(false);

  const activeTemplates = useMemo(() => templates.filter((item) => item.active), [templates]);
  const freeShowcase = useMemo(
    () => activeTemplates.filter((item) => item.tier === 'free').slice(0, 4),
    [activeTemplates]
  );
  const premiumShowcase = useMemo(
    () => activeTemplates.filter((item) => item.tier === 'premium').slice(0, 4),
    [activeTemplates]
  );

  const faqs = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
  ];

  const handleStartNow = () => {
    const firstFree = activeTemplates.find((tpl) => tpl.tier === 'free') || activeTemplates[0];
    if (firstFree) {
      onSelectTemplate(firstFree);
    } else {
      onNavigate('templates');
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingContact(true);
    try {
      await apiFetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          subject: contactSubject || 'Contacto Institucional',
          message: contactMessage,
          type: 'contact',
        }),
      });
      notify(t('contact.sentSuccess'), 'success');
      setContactName('');
      setContactEmail('');
      setContactSubject('');
      setContactMessage('');
    } catch (err: any) {
      notify(err.message || 'Erro ao enviar mensagem.', 'error');
    } finally {
      setSendingContact(false);
    }
  };

  const generalWhatsappUrl = buildWhatsappUnlockLink(
    settings.whatsappNumber,
    'Olá! Gostaria de obter informações sobre a plataforma de currículos.',
    ''
  );

  return (
    <div className="bg-slate-50">
      {/* One-time Initial Admin Setup Banner (only shown until owner creates admin account) */}
      {!hasAdmin && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-amber-950">
              <ShieldCheck className="w-4 h-4 shrink-0 text-amber-700" />
              <span>
                <strong>Configuração Inicial Pendente:</strong> Ainda não foi criado o Administrador
                Principal da plataforma. Configure agora para definir o seu WhatsApp e gerir o site.
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenSetupAdmin}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 rounded-lg shrink-0 whitespace-nowrap"
              style={{ backgroundColor: settings.accentColor || '#C59B27' }}
            >
              Configurar Administrador Principal
            </button>
          </div>
        </div>
      )}

      {/* 1. HERO SECTION */}
      <section
        className="relative text-white overflow-hidden"
        style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-14 pb-16 lg:pt-20 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div
                className="text-xs font-semibold tracking-wide mb-4"
                style={{ color: settings.accentColor || '#C59B27' }}
              >
                {t('hero.kicker')}
              </div>

              <h1
                className="font-display-serif font-bold tracking-tight text-white leading-[1.12] text-balance"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.6rem)' }}
              >
                {t('hero.title')}
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                {t('hero.description')}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleStartNow}
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-slate-950 rounded-lg transition-opacity hover:opacity-95 whitespace-nowrap"
                  style={{ backgroundColor: settings.accentColor || '#C59B27' }}
                >
                  <span>{t('hero.btnCreate', 'Criar o meu currículo')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('templates')}
                  className="inline-flex items-center px-6 py-3.5 text-sm font-semibold text-white border border-white/25 hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap"
                >
                  {t('hero.btnExplore', 'Explorar modelos')}
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col">
              <div className="relative rounded-xl overflow-hidden border border-white/15 bg-slate-900 flex-1 min-h-[280px]">
                <img
                  src={MEDIA_ASSETS.heroWorkspace}
                  alt="Ambiente executivo com currículo profissional A4 impresso"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex items-end p-6">
                  <div>
                    <div
                      className="text-xs font-semibold"
                      style={{ color: settings.accentColor || '#C59B27' }}
                    >
                      Padrão Internacional A4
                    </div>
                    <p className="text-sm font-medium text-white mt-0.5">
                      Apresentação estruturada para recrutamento corporativo e institucional.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full-width KPI Proof Strip below Hero Split */}
          <div className="mt-12 pt-8 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <div
                className="text-2xl font-bold font-data-mono tabular-nums"
                style={{ color: settings.accentColor || '#C59B27' }}
              >
                {t('hero.stat1Value', '26+')}
              </div>
              <div className="text-xs text-slate-300 mt-1">{t('hero.stat1Label')}</div>
            </div>
            <div>
              <div
                className="text-2xl font-bold font-data-mono tabular-nums"
                style={{ color: settings.accentColor || '#C59B27' }}
              >
                {t('hero.stat2Value', 'A4 PDF')}
              </div>
              <div className="text-xs text-slate-300 mt-1">{t('hero.stat2Label')}</div>
            </div>
            <div>
              <div
                className="text-2xl font-bold font-data-mono tabular-nums"
                style={{ color: settings.accentColor || '#C59B27' }}
              >
                {t('hero.stat3Value', '100%')}
              </div>
              <div className="text-xs text-slate-300 mt-1">{t('hero.stat3Label')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FREE TEMPLATES SHOWCASE */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div className="max-w-2xl">
              <div className="text-xs font-semibold text-emerald-700 mb-1.5">
                Acesso Imediato · Sem Custos
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display-serif text-balance">
                {t('home.freeTitle')}
              </h2>
              <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
                {t('home.freeSubtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('templates')}
              className="text-sm font-semibold text-slate-900 hover:underline inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <span>Ver todos os modelos gratuitos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {freeShowcase.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                onSelect={onSelectTemplate}
                onPreview={setPreviewModalTpl}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 3. PREMIUM TEMPLATES SHOWCASE */}
      <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div className="max-w-2xl">
              <div
                className="text-xs font-semibold mb-1.5"
                style={{ color: settings.accentColor || '#B48A28' }}
              >
                Design Exclusivo · Arquitetura Dupla & Executiva
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display-serif text-balance">
                {t('home.premiumTitle')}
              </h2>
              <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
                {t('home.premiumSubtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('templates')}
              className="px-5 py-2.5 text-xs font-semibold text-white rounded-lg transition-opacity hover:opacity-90 shrink-0 whitespace-nowrap"
              style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
            >
              {t('home.viewAllTemplates')}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {premiumShowcase.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                onSelect={onSelectTemplate}
                onPreview={setPreviewModalTpl}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="como-funciona" className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display-serif text-balance">
              {t('how.title')}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              {t('how.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">{t('how.step1Title')}</h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">{t('how.step1Desc')}</p>
            </div>
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">{t('how.step2Title')}</h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">{t('how.step2Desc')}</p>
            </div>
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">{t('how.step3Title')}</h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">{t('how.step3Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ADVANTAGES & EDITORIAL INTERVIEW PROOF */}
      <section id="vantagens" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display-serif text-balance">
                  {t('benefits.title')}
                </h2>
                <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                  {t('benefits.subtitle')}
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">{t('benefits.item1Title')}</h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    {t('benefits.item1Desc')}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">{t('benefits.item2Title')}</h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    {t('benefits.item2Desc')}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">{t('benefits.item3Title')}</h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    {t('benefits.item3Desc')}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">{t('benefits.item4Title')}</h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    {t('benefits.item4Desc')}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full rounded-xl overflow-hidden border border-slate-200 bg-white relative min-h-[300px]">
                <img
                  src={MEDIA_ASSETS.careerInterview}
                  alt="Entrevista executiva com análise de currículo impresso"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex items-end p-6">
                  <p className="text-xs sm:text-sm text-white/95 leading-relaxed">
                    Um currículo estruturado transmite organização, clareza e respeito pelo tempo do
                    recrutador logo nos primeiros segundos da entrevista.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FREQUENTLY ASKED QUESTIONS */}
      <section id="perguntas" className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display-serif">
              {t('faq.title')}
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-slate-600">{t('faq.subtitle')}</p>
          </div>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white">
            {faqs.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-sm font-semibold text-slate-900">{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. CONTACT INFORMATION & INTERACTIVE FORM */}
      <section id="contacto" className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display-serif">
                {t('contact.title')}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                {t('contact.subtitle')}
              </p>

              <div className="mt-8 space-y-4 text-sm text-slate-700">
                {settings.contactEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>{settings.contactEmail}</span>
                  </div>
                )}
                {settings.contactAddress && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>{settings.contactAddress}</span>
                  </div>
                )}
                {generalWhatsappUrl && (
                  <div className="pt-2">
                    <a
                      href={generalWhatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 rounded-lg"
                      style={{ backgroundColor: settings.accentColor || '#C59B27' }}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Falar no WhatsApp Oficial</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7">
              <form
                onSubmit={handleContactSubmit}
                className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="O seu nome"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="seu.email@exemplo.ao"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assunto</label>
                  <input
                    type="text"
                    required
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    placeholder="Ex: Dúvida sobre desbloqueio de modelo ou parceria"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mensagem
                  </label>
                  <textarea
                    rows={4}
                    required
                    minLength={5}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Escreva aqui a sua questão..."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={sendingContact}
                    className="px-6 py-2.5 text-xs font-semibold text-white rounded-lg hover:opacity-95 disabled:opacity-50"
                    style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                  >
                    {sendingContact ? 'A enviar...' : 'Enviar Mensagem'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Preview Modal from Homepage */}
      {previewModalTpl && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
              <div className="min-w-0">
                <div className="text-xs text-slate-500">
                  {previewModalTpl.tier === 'free' ? 'Modelo Gratuito' : 'Modelo Premium · Pago'} ·{' '}
                  {previewModalTpl.category}
                </div>
                <h3 className="text-base font-bold text-slate-900 truncate">{previewModalTpl.name}</h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {previewModalTpl.tier === 'premium' && !isTemplateUnlocked(previewModalTpl) && (
                  <span className="hidden sm:inline text-sm font-bold font-data-mono text-slate-900 mr-2 tabular-nums">
                    {formatCurrency(previewModalTpl.price, settings.currency)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const tpl = previewModalTpl;
                    setPreviewModalTpl(null);
                    onSelectTemplate(tpl);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap"
                  style={
                    previewModalTpl.tier === 'premium' && !isTemplateUnlocked(previewModalTpl)
                      ? { backgroundColor: settings.accentColor || '#C59B27', color: '#0F172A' }
                      : { backgroundColor: settings.primaryColor || '#0B192C', color: '#FFFFFF' }
                  }
                >
                  {previewModalTpl.tier === 'premium' && !isTemplateUnlocked(previewModalTpl) && (
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>
                    {previewModalTpl.tier === 'free' || isTemplateUnlocked(previewModalTpl)
                      ? t('library.btnSelectFree', 'Selecionar modelo')
                      : t('premium.btnPay', 'Pagar e desbloquear')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModalTpl(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Fechar
                </button>
              </div>
            </div>
            {previewModalTpl.tier === 'premium' && !isTemplateUnlocked(previewModalTpl) && (
              <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 text-xs text-amber-950 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                  <span>
                    <strong>Modelo Premium bloqueado:</strong> apenas visualização de exemplo. Para preencher e exportar este modelo, clique em{' '}
                    <strong>Pagar e desbloquear</strong>.
                  </span>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto bg-slate-200/70 p-4 sm:p-8">
              <div className="max-w-[700px] mx-auto shadow-lg">
                <ScaledA4Preview
                  template={previewModalTpl}
                  data={createSampleResumeData(previewModalTpl)}
                  texts={texts}
                  useSamplePhotoFallback
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
