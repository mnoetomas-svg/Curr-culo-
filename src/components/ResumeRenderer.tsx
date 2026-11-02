import React, { useEffect, useRef, useState } from 'react';
import { Mail, MapPin, Phone, Calendar, Flag, MessageCircle, Award, Car, Briefcase } from 'lucide-react';
import { MEDIA_ASSETS } from '../assets/media';
import type {
  ResumeData,
  ResumeSectionKey,
  ResumeTemplate,
  LanguageItem,
} from '../types';

interface ResumeRendererProps {
  template: ResumeTemplate;
  data: ResumeData;
  texts?: Record<string, string>;
  useSamplePhotoFallback?: boolean;
}

const LEVEL_PERCENT: Record<LanguageItem['level'], number> = {
  Básico: 35,
  Intermédio: 60,
  Avançado: 82,
  Fluente: 94,
  Nativo: 100,
};

function getFontClass(font: string): string {
  if (font === 'serif') return 'Georgia, "Times New Roman", serif';
  if (font === 'editorial') return '"Playfair Display", Georgia, serif';
  return '"Plus Jakarta Sans", -apple-system, sans-serif';
}

export const ResumeRenderer: React.FC<ResumeRendererProps> = ({
  template,
  data,
  texts = {},
  useSamplePhotoFallback = false,
}) => {
  const primary = data.customStyle?.primaryColor || template.primaryColor || '#0B192C';
  const accent = data.customStyle?.accentColor || template.accentColor || '#C59B27';
  const fontChoice = data.customStyle?.fontFamily || template.defaultFont || 'sans';
  const photoShape = data.customStyle?.photoShape || template.photoShape || 'none';

  const headingFont = getFontClass(fontChoice);
  const bodyFont = fontChoice === 'serif' ? 'Georgia, serif' : '"Plus Jakarta Sans", sans-serif';

  const labelProfile = texts['editor.cvSectionProfile'] || 'Perfil Profissional';
  const labelObjectives = texts['editor.cvSectionObjectives'] || 'Objetivos Profissionais';
  const labelExp = texts['editor.cvSectionExperience'] || 'Experiência Profissional';
  const labelEdu = texts['editor.cvSectionEducation'] || 'Formação Académica';
  const labelSkills = texts['editor.cvSectionSkills'] || 'Competências';
  const labelLangs = texts['editor.cvSectionLanguages'] || 'Idiomas';
  const labelAdd = texts['editor.cvSectionAdditional'] || 'Informações Adicionais';
  const labelContact = texts['editor.cvContactHeading'] || 'Contacto & Dados';

  const p = data.personalInfo;
  const resolvedPhoto =
    p.photoUrl ||
    (useSamplePhotoFallback && template.showPhoto
      ? template.sampleGender === 'female'
        ? MEDIA_ASSETS.avatarFemale
        : MEDIA_ASSETS.avatarMale
      : '');

  const showPhoto = template.showPhoto && photoShape !== 'none' && Boolean(resolvedPhoto);

  const photoRadiusClass =
    photoShape === 'circle'
      ? 'rounded-full'
      : photoShape === 'rounded'
      ? 'rounded-xl'
      : 'rounded-none';

  const activeOrder: ResumeSectionKey[] =
    Array.isArray(data.sectionOrder) && data.sectionOrder.length > 0
      ? data.sectionOrder.filter((k) => data.visibleSections?.[k] !== false)
      : ['profile', 'experiences', 'educations', 'skills', 'languages', 'additional'];

  const allSkills = [
    ...(data.skills.technical || []),
    ...(data.skills.informatics || []),
    ...(data.skills.personal || []),
  ].filter(Boolean);

  const softDescriptions = [
    data.skills.communication ? { label: 'Comunicação', text: data.skills.communication } : null,
    data.skills.leadership ? { label: 'Liderança', text: data.skills.leadership } : null,
    data.skills.teamwork ? { label: 'Trabalho em Equipa', text: data.skills.teamwork } : null,
  ].filter(Boolean) as { label: string; text: string }[];

  const validExperiences = (data.experiences || []).filter(
    (e) => e.company.trim() || e.role.trim() || e.description.trim()
  );
  const validEducations = (data.educations || []).filter(
    (e) => e.institution.trim() || e.course.trim()
  );
  const validLanguages = (data.languages || []).filter((l) => l.language.trim());

  const hasAdditional =
    (data.additionalInfo.certificates?.length || 0) > 0 ||
    (data.additionalInfo.professionalCourses?.length || 0) > 0 ||
    Boolean(data.additionalInfo.drivingLicense?.trim()) ||
    (data.additionalInfo.projects?.length || 0) > 0 ||
    (data.additionalInfo.references?.length || 0) > 0 ||
    Boolean(data.additionalInfo.otherInfo?.trim());

  const renderPhoto = (sizePx = 96, borderColor = accent) => {
    if (!showPhoto) return null;
    return (
      <div
        className={`overflow-hidden shrink-0 ${photoRadiusClass}`}
        style={{
          width: `${sizePx}px`,
          height: `${sizePx}px`,
          border: `2.5px solid ${borderColor}`,
        }}
      >
        <img
          src={resolvedPhoto}
          alt={p.fullName || 'Fotografia'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-top"
        />
      </div>
    );
  };

  // Shared section renderers for main body vs dark/light sidebar
  const renderSection = (key: ResumeSectionKey, onDark = false) => {
    const headingColor = onDark ? '#FFFFFF' : primary;
    const subTextColor = onDark ? 'rgba(255,255,255,0.78)' : '#334155';
    const mutedColor = onDark ? 'rgba(255,255,255,0.6)' : '#64748B';
    const ruleColor = onDark ? 'rgba(255,255,255,0.18)' : '#E2E8F0';
    const isPremium = template.tier === 'premium';

    const SectionTitle = ({ title }: { title: string }) => (
      <div className="mb-2.5">
        <div className="flex items-center gap-2.5">
          {isPremium && (
            <span
              className="inline-block w-2 h-2 shrink-0"
              style={{ backgroundColor: accent }}
            />
          )}
          <h3
            className="text-[12.5px] font-bold tracking-[0.12em] uppercase"
            style={{ color: headingColor, fontFamily: headingFont }}
          >
            {title}
          </h3>
        </div>
        <div
          className="mt-1 h-[1.5px] w-full"
          style={{
            background: isPremium
              ? `linear-gradient(90deg, ${accent} 0%, ${ruleColor} 45%, transparent 100%)`
              : ruleColor,
          }}
        />
      </div>
    );

    if (key === 'profile') {
      if (!data.profile.summary?.trim() && !data.profile.objectives?.trim() && !data.profile.coreCompetencies?.trim()) {
        return null;
      }
      return (
        <section key="profile" className="mb-5">
          {data.profile.summary?.trim() && (
            <div className="mb-3">
              <SectionTitle title={labelProfile} />
              <p className="text-[11.5px] leading-[1.6] text-justify" style={{ color: subTextColor }}>
                {data.profile.summary}
              </p>
            </div>
          )}
          {data.profile.objectives?.trim() && (
            <div className="mb-2.5">
              <h4
                className="text-[10.5px] font-semibold uppercase tracking-wider mb-1"
                style={{ color: onDark ? accent : primary }}
              >
                {labelObjectives}
              </h4>
              <p className="text-[11px] leading-[1.55]" style={{ color: subTextColor }}>
                {data.profile.objectives}
              </p>
            </div>
          )}
          {data.profile.coreCompetencies?.trim() && (
            <p className="text-[10.5px] font-medium pt-1" style={{ color: onDark ? '#FDE68A' : accent }}>
              {data.profile.coreCompetencies}
            </p>
          )}
        </section>
      );
    }

    if (key === 'experiences') {
      if (validExperiences.length === 0) return null;
      return (
        <section key="experiences" className="mb-5">
          <SectionTitle title={labelExp} />
          <div className="space-y-3.5">
            {validExperiences.map((exp) => (
              <div
                key={exp.id}
                className={isPremium && !onDark ? 'relative pl-3.5 border-l border-slate-200' : ''}
              >
                {isPremium && !onDark && (
                  <span
                    className="absolute -left-[4px] top-1.5 w-[7px] h-[7px] rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                )}
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-[12px] font-bold" style={{ color: headingColor }}>
                    {exp.role || 'Cargo'}
                  </h4>
                  <span className="text-[10.5px] font-medium shrink-0 tabular-nums" style={{ color: onDark ? accent : mutedColor }}>
                    {exp.startDate}
                    {exp.startDate || exp.endDate || exp.current ? ' — ' : ''}
                    {exp.current ? 'Atual' : exp.endDate}
                  </span>
                </div>
                {exp.company && (
                  <div
                    className="text-[11px] font-semibold mb-1"
                    style={{ color: onDark ? 'rgba(255,255,255,0.85)' : accent }}
                  >
                    {exp.company}
                  </div>
                )}
                {exp.description && (
                  <p className="text-[11px] leading-[1.55] whitespace-pre-line" style={{ color: subTextColor }}>
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (key === 'educations') {
      if (validEducations.length === 0) return null;
      return (
        <section key="educations" className="mb-5">
          <SectionTitle title={labelEdu} />
          <div className="space-y-2.5">
            {validEducations.map((edu) => (
              <div key={edu.id} className="flex items-baseline justify-between gap-3">
                <div>
                  <h4 className="text-[11.5px] font-bold" style={{ color: headingColor }}>
                    {edu.degreeLevel ? `${edu.degreeLevel} em ` : ''}
                    {edu.course}
                  </h4>
                  <div className="text-[11px]" style={{ color: subTextColor }}>
                    {edu.institution}
                  </div>
                </div>
                <span className="text-[10.5px] font-medium shrink-0 tabular-nums" style={{ color: mutedColor }}>
                  {edu.startYear}
                  {edu.startYear && edu.endYear ? ' – ' : ''}
                  {edu.endYear}
                </span>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (key === 'skills') {
      if (allSkills.length === 0 && softDescriptions.length === 0) return null;
      return (
        <section key="skills" className="mb-5">
          <SectionTitle title={labelSkills} />
          {allSkills.length > 0 && (
            <>
              {template.skillStyle === 'bars' ? (
                <div className={onDark ? 'space-y-2' : 'grid grid-cols-2 gap-x-5 gap-y-2'}>
                  {allSkills.slice(0, 10).map((sk, idx) => {
                    const pct = 92 - (idx % 4) * 6;
                    return (
                      <div key={`${sk}-${idx}`}>
                        <div className="flex justify-between text-[10.5px] mb-0.5" style={{ color: subTextColor }}>
                          <span className="font-medium truncate">{sk}</span>
                        </div>
                        <div
                          className="h-1.5 w-full rounded-full overflow-hidden"
                          style={{ backgroundColor: onDark ? 'rgba(255,255,255,0.16)' : '#E2E8F0' }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: accent }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : template.skillStyle === 'grid' ? (
                <div className={onDark ? 'space-y-1' : 'grid grid-cols-2 gap-x-4 gap-y-1.5'}>
                  {allSkills.map((sk, idx) => (
                    <div key={`${sk}-${idx}`} className="flex items-center gap-1.5 text-[11px]" style={{ color: subTextColor }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                      <span>{sk}</span>
                    </div>
                  ))}
                </div>
              ) : template.skillStyle === 'inline' ? (
                <p className="text-[11px] leading-[1.6]" style={{ color: subTextColor }}>
                  {allSkills.join('  ·  ')}
                </p>
              ) : (
                <ul className="space-y-1">
                  {allSkills.map((sk, idx) => (
                    <li key={`${sk}-${idx}`} className="text-[11px] flex items-center gap-1.5" style={{ color: subTextColor }}>
                      <span style={{ color: accent }}>▪</span>
                      <span>{sk}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {softDescriptions.length > 0 && (
            <div className="mt-2.5 space-y-1">
              {softDescriptions.map((item) => (
                <p key={item.label} className="text-[10.5px] leading-[1.45]" style={{ color: subTextColor }}>
                  <strong style={{ color: headingColor }}>{item.label}:</strong> {item.text}
                </p>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (key === 'languages') {
      if (validLanguages.length === 0) return null;
      return (
        <section key="languages" className="mb-5">
          <SectionTitle title={labelLangs} />
          <div className={onDark ? 'space-y-2' : 'grid grid-cols-2 gap-x-6 gap-y-2'}>
            {validLanguages.map((lang) => (
              <div key={lang.id}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold" style={{ color: headingColor }}>
                    {lang.language}
                  </span>
                  <span className="text-[10px]" style={{ color: onDark ? accent : mutedColor }}>
                    {lang.level}
                  </span>
                </div>
                {template.tier === 'premium' && (
                  <div
                    className="mt-1 h-1 w-full rounded-full overflow-hidden"
                    style={{ backgroundColor: onDark ? 'rgba(255,255,255,0.16)' : '#E2E8F0' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${LEVEL_PERCENT[lang.level] || 75}%`,
                        backgroundColor: accent,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (key === 'additional') {
      if (!hasAdditional) return null;
      const add = data.additionalInfo;
      return (
        <section key="additional" className="mb-4">
          <SectionTitle title={labelAdd} />
          <div className="space-y-1.5 text-[11px]" style={{ color: subTextColor }}>
            {add.certificates?.length > 0 && (
              <div>
                <strong style={{ color: headingColor }}>Certificados: </strong>
                {add.certificates.join(' · ')}
              </div>
            )}
            {add.professionalCourses?.length > 0 && (
              <div>
                <strong style={{ color: headingColor }}>Cursos Profissionais: </strong>
                {add.professionalCourses.join(' · ')}
              </div>
            )}
            {add.projects?.length > 0 && (
              <div>
                <strong style={{ color: headingColor }}>Projetos Relevantes: </strong>
                {add.projects.join(' · ')}
              </div>
            )}
            {add.drivingLicense?.trim() && (
              <div className="flex items-center gap-1.5">
                <Car className="w-3 h-3 shrink-0" style={{ color: accent }} />
                <span>
                  <strong style={{ color: headingColor }}>Carta de Condução: </strong>
                  {add.drivingLicense}
                </span>
              </div>
            )}
            {add.references?.length > 0 && (
              <div>
                <strong style={{ color: headingColor }}>Referências: </strong>
                {add.references.join(' · ')}
              </div>
            )}
            {add.otherInfo?.trim() && <p className="pt-0.5">{add.otherInfo}</p>}
          </div>
        </section>
      );
    }

    return null;
  };

  const renderContactStack = (onDark = false) => {
    const textColor = onDark ? 'rgba(255,255,255,0.86)' : '#334155';
    const iconColor = accent;
    const items = [
      p.phone ? { icon: Phone, text: p.phone } : null,
      p.whatsapp && p.whatsapp !== p.phone ? { icon: MessageCircle, text: `WhatsApp: ${p.whatsapp}` } : null,
      p.email ? { icon: Mail, text: p.email } : null,
      p.address || p.cityCountry
        ? { icon: MapPin, text: [p.address, p.cityCountry].filter(Boolean).join(', ') }
        : null,
      p.nationality ? { icon: Flag, text: `Nacionalidade: ${p.nationality}` } : null,
      p.birthDate ? { icon: Calendar, text: `Nascimento: ${p.birthDate}` } : null,
    ].filter(Boolean) as { icon: any; text: string }[];

    return (
      <div className="space-y-2">
        {items.map((it, i) => {
          const IconComp = it.icon;
          return (
            <div key={i} className="flex items-start gap-2 text-[10.8px] leading-snug" style={{ color: textColor }}>
              <IconComp className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: iconColor }} />
              <span className="break-words">{it.text}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderInlineContacts = (lightText = false) => {
    const color = lightText ? 'rgba(255,255,255,0.88)' : '#475569';
    const parts = [
      p.phone,
      p.email,
      [p.address, p.cityCountry].filter(Boolean).join(', '),
      p.nationality ? `Nac.: ${p.nationality}` : '',
      p.birthDate ? `Nasc.: ${p.birthDate}` : '',
    ].filter(Boolean);

    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.8px]" style={{ color }}>
        {parts.map((part, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span style={{ color: accent }}>·</span>}
            <span>{part}</span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  // ============================================================================
  // LAYOUT FAMILIES (A4 Canvas: 794px x 1123px)
  // ============================================================================

  const sidebarKeys: ResumeSectionKey[] = ['skills', 'languages'];
  const sidebarOrder = activeOrder.filter((k) => sidebarKeys.includes(k));
  const mainColumnOrder = activeOrder.filter((k) => !sidebarKeys.includes(k));

  // 1. SIDEBAR LEFT OR RIGHT (Premium Two-Column Architectural)
  if (template.layoutType === 'sidebar-left' || template.layoutType === 'sidebar-right') {
    const isLeft = template.layoutType === 'sidebar-left';
    const SidebarBlock = (
      <aside
        className="w-[268px] shrink-0 p-8 flex flex-col justify-between text-white"
        style={{ backgroundColor: primary }}
      >
        <div>
          {showPhoto && <div className="mb-5 flex justify-center">{renderPhoto(116, accent)}</div>}
          <div className={showPhoto ? 'text-center mb-6' : 'mb-6'}>
            <h1
              className="text-[21px] font-bold leading-tight text-white"
              style={{ fontFamily: headingFont }}
            >
              {p.fullName || 'O Seu Nome Completo'}
            </h1>
            {p.jobTitle && (
              <p
                className="text-[11.5px] font-medium uppercase tracking-[0.1em] mt-1.5"
                style={{ color: accent }}
              >
                {p.jobTitle}
              </p>
            )}
          </div>

          <div className="mb-6">
            <h3
              className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2.5 pb-1 border-b border-white/20"
              style={{ color: accent }}
            >
              {labelContact}
            </h3>
            {renderContactStack(true)}
          </div>

          {sidebarOrder.map((k) => renderSection(k, true))}
        </div>

        <div className="pt-4 border-t border-white/10 text-[9.5px] text-white/50">
          Documento Profissional A4
        </div>
      </aside>
    );

    const MainBlock = (
      <main className="flex-1 bg-white p-9">
        <div
          className="h-1 w-16 mb-6"
          style={{ backgroundColor: accent }}
        />
        {mainColumnOrder.map((k) => renderSection(k, false))}
      </main>
    );

    return (
      <div
        className="w-[794px] min-h-[1123px] bg-white flex shadow-sm"
        style={{ fontFamily: bodyFont }}
      >
        {isLeft ? (
          <>
            {SidebarBlock}
            {MainBlock}
          </>
        ) : (
          <>
            {MainBlock}
            {SidebarBlock}
          </>
        )}
      </div>
    );
  }

  // 2. EXECUTIVE IMPERIAL (Dark Navy & Gold Top Architectural Header + Asymmetric 2-Col Body)
  if (template.layoutType === 'executive-imperial') {
    return (
      <div className="w-[794px] min-h-[1123px] bg-white flex flex-col" style={{ fontFamily: bodyFont }}>
        <header
          className="px-10 py-8 text-white relative"
          style={{ backgroundColor: primary, borderBottom: `4px solid ${accent}` }}
        >
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-1.5"
                style={{ color: accent }}
              >
                Curriculum Vitae Executivo
              </div>
              <h1
                className="text-[30px] font-bold tracking-tight leading-tight text-white"
                style={{ fontFamily: headingFont }}
              >
                {p.fullName || 'O Seu Nome Completo'}
              </h1>
              {p.jobTitle && (
                <p className="text-[13.5px] text-white/85 font-medium mt-1">{p.jobTitle}</p>
              )}
              <div className="mt-4 pt-3 border-t border-white/15">{renderInlineContacts(true)}</div>
            </div>
            {renderPhoto(110, accent)}
          </div>
        </header>

        <div className="flex-1 grid grid-cols-12 gap-7 px-10 py-8">
          <div className="col-span-8">{mainColumnOrder.map((k) => renderSection(k, false))}</div>
          <div className="col-span-4 bg-slate-50/90 p-5 border border-slate-200/80 h-fit">
            {sidebarOrder.map((k) => renderSection(k, false))}
            {p.whatsapp && (
              <div className="pt-3 border-t border-slate-200 text-[10.5px] text-slate-600">
                <strong style={{ color: primary }}>WhatsApp Direto:</strong> {p.whatsapp}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. CORPORATE SPLIT / GRAPHIC MODERN / INTERNATIONAL GRID (Premium Multi-Zone)
  if (
    template.layoutType === 'corporate-split' ||
    template.layoutType === 'graphic-modern' ||
    template.layoutType === 'international-grid'
  ) {
    const isGraphic = template.layoutType === 'graphic-modern';
    return (
      <div className="w-[794px] min-h-[1123px] bg-white flex flex-col" style={{ fontFamily: bodyFont }}>
        <div className="h-3 w-full" style={{ backgroundColor: primary }} />
        <header className="px-10 pt-7 pb-6 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-6">
            {renderPhoto(100, primary)}
            <div className="flex-1">
              <h1
                className="text-[28px] font-bold leading-tight"
                style={{ color: primary, fontFamily: headingFont }}
              >
                {p.fullName || 'O Seu Nome Completo'}
              </h1>
              {p.jobTitle && (
                <div
                  className="text-[13px] font-semibold uppercase tracking-[0.1em] mt-1"
                  style={{ color: accent }}
                >
                  {p.jobTitle}
                </div>
              )}
              <div className="mt-3">{renderInlineContacts(false)}</div>
            </div>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-12">
          <div
            className={`col-span-4 p-8 border-r border-slate-200 ${
              isGraphic ? 'bg-slate-900 text-white' : 'bg-slate-50/60'
            }`}
            style={isGraphic ? { backgroundColor: primary } : undefined}
          >
            <div className="mb-6">
              <h3
                className="text-[11.5px] font-bold uppercase tracking-[0.12em] mb-2.5"
                style={{ color: isGraphic ? accent : primary }}
              >
                {labelContact}
              </h3>
              {renderContactStack(isGraphic)}
            </div>
            {sidebarOrder.map((k) => renderSection(k, isGraphic))}
          </div>

          <div className="col-span-8 p-8">{mainColumnOrder.map((k) => renderSection(k, false))}</div>
        </div>
      </div>
    );
  }

  // 4. CLASSIC SERIF & ACADEMIC FORMAL (Clean Single-Column Traditional / Academic)
  if (template.layoutType === 'classic-serif' || template.layoutType === 'academic-formal') {
    const isCentered = template.slug === 'classico-institucional' || template.layoutType === 'classic-serif';
    return (
      <div className="w-[794px] min-h-[1123px] bg-white px-12 py-11" style={{ fontFamily: bodyFont }}>
        <header
          className={`pb-5 mb-6 border-b-2 ${
            isCentered && !showPhoto ? 'text-center' : 'flex items-center justify-between gap-6'
          }`}
          style={{ borderColor: primary }}
        >
          <div className={isCentered && !showPhoto ? 'mx-auto' : 'flex-1'}>
            <h1
              className="text-[28px] font-bold tracking-tight"
              style={{ color: primary, fontFamily: headingFont }}
            >
              {p.fullName || 'O Seu Nome Completo'}
            </h1>
            {p.jobTitle && (
              <p className="text-[13px] font-medium mt-1" style={{ color: accent }}>
                {p.jobTitle}
              </p>
            )}
            <div className={`mt-2.5 flex ${isCentered && !showPhoto ? 'justify-center' : ''}`}>
              {renderInlineContacts(false)}
            </div>
          </div>
          {renderPhoto(88, primary)}
        </header>

        <div>{activeOrder.map((k) => renderSection(k, false))}</div>
      </div>
    );
  }

  // 5. MODERN CLEAN & MINIMAL EDITORIAL (Default Free Crisp Contemporary Layouts)
  const isMinimal = template.layoutType === 'minimal-editorial';
  return (
    <div className="w-[794px] min-h-[1123px] bg-white px-11 py-10" style={{ fontFamily: bodyFont }}>
      <header className="flex items-center gap-6 pb-6 mb-6 border-b border-slate-200">
        {renderPhoto(90, accent)}
        <div className="flex-1">
          <h1
            className="text-[27px] font-bold tracking-tight"
            style={{ color: primary, fontFamily: headingFont }}
          >
            {p.fullName || 'O Seu Nome Completo'}
          </h1>
          {p.jobTitle && (
            <p
              className="text-[13px] font-semibold mt-0.5"
              style={{ color: isMinimal ? '#64748B' : accent }}
            >
              {p.jobTitle}
            </p>
          )}
          <div className="mt-2.5">{renderInlineContacts(false)}</div>
        </div>
      </header>

      <div>{activeOrder.map((k) => renderSection(k, false))}</div>
    </div>
  );
};

/**
 * Responsive container that scales the 794x1123 A4 sheet smoothly to fit any card or viewport width
 */
export const ScaledA4Preview: React.FC<{
  template: ResumeTemplate;
  data: ResumeData;
  texts?: Record<string, string>;
  useSamplePhotoFallback?: boolean;
  maxHeightPx?: number;
}> = ({ template, data, texts, useSamplePhotoFallback = false, maxHeightPx }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.35);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      if (width > 0) {
        setScale(width / 794);
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const computedHeight = Math.round(1123 * scale);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden relative bg-white select-none"
      style={{
        height: maxHeightPx ? `${Math.min(computedHeight, maxHeightPx)}px` : `${computedHeight}px`,
      }}
    >
      <div
        style={{
          width: '794px',
          minHeight: '1123px',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <ResumeRenderer
          template={template}
          data={data}
          texts={texts}
          useSamplePhotoFallback={useSamplePhotoFallback}
        />
      </div>
    </div>
  );
};
