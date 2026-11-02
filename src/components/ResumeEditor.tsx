import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Download,
  Eye,
  FileCheck2,
  Plus,
  Printer,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { MEDIA_ASSETS } from '../assets/media';
import { usePlatform } from '../context/PlatformContext';
import { createSampleResumeData } from '../data/defaultTemplates';
import type {
  EducationItem,
  ExperienceItem,
  LanguageItem,
  PhotoShape,
  ResumeData,
  ResumeDocument,
  ResumeSectionKey,
  ResumeTemplate,
  TemplateFontFamily,
} from '../types';
import { formatCurrency } from '../utils/format';
import { exportElementToA4Pdf } from '../utils/pdfExport';
import { ResumeRenderer, ScaledA4Preview } from './ResumeRenderer';

interface ResumeEditorProps {
  template: ResumeTemplate;
  existingResume: ResumeDocument | null;
  initialData: ResumeData;
  onBackToTemplates: () => void;
  onSelectDifferentTemplate: (tpl: ResumeTemplate) => void;
  onRequireAuth: () => void;
  onSavedResume: (saved: ResumeDocument) => void;
}

type EditorTab =
  | 'personal'
  | 'profile'
  | 'experience'
  | 'education'
  | 'skills'
  | 'additional'
  | 'design';

const SECTION_LABELS: Record<ResumeSectionKey, string> = {
  profile: 'Perfil & Objetivos Profissionais',
  experiences: 'Experiência Profissional',
  educations: 'Formação Académica',
  skills: 'Competências',
  languages: 'Idiomas',
  additional: 'Informações Adicionais',
};

const FONT_LABELS: Record<TemplateFontFamily, string> = {
  sans: 'Moderna Sem Serifa (Plus Jakarta)',
  serif: 'Clássica Institucional (Georgia Serif)',
  editorial: 'Executiva Editorial (Playfair Display)',
};

