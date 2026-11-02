import React, { useMemo } from 'react';
import { Eye, Lock, Check } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { createSampleResumeData } from '../data/defaultTemplates';
import type { ResumeTemplate } from '../types';
import { formatCurrency } from '../utils/format';
import { ScaledA4Preview } from './ResumeRenderer';

interface TemplateCardProps {
  template: ResumeTemplate;
  onSelect: (template: ResumeTemplate) => void;
  onPreview: (template: ResumeTemplate) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect, onPreview }) => {
  const { settings, texts, t, isTemplateUnlocked } = usePlatform();
  const unlocked = isTemplateUnlocked(template);
  const sampleData = useMemo(() => createSampleResumeData(template), [template]);

  const isLockedPremium = template.tier === 'premium' && !unlocked;

  return (
    <article className="group bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-transform duration-150 hover:-translate-y-0.5">
      {/* Realistic A4 Document Preview Frame */}
      <div
        onClick={() => onSelect(template)}
        className="relative bg-slate-100 p-4 border-b border-slate-200 cursor-pointer"
      >
        <div className="rounded-md overflow-hidden border border-slate-200/90 bg-white shadow-xs relative">
          {template.previewImageUrl ? (
            <img
              src={template.previewImageUrl}
              alt={template.name}
              referrerPolicy="no-referrer"
              className="w-full aspect-[210/297] object-cover object-top"
            />
          ) : (
            <ScaledA4Preview
              template={template}
              data={sampleData}
              texts={texts}
              useSamplePhotoFallback
            />
          )}

          {isLockedPremium && (
            <div className="absolute top-2.5 right-2.5 bg-slate-950/90 text-white px-2.5 py-1 rounded-md text-[11px] font-semibold inline-flex items-center gap-1.5 shadow-sm">
              <Lock
                className="w-3 h-3 shrink-0"
                style={{ color: settings.accentColor || '#C59B27' }}
              />
              <span>Bloqueado · Premium</span>
            </div>
          )}
        </div>

        {/* Hover / Touch Quick Magnify Action */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(template);
          }}
          className="absolute bottom-6 right-6 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900/90 text-white rounded-lg opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity whitespace-nowrap"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{t('library.btnPreview', 'Ampliar exemplo')}</span>
        </button>
      </div>

      {/* Clean Unboxed Metadata & Action */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span
                className="font-semibold inline-flex items-center gap-1"
                style={{
                  color:
                    template.tier === 'premium'
                      ? settings.accentColor || '#B48A28'
                      : '#0F766E',
                }}
              >
                {isLockedPremium && <Lock className="w-3 h-3 shrink-0" />}
                <span>
                  {template.tier === 'free'
                    ? t('library.badgeFree', 'Gratuito')
                    : unlocked
                    ? t('library.badgeUnlocked', 'Premium Desbloqueado')
                    : t('library.badgePremium', 'Premium · Pago')}
                </span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{template.category}</span>
            </div>

            {isLockedPremium && (
              <span className="font-data-mono font-bold text-slate-900 shrink-0 tabular-nums">
                {formatCurrency(template.price, settings.currency)}
              </span>
            )}
          </div>

          <h3
            onClick={() => onSelect(template)}
            className="text-base font-bold text-slate-900 leading-snug cursor-pointer hover:underline"
          >
            {template.name}
          </h3>
          <p className="mt-1.5 text-xs text-slate-600 leading-relaxed line-clamp-2">
            {template.description}
          </p>
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2">
          {template.tier === 'free' ? (
            <button
              type="button"
              onClick={() => onSelect(template)}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white rounded-lg transition-opacity hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
            >
              {t('library.btnSelectFree', 'Selecionar modelo')}
            </button>
          ) : unlocked ? (
            <button
              type="button"
              onClick={() => onSelect(template)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold text-white rounded-lg transition-opacity hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: '#0F766E' }}
            >
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{t('library.btnUseUnlocked', 'Usar modelo adquirido')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSelect(template)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-bold text-slate-950 rounded-lg transition-opacity hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: settings.accentColor || '#C59B27' }}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>{t('premium.btnPay', 'Pagar e desbloquear')}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
