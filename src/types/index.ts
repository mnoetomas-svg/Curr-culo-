export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  whatsapp?: string;
  city?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
}

export type TemplateTier = 'free' | 'premium';

export type TemplateLayoutType =
  | 'classic-serif'
  | 'modern-clean'
  | 'minimal-editorial'
  | 'academic-formal'
  | 'sidebar-left'
  | 'sidebar-right'
  | 'executive-imperial'
  | 'corporate-split'
  | 'graphic-modern'
  | 'international-grid';

export type TemplateFontFamily = 'sans' | 'serif' | 'editorial';
export type SkillDisplayStyle = 'list' | 'bars' | 'grid' | 'inline';
export type PhotoShape = 'circle' | 'rounded' | 'square' | 'none';

export interface ResumeTemplate {
  id: string;
  name: string;
  slug: string;
  category: string;
  tier: TemplateTier;
  description: string;
  price: number;
  active: boolean;
  layoutType: TemplateLayoutType;
  primaryColor: string;
  accentColor: string;
  allowedColors: string[];
  defaultFont: TemplateFontFamily;
  allowedFonts: TemplateFontFamily[];
  showPhoto: boolean;
  photoShape: PhotoShape;
  skillStyle: SkillDisplayStyle;
  sampleGender?: 'male' | 'female';
  previewImageUrl?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ResumeSectionKey =
  | 'profile'
  | 'experiences'
  | 'educations'
  | 'skills'
  | 'languages'
  | 'additional';

export interface PersonalInfo {
  fullName: string;
  jobTitle: string;
  photoUrl: string;
  birthDate: string;
  nationality: string;
  address: string;
  cityCountry: string;
  phone: string;
  whatsapp: string;
  email: string;
}

export interface ProfessionalProfile {
  summary: string;
  objectives: string;
  coreCompetencies: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface EducationItem {
  id: string;
  institution: string;
  course: string;
  degreeLevel: string;
  startYear: string;
  endYear: string;
}

export interface SkillsData {
  technical: string[];
  personal: string[];
  informatics: string[];
  communication: string;
  leadership: string;
  teamwork: string;
}

export interface LanguageItem {
  id: string;
  language: string;
  level: 'Básico' | 'Intermédio' | 'Avançado' | 'Fluente' | 'Nativo';
}

export interface AdditionalInfoData {
  certificates: string[];
  professionalCourses: string[];
  drivingLicense: string;
  references: string[];
  projects: string[];
  otherInfo: string;
}

export interface ResumeCustomStyle {
  primaryColor: string;
  accentColor: string;
  fontFamily: TemplateFontFamily;
  photoShape: PhotoShape;
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  profile: ProfessionalProfile;
  experiences: ExperienceItem[];
  educations: EducationItem[];
  skills: SkillsData;
  languages: LanguageItem[];
  additionalInfo: AdditionalInfoData;
  sectionOrder: ResumeSectionKey[];
  visibleSections: Record<ResumeSectionKey, boolean>;
  customStyle: ResumeCustomStyle;
}

export interface ResumeDocument {
  id: string;
  userId: string;
  templateId: string;
  title: string;
  data: ResumeData;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userWhatsapp?: string;
  templateId: string;
  templateName: string;
  originalAmount: number;
  amount: number;
  currency: string;
  promoCode?: string;
  status: PaymentStatus;
  adminNotes?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface TemplateUnlock {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  templateId: string;
  templateName: string;
  paymentRequestId?: string;
  active: boolean;
  grantedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Promotion {
  id: string;
  code: string;
  title: string;
  discountPercent: number;
  appliesToTemplateId: string; // 'all' or specific templateId
  active: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId?: string;
  userName: string;
  userEmail: string;
  resumeId?: string;
  type: 'support' | 'report' | 'contact';
  subject: string;
  message: string;
  status: 'open' | 'resolved';
  adminReply?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface SiteSettings {
  platformName: string;
  logoText: string;
  logoImageUrl: string;
  primaryColor: string;
  accentColor: string;
  whatsappNumber: string;
  contactEmail: string;
  contactAddress: string;
  currency: 'AOA' | 'EUR' | 'USD' | 'BRL' | 'MZN';
  defaultLanguage: string;
  defaultPremiumPrice: number;
  whatsappMessageTemplate: string;
  categoriesFree: string[];
  categoriesPremium: string[];
  requiredFields: ('fullName' | 'email' | 'phone' | 'cityCountry' | 'jobTitle')[];
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowRegistration: boolean;
  allowGuestEditor: boolean;
  enablePromotions: boolean;
  pdfQualityScale: number;
  socialLinks: {
    linkedin: string;
    instagram: string;
    facebook: string;
  };
}

export interface SiteTextEntry {
  key: string;
  section: string;
  label: string;
  value: string;
  multiline?: boolean;
}