export const ResumeEditor: React.FC<ResumeEditorProps> = ({
  template,
  existingResume,
  initialData,
  onBackToTemplates,
  onSelectDifferentTemplate,
  onRequireAuth,
  onSavedResume,
}) => {
  const { settings, texts, templates, user, t, apiFetch, notify, isTemplateUnlocked } =
    usePlatform();

  const [resumeId, setResumeId] = useState<string | null>(existingResume?.id || null);
  const [docTitle, setDocTitle] = useState<string>(
    existingResume?.title || `Currículo — ${template.name}`
  );
  const [data, setData] = useState<ResumeData>(initialData);
  const [activeTab, setActiveTab] = useState<EditorTab>('personal');
  const [mobilePane, setMobilePane] = useState<'form' | 'preview'>('form');
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Skill tag inputs
  const [techInput, setTechInput] = useState('');
  const [persInput, setPersInput] = useState('');
  const [infoInput, setInfoInput] = useState('');
  const [certInput, setCertInput] = useState('');
  const [courseInput, setCourseInput] = useState('');
  const [projInput, setProjInput] = useState('');
  const [refInput, setRefInput] = useState('');

  // Hidden 1:1 794px A4 node for razor-sharp PDF export & native print
  const pdfTargetRef = useRef<HTMLDivElement>(null);

  const isFieldRequired = (field: string) =>
    settings.requiredFields.includes(field as any);

  const validateRequiredFields = (): boolean => {
    const labels: Record<string, string> = {
      fullName: 'Nome completo',
      email: 'E-mail',
      phone: 'Número de telefone',
      cityCountry: 'Cidade e país',
      jobTitle: 'Cargo / Área profissional',
    };
    for (const reqField of settings.requiredFields) {
      const val = String((data.personalInfo as any)[reqField] || '').trim();
      if (!val) {
        notify(`Por favor, preencha o campo obrigatório: ${labels[reqField] || reqField}.`, 'error');
        setActiveTab('personal');
        setMobilePane('form');
        return false;
      }
    }
    return true;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3.5 * 1024 * 1024) {
      notify('A imagem deve ter no máximo 3.5 MB.', 'error');
      return;
    }

    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
        reader.readAsDataURL(file);
      });

      const res = await apiFetch<{ url: string }>('/api/upload-photo', {
        method: 'POST',
        body: JSON.stringify({ dataUrl }),
      });

      setData((prev) => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, photoUrl: res.url },
        customStyle: {
          ...prev.customStyle,
          photoShape:
            prev.customStyle.photoShape === 'none' ? 'circle' : prev.customStyle.photoShape,
        },
      }));
      notify('Fotografia atualizada com sucesso.', 'success');
    } catch (err: any) {
      notify(err.message || 'Erro ao carregar fotografia.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleFillSample = () => {
    const samplePhoto =
      template.showPhoto
        ? template.sampleGender === 'female'
          ? MEDIA_ASSETS.avatarFemale
          : MEDIA_ASSETS.avatarMale
        : '';
    const sample = createSampleResumeData(template, samplePhoto);
    setData(sample);
    notify('Dados de exemplo preenchidos para pré-visualização.', 'info');
  };

  const handleSave = async () => {
    if (!user) {
      notify('Inicie sessão ou crie uma conta para guardar este currículo.', 'info');
      onRequireAuth();
      return;
    }
    if (!validateRequiredFields()) return;

    setSaving(true);
    try {
      if (resumeId) {
        const res = await apiFetch<{ resume: ResumeDocument }>(`/api/resumes/${resumeId}`, {
          method: 'PUT',
          body: JSON.stringify({
            templateId: template.id,
            title: docTitle,
            data,
          }),
        });
        onSavedResume(res.resume);
      } else {
        const res = await apiFetch<{ resume: ResumeDocument }>('/api/resumes', {
          method: 'POST',
          body: JSON.stringify({
            templateId: template.id,
            title: docTitle,
            data,
          }),
        });
        setResumeId(res.resume.id);
        onSavedResume(res.resume);
      }
      notify(t('editor.savedSuccess', 'Currículo guardado com sucesso na sua conta.'), 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível guardar o currículo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!validateRequiredFields()) return;
    if (!pdfTargetRef.current) return;

    setExporting(true);
    try {
      // Backend authorization check for Premium templates
      await apiFetch('/api/verify-export', {
        method: 'POST',
        body: JSON.stringify({ templateId: template.id }),
      });

      const fileName = data.personalInfo.fullName
        ? `Curriculo_${data.personalInfo.fullName}`
        : docTitle;

      await exportElementToA4Pdf(
        pdfTargetRef.current,
        fileName,
        settings.pdfQualityScale || 2.8
      );
      notify(t('editor.pdfSuccess'), 'success');
    } catch (err: any) {
      notify(err.message || 'Erro ao gerar ficheiro PDF.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleNativePrint = async () => {
    if (!validateRequiredFields()) return;
    try {
      await apiFetch('/api/verify-export', {
        method: 'POST',
        body: JSON.stringify({ templateId: template.id }),
      });
      window.print();
    } catch (err: any) {
      notify(err.message || 'Sem permissão para imprimir este modelo.', 'error');
    }
  };

  // Array helpers
  const addTagItem = (
    raw: string,
    clearFn: (v: string) => void,
    updater: (nextItem: string) => void
  ) => {
    const clean = raw.trim();
    if (!clean) return;
    updater(clean);
    clearFn('');
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const next = [...data.sectionOrder];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= next.length) return;
    const [removed] = next.splice(index, 1);
    next.splice(targetIdx, 0, removed);
    setData((prev) => ({ ...prev, sectionOrder: next }));
  };

  const toggleSectionVisibility = (key: ResumeSectionKey) => {
    setData((prev) => ({
      ...prev,
      visibleSections: {
        ...prev.visibleSections,
        [key]: prev.visibleSections[key] === false ? true : false,
      },
    }));
  };

  const addExperience = () => {
    const item: ExperienceItem = {
      id: `exp-${Date.now()}`,
      company: '',
      role: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
    };
    setData((prev) => ({ ...prev, experiences: [...prev.experiences, item] }));
  };

  const updateExperience = (id: string, patch: Partial<ExperienceItem>) => {
    setData((prev) => ({
      ...prev,
      experiences: prev.experiences.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const removeExperience = (id: string) => {
    setData((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((item) => item.id !== id),
    }));
  };

  const addEducation = () => {
    const item: EducationItem = {
      id: `edu-${Date.now()}`,
      institution: '',
      course: '',
      degreeLevel: 'Licenciatura',
      startYear: '',
      endYear: '',
    };
    setData((prev) => ({ ...prev, educations: [...prev.educations, item] }));
  };

  const updateEducation = (id: string, patch: Partial<EducationItem>) => {
    setData((prev) => ({
      ...prev,
      educations: prev.educations.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const removeEducation = (id: string) => {
    setData((prev) => ({
      ...prev,
      educations: prev.educations.filter((item) => item.id !== id),
    }));
  };

  const addLanguage = () => {
    const item: LanguageItem = {
      id: `lang-${Date.now()}`,
      language: '',
      level: 'Intermédio',
    };
    setData((prev) => ({ ...prev, languages: [...prev.languages, item] }));
  };

  const tabs: { id: EditorTab; label: string }[] = [
    { id: 'personal', label: t('editor.tabPersonal', 'Dados Pessoais') },
    { id: 'profile', label: t('editor.tabProfile', 'Perfil') },
    { id: 'experience', label: t('editor.tabExperience', 'Experiência') },
    { id: 'education', label: t('editor.tabEducation', 'Formação') },
    { id: 'skills', label: t('editor.tabSkills', 'Competências & Idiomas') },
    { id: 'additional', label: t('editor.tabAdditional', 'Adicionais') },
    { id: 'design', label: t('editor.tabDesign', 'Design & Secções') },
  ];

  const activeSelectableTemplates = templates.filter((tpl) => tpl.active);

  return (
    <div className="bg-slate-100 min-h-screen">
      {/* Editor Workspace Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 no-print">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToTemplates}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg shrink-0 whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('editor.headerBack', 'Modelos')}</span>
            </button>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              aria-label="Título do currículo"
              className="text-sm font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-900 focus:outline-none px-1 py-0.5 truncate max-w-[200px] sm:max-w-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleFillSample}
              className="px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 whitespace-nowrap"
            >
              {t('editor.btnFillSample', 'Preencher exemplo')}
            </button>

            <button
              type="button"
              onClick={() => setFullPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('editor.btnPreview', 'Pré-visualizar A4')}</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white rounded-lg hover:opacity-95 disabled:opacity-50 whitespace-nowrap"
              style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'A guardar...' : t('editor.btnSave', 'Guardar')}</span>
            </button>

            <button
              type="button"
              disabled={exporting}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 rounded-lg hover:opacity-95 disabled:opacity-50 whitespace-nowrap"
              style={{ backgroundColor: settings.accentColor || '#C59B27' }}
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {exporting ? 'A gerar PDF A4...' : t('editor.btnDownloadPdf', 'Descarregar PDF')}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Mode Switcher (Form vs Live A4 Sheet) */}
        <div className="lg:hidden mt-3 flex p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setMobilePane('form')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md ${
              mobilePane === 'form' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Preencher Dados
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('preview')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md ${
              mobilePane === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Ver Folha A4 em Tempo Real
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-7 no-print">
        {/* LEFT COLUMN: Form & Visual Controls */}
        <div
          className={`lg:col-span-6 xl:col-span-6 ${
            mobilePane === 'preview' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Section Navigation Tabs */}
          <div className="bg-white border border-slate-200 rounded-xl p-1.5 mb-5 flex items-center gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                style={
                  activeTab === tab.id
                    ? { backgroundColor: settings.primaryColor || '#0B192C' }
                    : undefined
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
            {/* TAB 1: PERSONAL INFO */}
            {activeTab === 'personal' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-slate-900">Dados Pessoais</h2>

                {template.showPhoto && (
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {data.personalInfo.photoUrl ? (
                      <img
                        src={data.personalInfo.photoUrl}
                        alt="Fotografia"
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-full object-cover object-top border border-slate-300 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500 shrink-0">
                        Foto
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-slate-900">
                        Fotografia Profissional
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        JPG, PNG ou WebP até 3.5 MB. Ajustada automaticamente sem distorção.
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingPhoto ? 'A carregar...' : 'Escolher fotografia'}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                        {data.personalInfo.photoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setData((prev) => ({
                                ...prev,
                                personalInfo: { ...prev.personalInfo, photoUrl: '' },
                              }))
                            }
                            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome completo {isFieldRequired('fullName') && <span className="text-red-600">*</span>}
                    </label>
                    <input
                      type="text"
                      value={data.personalInfo.fullName}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          personalInfo: { ...p.personalInfo, fullName: e.target.value },
                        }))
                      }
                      placeholder="Ex: Mateus Kiala Ndombele"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cargo ou Área Profissional{' '}
                      {isFieldRequired('jobTitle') && <span className="text-red-600">*</span>}
                    </label>
                    <input
                      type="text"
                      value={data.personalInfo.jobTitle}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          personalInfo: { ...p.personalInfo, jobTitle: e.target.value },
                        }))
                      }
                      placeholder="Ex: Contabilista Sénior / Engenheiro Civil / Assistente Administrativo"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail {isFieldRequired('email') && <span className="text-red-600">*</span>}
                    </label>
                    <input
                      type="email"
                      value={data.personalInfo.email}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          personalInfo: { ...p.personalInfo, email: e.target.value },
                        }))
                      }
                      placeholder="nome@exemplo.ao"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Número de telefone{' '}
                      {isFieldRequired('phone') && <span className="text-red-600">*</span>}
                    </label>
                    <input
                      type="text"
                      value={data.personalInfo.phone}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          personalInfo: { ...p.personalInfo, phone: e.target.value },
                        }))
                      }
                      placeholder="+244 923 000 000"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      WhatsApp (opcional)
                    </label>
                    <input
                      type="text"
                      value={data.personalInfo.whatsapp}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          personalInfo: { ...p.personalInfo, whatsapp: e.target.value },
                        }))
                      }
                      placeholder="+244 923 000 000"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data de nascimento (opcional)
                    </label>
                    <input
                      type="text"
                      value={data.personalInfo.birthDate}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          personalInfo: { ...p.personalInfo, birthDate: e.target.value },
                        }))
                      }
                      placeholder="DD/MM/AAAA"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nacionalidade
                    </label>
                    <input
                      type="text"
                      value={data.personalInfo.nationality}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          personalInfo: { ...p.personalInfo, nationality: e.target.value },
                        }))
                      }
                      placeholder="Ex: Angolana"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cidade e país{' '}
                      {isFieldRequired('cityCountry') && <span className="text-red-600">*</span>}
                    </label>
                    <input
                      type="text"
                      value={data.personalInfo.cityCountry}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          personalInfo: { ...p.personalInfo, cityCountry: e.target.value },
                        }))
                      }
                      placeholder="Ex: Luanda, Angola"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Endereço / Bairro
                    </label>
                    <input
                      type="text"
                      value={data.personalInfo.address}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          personalInfo: { ...p.personalInfo, address: e.target.value },
                        }))
                      }
                      placeholder="Ex: Talatona, Via S8"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PROFESSIONAL PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-slate-900">Perfil Profissional</h2>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Resumo profissional
                  </label>
                  <textarea
                    rows={4}
                    value={data.profile.summary}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        profile: { ...p.profile, summary: e.target.value },
                      }))
                    }
                    placeholder="Descreva sucintamente a sua experiência, especialização e principais conquistas..."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Objetivos profissionais
                  </label>
                  <textarea
                    rows={3}
                    value={data.profile.objectives}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        profile: { ...p.profile, objectives: e.target.value },
                      }))
                    }
                    placeholder="Indique o que pretende alcançar na função ou organização..."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Principais competências em destaque (separadas por ponto ou vírgula)
                  </label>
                  <input
                    type="text"
                    value={data.profile.coreCompetencies}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        profile: { ...p.profile, coreCompetencies: e.target.value },
                      }))
                    }
                    placeholder="Ex: Gestão Financeira · Liderança de Equipas · Planeamento"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: EXPERIENCES */}
            {activeTab === 'experience' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Experiência Profissional</h2>
                  <button
                    type="button"
                    onClick={addExperience}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg"
                    style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar experiência</span>
                  </button>
                </div>

                {data.experiences.map((exp, idx) => (
                  <div
                    key={exp.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        Experiência #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExperience(exp.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        aria-label="Remover experiência"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Cargo ocupado
                        </label>
                        <input
                          type="text"
                          value={exp.role}
                          onChange={(e) => updateExperience(exp.id, { role: e.target.value })}
                          placeholder="Ex: Analista Administrativo"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Nome da empresa
                        </label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                          placeholder="Ex: Sonangol / Banco BAI / Empresa Lda."
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Data de início
                        </label>
                        <input
                          type="text"
                          value={exp.startDate}
                          onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                          placeholder="Ex: Mar 2021"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Data de término
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            disabled={exp.current}
                            value={exp.current ? 'Atual' : exp.endDate}
                            onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                            placeholder="Ex: Dez 2024"
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
                          />
                          <label className="flex items-center gap-1 text-xs text-slate-700 shrink-0">
                            <input
                              type="checkbox"
                              checked={exp.current}
                              onChange={(e) =>
                                updateExperience(exp.id, { current: e.target.checked })
                              }
                            />
                            Atual
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Descrição das responsabilidades
                      </label>
                      <textarea
                        rows={3}
                        value={exp.description}
                        onChange={(e) => updateExperience(exp.id, { description: e.target.value })}
                        placeholder="Descreva as suas principais responsabilidades e resultados..."
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 4: EDUCATION */}
            {activeTab === 'education' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Formação Académica</h2>
                  <button
                    type="button"
                    onClick={addEducation}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg"
                    style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar formação</span>
                  </button>
                </div>

                {data.educations.map((edu, idx) => (
                  <div
                    key={edu.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Formação #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeEducation(edu.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Instituição de Ensino
                        </label>
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
                          placeholder="Ex: Universidade Agostinho Neto / Universidade Católica de Angola"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Curso
                        </label>
                        <input
                          type="text"
                          value={edu.course}
                          onChange={(e) => updateEducation(edu.id, { course: e.target.value })}
                          placeholder="Ex: Engenharia Informática / Direito"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Nível académico
                        </label>
                        <select
                          value={edu.degreeLevel}
                          onChange={(e) => updateEducation(edu.id, { degreeLevel: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                        >
                          <option value="Ensino Médio / Técnico">Ensino Médio / Técnico</option>
                          <option value="Bacharelato">Bacharelato</option>
                          <option value="Licenciatura">Licenciatura</option>
                          <option value="Pós-Graduação">Pós-Graduação</option>
                          <option value="Mestrado">Mestrado</option>
                          <option value="Doutoramento">Doutoramento</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Ano de início
                        </label>
                        <input
                          type="text"
                          value={edu.startYear}
                          onChange={(e) => updateEducation(edu.id, { startYear: e.target.value })}
                          placeholder="Ex: 2018"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Ano de conclusão
                        </label>
                        <input
                          type="text"
                          value={edu.endYear}
                          onChange={(e) => updateEducation(edu.id, { endYear: e.target.value })}
                          placeholder="Ex: 2022 ou Em curso"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 5: SKILLS & LANGUAGES */}
            {activeTab === 'skills' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900 mb-3">Competências</h2>

                  {/* Technical Skills */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Competências técnicas
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={techInput}
                        onChange={(e) => setTechInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTagItem(techInput, setTechInput, (val) =>
                              setData((p) => ({
                                ...p,
                                skills: { ...p.skills, technical: [...p.skills.technical, val] },
                              }))
                            );
                          }
                        }}
                        placeholder="Ex: Contabilidade Geral, Gestão de Stock..."
                        className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          addTagItem(techInput, setTechInput, (val) =>
                            setData((p) => ({
                              ...p,
                              skills: { ...p.skills, technical: [...p.skills.technical, val] },
                            }))
                          )
                        }
                        className="px-3.5 py-2 text-xs font-semibold text-white rounded-lg"
                        style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                      >
                        Adicionar
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {data.skills.technical.map((sk, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 text-slate-800 rounded-md"
                        >
                          {sk}
                          <button
                            type="button"
                            onClick={() =>
                              setData((p) => ({
                                ...p,
                                skills: {
                                  ...p.skills,
                                  technical: p.skills.technical.filter((_, i) => i !== idx),
                                },
                              }))
                            }
                            className="text-slate-400 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Informatics */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Informática & Software
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={infoInput}
                        onChange={(e) => setInfoInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTagItem(infoInput, setInfoInput, (val) =>
                              setData((p) => ({
                                ...p,
                                skills: { ...p.skills, informatics: [...p.skills.informatics, val] },
                              }))
                            );
                          }
                        }}
                        placeholder="Ex: Word, Excel Avançado, Primavera ERP..."
                        className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          addTagItem(infoInput, setInfoInput, (val) =>
                            setData((p) => ({
                              ...p,
                              skills: { ...p.skills, informatics: [...p.skills.informatics, val] },
                            }))
                          )
                        }
                        className="px-3.5 py-2 text-xs font-semibold text-white rounded-lg"
                        style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                      >
                        Adicionar
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {data.skills.informatics.map((sk, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 text-slate-800 rounded-md"
                        >
                          {sk}
                          <button
                            type="button"
                            onClick={() =>
                              setData((p) => ({
                                ...p,
                                skills: {
                                  ...p.skills,
                                  informatics: p.skills.informatics.filter((_, i) => i !== idx),
                                },
                              }))
                            }
                            className="text-slate-400 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Personal Skills */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Competências pessoais
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={persInput}
                        onChange={(e) => setPersInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTagItem(persInput, setPersInput, (val) =>
                              setData((p) => ({
                                ...p,
                                skills: { ...p.skills, personal: [...p.skills.personal, val] },
                              }))
                            );
                          }
                        }}
                        placeholder="Ex: Proatividade, Organização, Assiduidade..."
                        className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          addTagItem(persInput, setPersInput, (val) =>
                            setData((p) => ({
                              ...p,
                              skills: { ...p.skills, personal: [...p.skills.personal, val] },
                            }))
                          )
                        }
                        className="px-3.5 py-2 text-xs font-semibold text-white rounded-lg"
                        style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                      >
                        Adicionar
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {data.skills.personal.map((sk, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 text-slate-800 rounded-md"
                        >
                          {sk}
                          <button
                            type="button"
                            onClick={() =>
                              setData((p) => ({
                                ...p,
                                skills: {
                                  ...p.skills,
                                  personal: p.skills.personal.filter((_, i) => i !== idx),
                                },
                              }))
                            }
                            className="text-slate-400 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Communication, Leadership, Teamwork */}
                  <div className="grid grid-cols-1 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Comunicação
                      </label>
                      <input
                        type="text"
                        value={data.skills.communication}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            skills: { ...p.skills, communication: e.target.value },
                          }))
                        }
                        placeholder="Ex: Facilidade de expressão oral e escrita em contexto corporativo"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Liderança
                      </label>
                      <input
                        type="text"
                        value={data.skills.leadership}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            skills: { ...p.skills, leadership: e.target.value },
                          }))
                        }
                        placeholder="Ex: Experiência na supervisão de equipas operacionais"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Trabalho em equipa
                      </label>
                      <input
                        type="text"
                        value={data.skills.teamwork}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            skills: { ...p.skills, teamwork: e.target.value },
                          }))
                        }
                        placeholder="Ex: Forte espírito de entreajuda e cooperação interdepartamental"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Languages */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900">Idiomas</h3>
                    <button
                      type="button"
                      onClick={addLanguage}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar idioma</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {data.languages.map((lang) => (
                      <div key={lang.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={lang.language}
                          onChange={(e) =>
                            setData((p) => ({
                              ...p,
                              languages: p.languages.map((l) =>
                                l.id === lang.id ? { ...l, language: e.target.value } : l
                              ),
                            }))
                          }
                          placeholder="Idioma (ex: Inglês, Francês, Umbundu)"
                          className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                        <select
                          value={lang.level}
                          onChange={(e) =>
                            setData((p) => ({
                              ...p,
                              languages: p.languages.map((l) =>
                                l.id === lang.id
                                  ? { ...l, level: e.target.value as LanguageItem['level'] }
                                  : l
                              ),
                            }))
                          }
                          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="Básico">Básico</option>
                          <option value="Intermédio">Intermédio</option>
                          <option value="Avançado">Avançado</option>
                          <option value="Fluente">Fluente</option>
                          <option value="Nativo">Nativo</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setData((p) => ({
                              ...p,
                              languages: p.languages.filter((l) => l.id !== lang.id),
                            }))
                          }
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: ADDITIONAL INFO */}
            {activeTab === 'additional' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-slate-900">Informações Adicionais</h2>

                {/* Certificates */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Certificados
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={certInput}
                      onChange={(e) => setCertInput(e.target.value)}
                      placeholder="Ex: Certificado de Pedagogia / HSE Nível 2"
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        addTagItem(certInput, setCertInput, (val) =>
                          setData((p) => ({
                            ...p,
                            additionalInfo: {
                              ...p.additionalInfo,
                              certificates: [...p.additionalInfo.certificates, val],
                            },
                          }))
                        )
                      }
                      className="px-3.5 py-2 text-xs font-semibold text-white rounded-lg"
                      style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {data.additionalInfo.certificates.map((c, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 rounded-md"
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() =>
                            setData((p) => ({
                              ...p,
                              additionalInfo: {
                                ...p.additionalInfo,
                                certificates: p.additionalInfo.certificates.filter(
                                  (_, i) => i !== idx
                                ),
                              },
                            }))
                          }
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Professional Courses */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cursos profissionais
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={courseInput}
                      onChange={(e) => setCourseInput(e.target.value)}
                      placeholder="Ex: Contabilidade Informatizada — INEFOP"
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        addTagItem(courseInput, setCourseInput, (val) =>
                          setData((p) => ({
                            ...p,
                            additionalInfo: {
                              ...p.additionalInfo,
                              professionalCourses: [...p.additionalInfo.professionalCourses, val],
                            },
                          }))
                        )
                      }
                      className="px-3.5 py-2 text-xs font-semibold text-white rounded-lg"
                      style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {data.additionalInfo.professionalCourses.map((c, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 rounded-md"
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() =>
                            setData((p) => ({
                              ...p,
                              additionalInfo: {
                                ...p.additionalInfo,
                                professionalCourses: p.additionalInfo.professionalCourses.filter(
                                  (_, i) => i !== idx
                                ),
                              },
                            }))
                          }
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Projects */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Projetos realizados
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={projInput}
                      onChange={(e) => setProjInput(e.target.value)}
                      placeholder="Ex: Implementação de Sistema de Arquivo Digital"
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        addTagItem(projInput, setProjInput, (val) =>
                          setData((p) => ({
                            ...p,
                            additionalInfo: {
                              ...p.additionalInfo,
                              projects: [...p.additionalInfo.projects, val],
                            },
                          }))
                        )
                      }
                      className="px-3.5 py-2 text-xs font-semibold text-white rounded-lg"
                      style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {data.additionalInfo.projects.map((c, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 rounded-md"
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() =>
                            setData((p) => ({
                              ...p,
                              additionalInfo: {
                                ...p.additionalInfo,
                                projects: p.additionalInfo.projects.filter((_, i) => i !== idx),
                              },
                            }))
                          }
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* References */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Referências profissionais
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={refInput}
                      onChange={(e) => setRefInput(e.target.value)}
                      placeholder="Ex: Dr. António Silva — Diretor Geral (+244 ...)"
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        addTagItem(refInput, setRefInput, (val) =>
                          setData((p) => ({
                            ...p,
                            additionalInfo: {
                              ...p.additionalInfo,
                              references: [...p.additionalInfo.references, val],
                            },
                          }))
                        )
                      }
                      className="px-3.5 py-2 text-xs font-semibold text-white rounded-lg"
                      style={{ backgroundColor: settings.primaryColor || '#0B192C' }}
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {data.additionalInfo.references.map((c, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 rounded-md"
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() =>
                            setData((p) => ({
                              ...p,
                              additionalInfo: {
                                ...p.additionalInfo,
                                references: p.additionalInfo.references.filter((_, i) => i !== idx),
                              },
                            }))
                          }
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Carta de condução
                  </label>
                  <input
                    type="text"
                    value={data.additionalInfo.drivingLicense}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        additionalInfo: { ...p.additionalInfo, drivingLicense: e.target.value },
                      }))
                    }
                    placeholder="Ex: Categoria B / C1"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Outras informações relevantes
                  </label>
                  <textarea
                    rows={3}
                    value={data.additionalInfo.otherInfo}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        additionalInfo: { ...p.additionalInfo, otherInfo: e.target.value },
                      }))
                    }
                    placeholder="Disponibilidade imediata, trabalho por turnos, voluntariado..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* TAB 7: VISUAL DESIGN & SECTION ORDER */}
            {activeTab === 'design' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900 mb-1">
                    Personalização Visual do Modelo
                  </h2>
                  <p className="text-xs text-slate-500">
                    Modelo ativo: <strong>{template.name}</strong> ({template.category})
                  </p>
                </div>

                {/* Switch between templates (locked Premium ones trigger payment modal!) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mudar de modelo (Modelos Premium requerem pagamento e desbloqueio)
                  </label>
                  <select
                    value={template.id}
                    onChange={(e) => {
                      const nextTpl = activeSelectableTemplates.find(
                        (item) => item.id === e.target.value
                      );
                      if (!nextTpl) return;
                      if (nextTpl.tier === 'premium' && !isTemplateUnlocked(nextTpl)) {
                        onSelectDifferentTemplate(nextTpl);
                        return;
                      }
                      setData((prev) => ({
                        ...prev,
                        customStyle: {
                          primaryColor: nextTpl.primaryColor,
                          accentColor: nextTpl.accentColor,
                          fontFamily: nextTpl.defaultFont,
                          photoShape: nextTpl.photoShape,
                        },
                      }));
                      onSelectDifferentTemplate(nextTpl);
                    }}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {activeSelectableTemplates.map((item) => {
                      const unlockedItem = isTemplateUnlocked(item);
                      return (
                        <option key={item.id} value={item.id}>
                          {item.tier === 'free'
                            ? `Gratuito: ${item.name}`
                            : unlockedItem
                            ? `Premium Desbloqueado: ${item.name}`
                            : `[Bloqueado · ${formatCurrency(item.price, settings.currency)}] ${item.name}`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Allowed Colors */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Cores institucionais permitidas neste modelo
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    {template.allowedColors.map((col) => {
                      const selected = data.customStyle.primaryColor === col;
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() =>
                            setData((p) => ({
                              ...p,
                              customStyle: { ...p.customStyle, primaryColor: col },
                            }))
                          }
                          className={`w-9 h-9 rounded-full border-2 transition-transform ${
                            selected ? 'scale-110 border-amber-500 ring-2 ring-amber-200' : 'border-white shadow-xs'
                          }`}
                          style={{ backgroundColor: col }}
                          aria-label={`Selecionar cor ${col}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Cor secundária / detalhe
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    {['#C59B27', '#0284C7', '#0D9488', '#D97706', '#475569', '#B45309'].map(
                      (acc) => (
                        <button
                          key={acc}
                          type="button"
                          onClick={() =>
                            setData((p) => ({
                              ...p,
                              customStyle: { ...p.customStyle, accentColor: acc },
                            }))
                          }
                          className={`w-7 h-7 rounded-full border-2 ${
                            data.customStyle.accentColor === acc
                              ? 'scale-110 border-slate-900'
                              : 'border-slate-200'
                          }`}
                          style={{ backgroundColor: acc }}
                          aria-label={`Selecionar destaque ${acc}`}
                        />
                      )
                    )}
                  </div>
                </div>

                {/* Allowed Fonts */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tipo de letra
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {template.allowedFonts.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() =>
                          setData((p) => ({
                            ...p,
                            customStyle: { ...p.customStyle, fontFamily: f },
                          }))
                        }
                        className={`px-3 py-2 text-xs font-medium rounded-lg border text-left ${
                          data.customStyle.fontFamily === f
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {FONT_LABELS[f]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photo Frame Shape */}
                {template.showPhoto && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Enquadramento da fotografia
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { id: 'circle', label: 'Circular' },
                          { id: 'rounded', label: 'Cantos suaves' },
                          { id: 'square', label: 'Quadrada executiva' },
                          { id: 'none', label: 'Ocultar foto' },
                        ] as { id: PhotoShape; label: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setData((p) => ({
                              ...p,
                              customStyle: { ...p.customStyle, photoShape: opt.id },
                            }))
                          }
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                            data.customStyle.photoShape === opt.id
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 text-slate-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reorder & Show/Hide Sections */}
                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    Organizar e Ativar Secções do Currículo
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Altere a ordem em que cada secção aparece ou desative as que não pretende exibir.
                  </p>

                  <div className="space-y-2">
                    {data.sectionOrder.map((secKey, idx) => {
                      const visible = data.visibleSections[secKey] !== false;
                      return (
                        <div
                          key={secKey}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                        >
                          <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={visible}
                              onChange={() => toggleSectionVisibility(secKey)}
                            />
                            <span className={!visible ? 'line-through text-slate-400' : ''}>
                              {SECTION_LABELS[secKey]}
                            </span>
                          </label>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveSection(idx, -1)}
                              className="p-1 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30"
                              aria-label="Mover secção para cima"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === data.sectionOrder.length - 1}
                              onClick={() => moveSection(idx, 1)}
                              className="p-1 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30"
                              aria-label="Mover secção para baixo"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Real-Time A4 Preview */}
        <div
          className={`lg:col-span-6 xl:col-span-6 ${
            mobilePane === 'form' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="sticky top-20">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <FileCheck2 className="w-4 h-4 text-emerald-700" />
                <span>Pré-visualização em Tempo Real · Formato A4 (210 × 297 mm)</span>
              </div>
              <button
                type="button"
                onClick={handleNativePrint}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir A4</span>
              </button>
            </div>

            <div className="bg-slate-300/70 p-3 sm:p-5 rounded-xl border border-slate-300 shadow-inner">
              <div className="shadow-xl mx-auto">
                <ScaledA4Preview template={template} data={data} texts={texts} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Offscreen Unscaled 794px A4 Sheet for High-Resolution PDF Export & Native Print */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none print-only-a4">
        <div ref={pdfTargetRef}>
          <ResumeRenderer template={template} data={data} texts={texts} />
        </div>
      </div>

      {/* Fullscreen A4 Final Inspection Modal */}
      {fullPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 no-print">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[94vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Pré-visualização Final A4 — {docTitle}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={exporting}
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 rounded-lg"
                  style={{ backgroundColor: settings.accentColor || '#C59B27' }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{exporting ? 'A gerar PDF...' : 'Descarregar PDF A4'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFullPreviewOpen(false)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-200 p-4 sm:p-8">
              <div className="max-w-[740px] mx-auto shadow-xl">
                <ScaledA4Preview template={template} data={data} texts={texts} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
