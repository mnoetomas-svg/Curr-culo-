import React, { useMemo, useState } from 'react';
import { Search, X, Lock } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { createSampleResumeData } from '../data/defaultTemplates';
import type { ResumeTemplate } from '../types';
import { formatCurrency } from '../utils/format';
import { ScaledA4Preview } from './ResumeRenderer';
import { TemplateCard } from './TemplateCard';

interface TemplateLibraryProps {
  initialTier?: 'all' | 'free' | 'premium';
  onSelectTemplate: (template: ResumeTemplate) => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  initialTier = 'all',
  onSelectTemplate,
}) => {
  const { templates, settings, texts, t, isTemplateUnlocked } = usePlatform();
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'premium'>(initialTier);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewModalTpl, setPreviewModalTpl] = useState<ResumeTemplate | null>(null);

  const activeTemplates = useMemo(
    () => templates.filter((tpl) => tpl.active),
    [templates]
  );

  const availableCategories = useMemo(() => {
    const pool =
      tierFilter === 'free'
        ? activeTemplates.filter((i) => i.tier === 'free')
        : tierFilter === 'premium'
        ? activeTemplates.filter((i) => i.tier === 'premium')
        : activeTemplates;
    return Array.from(new Set(pool.map((i) => i.category)));
  }, [activeTemplates, tierFilter]);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeTemplates.filter((tpl) => {
      if (tierFilter !== 'all' && tpl.tier !== tierFilter) return false;
      if (categoryFilter !== 'all' && tpl.category !== categoryFilter) return false;
      if (q) {
        const hay = `${tpl.name} ${tpl.category} ${tpl.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activeTemplates, tierFilter, categoryFilter, searchQuery]);

  const freeCount = activeTemplates.filter((i) => i.tier === 'free').length;
  const premiumCount = activeTemplates.filter((i) => i.tier === 'premium').length;

  return (
    <section className="py-12 sm:py-16 bg-slate-50 min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-10">
          <div className="text-xs font-semibold text-slate-500 mb-2">
            <span className="tabular-nums">{freeCount}</span> Gratuitos ·{' '}
            <span className="tabular-nums">{premiumCount}</span> Premium Exclusivos
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display-serif text-balance">
            {t('library.title')}
          </h1>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            {t('library.subtitle')}
          </p>
        </div>

        {/* Interactive Filter Controls */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 mb-8 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Segmented Tier Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setTierFilter('all');
                setCategoryFilter('all');
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tierFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('library.filterAll', 'Todos os Modelos')} ({activeTemplates.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setTierFilter('free');
                setCategoryFilter('all');
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tierFilter === 'free'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('library.filterFree', 'Modelos Gratuitos')} ({freeCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setTierFilter('premium');
                setCategoryFilter('all');
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tierFilter === 'premium'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('library.filterPremium', 'Modelos Premium')} ({premiumCount})
            </button>
          </div>

          {/* Category Dropdown & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 lg:max-w-xl">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filtrar por categoria"
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            >
              <option value="all">Todas as categorias ({availableCategories.length})</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('library.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              Nenhum modelo encontrado para os critérios selecionados.
            </p>
            <button
              type="button"
              onClick={() => {
                setTierFilter('all');
                setCategoryFilter('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white rounded-lg"
              style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                onSelect={onSelectTemplate}
                onPreview={setPreviewModalTpl}
              />
            ))}
          </div>
        )}
      </div>

      {/* Full-Size Realistic Preview Modal */}
      {previewModalTpl && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
              <div className="min-w-0">
                <div className="text-xs text-slate-500">
                  {previewModalTpl.tier === 'free' ? 'Modelo Gratuito' : 'Modelo Premium'} ·{' '}
                  {previewModalTpl.category}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {previewModalTpl.name}
                </h3>
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
                    const chosen = previewModalTpl;
                    setPreviewModalTpl(null);
                    onSelectTemplate(chosen);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap"
                  style={
                    previewModalTpl.tier === 'premium' && !isTemplateUnlocked(previewModalTpl)
                      ? { backgroundColor: settings.accentColor || '#C59B27', color: '#0F172A' }
                      : { backgroundColor: settings.primaryColor || '#0B192C', color: '#FFFFFF' }
                  }
                >
                  {previewModalTpl.tier === 'premium' && !isTemplateUnlocked(previewModalTpl) && (
                    <Lock className="w-3.5 h-3.5" />
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
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {previewModalTpl.tier === 'premium' && !isTemplateUnlocked(previewModalTpl) && (
              <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 text-xs text-amber-950 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                <span>
                  <strong>Modelo Premium bloqueado:</strong> apenas visualização de exemplo. Para preencher e exportar este modelo, clique em{' '}
                  <strong>Pagar e desbloquear</strong>.
                </span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto bg-slate-200/70 p-4 sm:p-8">
              <div className="max-w-[720px] mx-auto shadow-lg">
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
    </section>
  );
};
