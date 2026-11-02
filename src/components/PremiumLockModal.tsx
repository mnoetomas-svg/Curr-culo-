import React, { useEffect, useState } from 'react';
import { Lock, MessageCircle, Tag, X } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import type { ResumeTemplate } from '../types';
import { buildWhatsappUnlockLink, formatCurrency } from '../utils/format';

interface PremiumLockModalProps {
  template: ResumeTemplate | null;
  onClose: () => void;
  onRequireAuth: () => void;
}

export const PremiumLockModal: React.FC<PremiumLockModalProps> = ({
  template,
  onClose,
  onRequireAuth,
}) => {
  const { settings, user, promotions, t, apiFetch, notify } = usePlatform();
  const [promoInput, setPromoInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestSavedNotice, setRequestSavedNotice] = useState(false);

  useEffect(() => {
    setPromoInput('');
    setRequestSavedNotice(false);
  }, [template?.id]);

  if (!template) return null;

  const matchedPromo =
    settings.enablePromotions && promoInput.trim()
      ? promotions.find(
          (p) =>
            p.active &&
            p.code.toUpperCase() === promoInput.trim().toUpperCase() &&
            (p.appliesToTemplateId === 'all' || p.appliesToTemplateId === template.id)
        )
      : undefined;

  const finalPrice = matchedPromo
    ? Math.max(0, Math.round(template.price * (1 - matchedPromo.discountPercent / 100)))
    : template.price;

  const whatsappUrl = buildWhatsappUnlockLink(
    settings.whatsappNumber,
    settings.whatsappMessageTemplate,
    template.name,
    user?.email
  );

  const handlePayAndUnlock = async (e: React.MouseEvent<HTMLElement>) => {
    if (!user) {
      e.preventDefault();
      notify(t('premium.loginRequiredNote'), 'info');
      onRequireAuth();
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/api/payment-requests', {
        method: 'POST',
        body: JSON.stringify({
          templateId: template.id,
          promoCode: matchedPromo ? matchedPromo.code : '',
          userWhatsapp: user.whatsapp || '',
        }),
      });
      setRequestSavedNotice(true);
      if (!whatsappUrl) {
        notify(t('premium.whatsappNotConfigured'), 'info');
      } else {
        notify(t('premium.requestRegisteredSuccess'), 'success');
      }
    } catch (err: any) {
      notify(err.message || 'Não foi possível registar o pedido.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
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
              <Lock className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display-serif text-white">
                {t('premium.modalTitle', 'Este é um modelo Premium!')}
              </h3>
              <p className="text-xs text-slate-300">{template.name}</p>
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

        <div className="p-6 space-y-4">
          <div className="space-y-2.5 text-sm text-slate-700 leading-relaxed">
            <p className="font-medium text-slate-900">
              {t(
                'premium.modalBody1',
                'Para utilizar este modelo profissional, é necessário adquirir acesso.'
              )}
            </p>
            <p>
              {t(
                'premium.modalBody2',
                'Entre em contacto com o nosso administrador através do WhatsApp para efetuar o pagamento e desbloquear o modelo.'
              )}
            </p>
          </div>

          {/* Pricing summary */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500">Modelo selecionado</div>
              <div className="text-sm font-semibold text-slate-900">{template.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{template.category}</div>
            </div>
            <div className="text-right">
              {matchedPromo && (
                <div className="text-xs line-through text-slate-400 tabular-nums">
                  {formatCurrency(template.price, settings.currency)}
                </div>
              )}
              <div
                className="text-lg font-bold font-data-mono tabular-nums"
                style={{ color: settings.primaryColor || '#0B192C' }}
              >
                {formatCurrency(finalPrice, settings.currency)}
              </div>
            </div>
          </div>

          {/* Optional Promo Code */}
          {settings.enablePromotions && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Código promocional (opcional)
              </label>
              <div className="relative">
                <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Ex: CARREIRA20"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 uppercase"
                />
              </div>
              {matchedPromo && (
                <p className="text-xs text-emerald-700 font-medium mt-1">
                  Desconto de {matchedPromo.discountPercent}% aplicado ({matchedPromo.title}).
                </p>
              )}
            </div>
          )}

          {!user && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <p>{t('premium.loginRequiredNote')}</p>
              <button
                type="button"
                onClick={onRequireAuth}
                className="font-bold underline hover:text-amber-950"
              >
                Iniciar sessão ou criar conta gratuita agora →
              </button>
            </div>
          )}

          {requestSavedNotice && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              {whatsappUrl
                ? t('premium.requestRegisteredSuccess')
                : t('premium.whatsappNotConfigured')}
            </div>
          )}

          <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              {t('premium.btnBack', 'Voltar aos modelos')}
            </button>

            {user && whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handlePayAndUnlock}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 rounded-lg transition-opacity hover:opacity-90 whitespace-nowrap"
                style={{ backgroundColor: settings.accentColor || '#C59B27' }}
              >
                <MessageCircle className="w-4 h-4" />
                <span>{t('premium.btnPay', 'Pagar e desbloquear')}</span>
              </a>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handlePayAndUnlock}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 rounded-lg transition-opacity hover:opacity-90 whitespace-nowrap disabled:opacity-50"
                style={{ backgroundColor: settings.accentColor || '#C59B27' }}
              >
                <MessageCircle className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'A registar pedido...'
                    : t('premium.btnPay', 'Pagar e desbloquear')}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
