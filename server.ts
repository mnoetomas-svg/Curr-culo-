import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SITE_SETTINGS, DEFAULT_TEMPLATES } from './src/data/defaultTemplates.ts';
import { DEFAULT_TEXT_ENTRIES, buildDefaultTextsMap } from './src/data/defaultTexts.ts';
import type {
  AuditLog,
  PaymentRequest,
  Promotion,
  ResumeDocument,
  ResumeTemplate,
  SiteSettings,
  SupportTicket,
  TemplateUnlock,
  User,
} from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'aurumcv-db.json');
const SECRET_PATH = path.join(DATA_DIR, '.server-secret');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function getOrCreateServerSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    return process.env.SESSION_SECRET;
  }
  if (fs.existsSync(SECRET_PATH)) {
    const existing = fs.readFileSync(SECRET_PATH, 'utf8').trim();
    if (existing.length >= 32) return existing;
  }
  const generated = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(SECRET_PATH, generated, { mode: 0o600 });
  return generated;
}

const SERVER_SECRET = getOrCreateServerSecret();

interface StoredUser extends User {
  passwordHash: string;
  passwordSalt: string;
  resetCodeHash?: string;
  resetCodeExpiresAt?: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  templates: ResumeTemplate[];
  resumes: ResumeDocument[];
  paymentRequests: PaymentRequest[];
  unlocks: TemplateUnlock[];
  promotions: Promotion[];
  supportTickets: SupportTicket[];
  auditLogs: AuditLog[];
  settings: SiteSettings;
  texts: Record<string, string>;
}

function createInitialDatabase(): DatabaseSchema {
  return {
    users: [],
    templates: structuredClone(DEFAULT_TEMPLATES),
    resumes: [],
    paymentRequests: [],
    unlocks: [],
    promotions: [
      {
        id: 'promo-lancamento',
        code: 'CARREIRA20',
        title: 'Promoção Carreira Profissional (-20%)',
        discountPercent: 20,
        appliesToTemplateId: 'all',
        active: true,
        createdAt: new Date().toISOString(),
      },
    ],
    supportTickets: [],
    auditLogs: [],
    settings: structuredClone(DEFAULT_SITE_SETTINGS),
    texts: buildDefaultTextsMap(),
  };
}

function loadDatabase(): DatabaseSchema {
  if (!fs.existsSync(DB_PATH)) {
    const initial = createInitialDatabase();
    saveDatabase(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    const defaults = createInitialDatabase();
    const mergedTexts = { ...defaults.texts, ...(parsed.texts || {}) };
    const mergedSettings: SiteSettings = {
      ...defaults.settings,
      ...(parsed.settings || {}),
      socialLinks: {
        ...defaults.settings.socialLinks,
        ...(parsed.settings?.socialLinks || {}),
      },
    };
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      templates: Array.isArray(parsed.templates) && parsed.templates.length > 0 ? parsed.templates : defaults.templates,
      resumes: Array.isArray(parsed.resumes) ? parsed.resumes : [],
      paymentRequests: Array.isArray(parsed.paymentRequests) ? parsed.paymentRequests : [],
      unlocks: Array.isArray(parsed.unlocks) ? parsed.unlocks : [],
      promotions: Array.isArray(parsed.promotions) ? parsed.promotions : defaults.promotions,
      supportTickets: Array.isArray(parsed.supportTickets) ? parsed.supportTickets : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      settings: mergedSettings,
      texts: mergedTexts,
    };
  } catch (err) {
    console.error('Error loading database, initializing clean state:', err);
    return createInitialDatabase();
  }
}

let db: DatabaseSchema = loadDatabase();

function saveDatabase(state: DatabaseSchema = db): void {
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_PATH);
}

// ============================================================================
// CRYPTO & AUTH HELPERS
// ============================================================================

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { hash: derived, salt: usedSalt };
}

function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  const { hash } = hashPassword(password, storedSalt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

interface TokenPayload {
  sub: string;
  role: 'user' | 'admin';
  exp: number;
}

function signToken(user: StoredUser): string {
  const payload: TokenPayload = {
    sub: user.id,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 14, // 14 days
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SERVER_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SERVER_SECRET).update(encoded).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function sanitizeUser(u: StoredUser): User {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    status: u.status,
    phone: u.phone || '',
    whatsapp: u.whatsapp || '',
    city: u.city || '',
    country: u.country || '',
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function recordAudit(
  actor: { id: string; email: string },
  action: string,
  targetType: string,
  targetId: string,
  details: string
): void {
  const entry: AuditLog = {
    id: `aud-${crypto.randomUUID().slice(0, 12)}`,
    actorId: actor.id,
    actorEmail: actor.email,
    action,
    targetType,
    targetId,
    details: String(details).slice(0, 500),
    createdAt: new Date().toISOString(),
  };
  db.auditLogs.unshift(entry);
  if (db.auditLogs.length > 1000) {
    db.auditLogs = db.auditLogs.slice(0, 1000);
  }
}

function isTemplateUnlockedForUser(userId: string, _userRole: string, template: ResumeTemplate): boolean {
  if (template.tier === 'free') return true;
  return db.unlocks.some((u) => u.userId === userId && u.templateId === template.id && u.active);
}

interface AuthedRequest extends Request {
  authUser?: StoredUser;
}

function attachUserIfPresent(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    const payload = verifyToken(token);
    if (payload) {
      const found = db.users.find((u) => u.id === payload.sub);
      if (found && found.status === 'active') {
        req.authUser = found;
      }
    }
  }
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'Sessão inválida ou expirada. Por favor, inicie sessão novamente.' });
    return;
  }
  if (req.authUser.status !== 'active') {
    res.status(403).json({ error: 'A sua conta encontra-se suspensa. Contacte o administrador.' });
    return;
  }
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }
  if (req.authUser.role !== 'admin' || req.authUser.status !== 'active') {
    res.status(403).json({ error: 'Acesso negado. Área exclusiva da administração.' });
    return;
  }
  next();
}

function enforceMaintenanceGate(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (db.settings.maintenanceMode && req.authUser?.role !== 'admin') {
    res.status(503).json({
      error: db.settings.maintenanceMessage || 'A plataforma encontra-se temporariamente em manutenção.',
    });
    return;
  }
  next();
}

// ============================================================================
// EXPRESS APPLICATION
// ============================================================================

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '6mb' }));
  app.use(attachUserIfPresent);

  // Serve uploaded portraits & custom logos safely
  app.use('/api/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

  // 1. BOOTSTRAP ENDPOINT
  app.get('/api/bootstrap', (req: AuthedRequest, res: Response) => {
    const hasAdmin = db.users.some((u) => u.role === 'admin');
    const isAdmin = req.authUser?.role === 'admin';
    const visibleTemplates = isAdmin ? db.templates : db.templates.filter((t) => t.active);
    const unlockedTemplateIds = req.authUser
      ? db.unlocks.filter((u) => u.userId === req.authUser!.id && u.active).map((u) => u.templateId)
      : [];

    res.json({
      hasAdmin,
      settings: db.settings,
      texts: db.texts,
      textCatalog: DEFAULT_TEXT_ENTRIES,
      templates: visibleTemplates,
      promotions: db.promotions.filter((p) => p.active),
      user: req.authUser ? sanitizeUser(req.authUser) : null,
      unlockedTemplateIds,
    });
  });

  // 2. INITIAL SECURE MASTER ADMIN SETUP (Only works when zero admins exist!)
  app.post('/api/auth/setup-admin', (req: Request, res: Response) => {
    const existingAdmin = db.users.some((u) => u.role === 'admin');
    if (existingAdmin) {
      res.status(403).json({
        error: 'O administrador principal já foi configurado. Este processo inicial encontra-se bloqueado.',
      });
      return;
    }

    const fullName = String(req.body?.fullName || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const whatsappNumber = String(req.body?.whatsappNumber || '').trim();

    if (fullName.length < 3) {
      res.status(400).json({ error: 'Indique o nome completo do administrador (mínimo 3 caracteres).' });
      return;
    }
    if (!email.includes('@') || email.length < 5) {
      res.status(400).json({ error: 'Indique um endereço de e-mail válido.' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'A palavra-passe do administrador deve ter pelo menos 8 caracteres.' });
      return;
    }

    const emailConflict = db.users.find((u) => u.email === email);
    const { hash, salt } = hashPassword(password);
    const now = new Date().toISOString();

    let adminUser: StoredUser;
    if (emailConflict) {
      emailConflict.fullName = fullName;
      emailConflict.role = 'admin';
      emailConflict.status = 'active';
      emailConflict.passwordHash = hash;
      emailConflict.passwordSalt = salt;
      emailConflict.updatedAt = now;
      adminUser = emailConflict;
    } else {
      adminUser = {
        id: `usr-${crypto.randomUUID().slice(0, 12)}`,
        fullName,
        email,
        role: 'admin',
        status: 'active',
        whatsapp: whatsappNumber,
        createdAt: now,
        updatedAt: now,
        passwordHash: hash,
        passwordSalt: salt,
      };
      db.users.push(adminUser);
    }

    if (whatsappNumber) {
      db.settings.whatsappNumber = whatsappNumber;
    }
    if (!db.settings.contactEmail) {
      db.settings.contactEmail = email;
    }

    recordAudit(
      { id: adminUser.id, email: adminUser.email },
      'INITIAL_ADMIN_SETUP',
      'user',
      adminUser.id,
      'Configuração segura inicial do Administrador Principal concluída.'
    );
    saveDatabase();

    const token = signToken(adminUser);
    res.status(201).json({
      token,
      user: sanitizeUser(adminUser),
      settings: db.settings,
    });
  });

  // 3. USER REGISTRATION & LOGIN & RECOVERY
  app.post('/api/auth/register', enforceMaintenanceGate, (req: Request, res: Response) => {
    if (!db.settings.allowRegistration) {
      res.status(403).json({
        error: db.texts['auth.registrationDisabled'] || 'O registo de novos utilizadores está desativado.',
      });
      return;
    }

    const fullName = String(req.body?.fullName || '').trim().slice(0, 120);
    const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 140);
    const password = String(req.body?.password || '');

    if (fullName.length < 2) {
      res.status(400).json({ error: 'Por favor, indique o seu nome completo.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Por favor, indique um e-mail válido.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'A palavra-passe deve conter pelo menos 6 caracteres.' });
      return;
    }
    if (db.users.some((u) => u.email === email)) {
      res.status(409).json({ error: 'Já existe uma conta registada com este endereço de e-mail.' });
      return;
    }

    const { hash, salt } = hashPassword(password);
    const now = new Date().toISOString();
    const newUser: StoredUser = {
      id: `usr-${crypto.randomUUID().slice(0, 12)}`,
      fullName,
      email,
      role: 'user',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      passwordHash: hash,
      passwordSalt: salt,
    };

    db.users.push(newUser);
    saveDatabase();

    const token = signToken(newUser);
    res.status(201).json({
      token,
      user: sanitizeUser(newUser),
      unlockedTemplateIds: [],
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    const found = db.users.find((u) => u.email === email);
    if (!found || !verifyPassword(password, found.passwordHash, found.passwordSalt)) {
      res.status(401).json({ error: 'E-mail ou palavra-passe incorretos.' });
      return;
    }
    if (found.status === 'suspended') {
      res.status(403).json({
        error: 'Esta conta encontra-se temporariamente suspensa pela administração.',
      });
      return;
    }
    if (db.settings.maintenanceMode && found.role !== 'admin') {
      res.status(503).json({
        error: db.settings.maintenanceMessage || 'A plataforma encontra-se temporariamente em manutenção.',
      });
      return;
    }

    const token = signToken(found);
    const unlockedTemplateIds = db.unlocks
      .filter((u) => u.userId === found.id && u.active)
      .map((u) => u.templateId);

    res.json({
      token,
      user: sanitizeUser(found),
      unlockedTemplateIds,
    });
  });

  app.post('/api/auth/request-reset', enforceMaintenanceGate, (req: Request, res: Response) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const found = db.users.find((u) => u.email === email);
    if (!found) {
      res.status(404).json({ error: 'Não foi encontrada nenhuma conta associada a este e-mail.' });
      return;
    }
    if (found.role === 'admin') {
      res.status(403).json({
        error: 'Por motivos de segurança, contas administrativas não podem ser redefinidas por código rápido.',
      });
      return;
    }
    const code = String(crypto.randomInt(100000, 999999));
    const { hash, salt } = hashPassword(code);
    found.resetCodeHash = `${salt}:${hash}`;
    found.resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    saveDatabase();

    // Since no external SMTP server is configured, return verification token directly in the recovery session
    res.json({
      message: 'Código de recuperação gerado com validade de 15 minutos.',
      recoveryCode: code,
    });
  });

  app.post('/api/auth/reset-password', enforceMaintenanceGate, (req: Request, res: Response) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'A nova palavra-passe deve ter pelo menos 6 caracteres.' });
      return;
    }
    const found = db.users.find((u) => u.email === email);
    if (!found || !found.resetCodeHash || !found.resetCodeExpiresAt) {
      res.status(400).json({ error: 'Pedido de recuperação inválido ou expirado.' });
      return;
    }
    if (new Date(found.resetCodeExpiresAt).getTime() < Date.now()) {
      res.status(400).json({ error: 'O código de recuperação expirou. Solicite um novo código.' });
      return;
    }
    const [salt, storedHash] = found.resetCodeHash.split(':');
    if (!verifyPassword(code, storedHash, salt)) {
      res.status(400).json({ error: 'Código de verificação incorreto.' });
      return;
    }

    const updatedHash = hashPassword(newPassword);
    found.passwordHash = updatedHash.hash;
    found.passwordSalt = updatedHash.salt;
    delete found.resetCodeHash;
    delete found.resetCodeExpiresAt;
    found.updatedAt = new Date().toISOString();
    saveDatabase();

    res.json({ message: 'Palavra-passe atualizada com sucesso. Já pode iniciar sessão.' });
  });

  app.put('/api/auth/profile', requireAuth, enforceMaintenanceGate, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const fullName = String(req.body?.fullName || user.fullName).trim().slice(0, 120);
    if (fullName.length < 2) {
      res.status(400).json({ error: 'Nome inválido.' });
      return;
    }
    user.fullName = fullName;
    user.phone = String(req.body?.phone || '').trim().slice(0, 40);
    user.whatsapp = String(req.body?.whatsapp || '').trim().slice(0, 40);
    user.city = String(req.body?.city || '').trim().slice(0, 80);
    user.country = String(req.body?.country || '').trim().slice(0, 80);
    user.updatedAt = new Date().toISOString();
    saveDatabase();

    res.json({ user: sanitizeUser(user) });
  });

  app.put('/api/auth/password', requireAuth, enforceMaintenanceGate, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!verifyPassword(currentPassword, user.passwordHash, user.passwordSalt)) {
      res.status(400).json({ error: 'A palavra-passe atual está incorreta.' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'A nova palavra-passe deve ter pelo menos 6 caracteres.' });
      return;
    }
    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    user.updatedAt = new Date().toISOString();
    saveDatabase();

    res.json({ message: 'Palavra-passe alterada com sucesso.' });
  });

  // 4. PHOTO UPLOAD ENDPOINT
  app.post('/api/upload-photo', enforceMaintenanceGate, (req: AuthedRequest, res: Response) => {
    const dataUrl = String(req.body?.dataUrl || '');
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      res.status(400).json({ error: 'Formato de imagem inválido. Utilize JPG, PNG ou WebP.' });
      return;
    }
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > 3.5 * 1024 * 1024) {
      res.status(400).json({ error: 'A fotografia não deve ultrapassar 3.5 MB.' });
      return;
    }
    const filename = `img-${crypto.randomUUID().slice(0, 14)}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
    res.json({ url: `/api/uploads/${filename}` });
  });

  // 5. USER RESUMES CRUD (Strict isolation + Backend Premium Unlock Validation!)
  app.get('/api/resumes', requireAuth, enforceMaintenanceGate, (req: AuthedRequest, res: Response) => {
    const myResumes = db.resumes
      .filter((r) => r.userId === req.authUser!.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.json({ resumes: myResumes });
  });

  app.post('/api/resumes', requireAuth, enforceMaintenanceGate, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const templateId = String(req.body?.templateId || '');
    const title = String(req.body?.title || 'O Meu Currículo').trim().slice(0, 140) || 'O Meu Currículo';
    const data = req.body?.data;

    const template = db.templates.find((t) => t.id === templateId);
    if (!template || (!template.active && user.role !== 'admin')) {
      res.status(404).json({ error: 'Modelo de currículo não encontrado ou inativo.' });
      return;
    }

    // BACKEND PREMIUM GUARD
    if (!isTemplateUnlockedForUser(user.id, user.role, template)) {
      res.status(403).json({
        error: 'Este modelo Premium ainda não está desbloqueado na sua conta. Solicite o desbloqueio via WhatsApp.',
      });
      return;
    }

    if (!data || typeof data !== 'object' || !data.personalInfo) {
      res.status(400).json({ error: 'Dados do currículo inválidos.' });
      return;
    }

    // Validate required fields configured by Admin
    for (const field of db.settings.requiredFields) {
      const val = String(data.personalInfo[field] || '').trim();
      if (!val) {
        res.status(400).json({
          error: `Por favor, preencha o campo obrigatório (${field}) antes de guardar.`,
        });
        return;
      }
    }

    const now = new Date().toISOString();
    const doc: ResumeDocument = {
      id: `cv-${crypto.randomUUID().slice(0, 12)}`,
      userId: user.id,
      templateId: template.id,
      title,
      data,
      createdAt: now,
      updatedAt: now,
    };

    template.usageCount = (template.usageCount || 0) + 1;
    db.resumes.unshift(doc);
    saveDatabase();

    res.status(201).json({ resume: doc });
  });

  app.put('/api/resumes/:id', requireAuth, enforceMaintenanceGate, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const existing = db.resumes.find((r) => r.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Currículo não encontrado.' });
      return;
    }
    if (existing.userId !== user.id && user.role !== 'admin') {
      res.status(403).json({ error: 'Não tem permissão para editar este currículo.' });
      return;
    }

    const nextTemplateId = String(req.body?.templateId || existing.templateId);
    const template = db.templates.find((t) => t.id === nextTemplateId);
    if (!template) {
      res.status(404).json({ error: 'Modelo de currículo inválido.' });
      return;
    }
    if (!isTemplateUnlockedForUser(user.id, user.role, template)) {
      res.status(403).json({ error: 'Não possui acesso desbloqueado a este modelo Premium.' });
      return;
    }

    if (req.body?.title) {
      existing.title = String(req.body.title).trim().slice(0, 140);
    }
    if (req.body?.data && typeof req.body.data === 'object') {
      existing.data = req.body.data;
    }
    existing.templateId = template.id;
    existing.updatedAt = new Date().toISOString();
    saveDatabase();

    res.json({ resume: existing });
  });

  app.post('/api/resumes/:id/duplicate', requireAuth, enforceMaintenanceGate, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const existing = db.resumes.find((r) => r.id === req.params.id && r.userId === user.id);
    if (!existing) {
      res.status(404).json({ error: 'Currículo não encontrado.' });
      return;
    }
    const template = db.templates.find((t) => t.id === existing.templateId);
    if (template && !isTemplateUnlockedForUser(user.id, user.role, template)) {
      res.status(403).json({ error: 'Modelo Premium bloqueado.' });
      return;
    }

    const now = new Date().toISOString();
    const copy: ResumeDocument = {
      id: `cv-${crypto.randomUUID().slice(0, 12)}`,
      userId: user.id,
      templateId: existing.templateId,
      title: `${existing.title} (Cópia)`.slice(0, 140),
      data: structuredClone(existing.data),
      createdAt: now,
      updatedAt: now,
    };
    db.resumes.unshift(copy);
    saveDatabase();
    res.status(201).json({ resume: copy });
  });

  app.delete('/api/resumes/:id', requireAuth, enforceMaintenanceGate, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const idx = db.resumes.findIndex((r) => r.id === req.params.id && r.userId === user.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Currículo não encontrado.' });
      return;
    }
    db.resumes.splice(idx, 1);
    saveDatabase();
    res.json({ ok: true });
  });

  // Verify permission before exporting PDF (protects Premium models on backend!)
  app.post('/api/verify-export', enforceMaintenanceGate, (req: AuthedRequest, res: Response) => {
    const templateId = String(req.body?.templateId || '');
    const template = db.templates.find((t) => t.id === templateId);
    if (!template) {
      res.status(404).json({ error: 'Modelo não encontrado.' });
      return;
    }
    if (template.tier === 'free') {
      res.json({ allowed: true });
      return;
    }
    if (!req.authUser) {
      res.status(403).json({ error: 'Inicie sessão e desbloqueie este modelo Premium para exportar.' });
      return;
    }
    if (!isTemplateUnlockedForUser(req.authUser.id, req.authUser.role, template)) {
      res.status(403).json({ error: 'Este modelo Premium ainda aguarda confirmação de pagamento pelo administrador.' });
      return;
    }
    res.json({ allowed: true });
  });

  // 6. PAYMENT & UNLOCK REQUESTS (WhatsApp manual flow — NEVER unlocks automatically!)
  app.get('/api/payment-requests/my', requireAuth, enforceMaintenanceGate, (req: AuthedRequest, res: Response) => {
    const items = db.paymentRequests
      .filter((p) => p.userId === req.authUser!.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ paymentRequests: items });
  });

  app.post('/api/payment-requests', requireAuth, enforceMaintenanceGate, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const templateId = String(req.body?.templateId || '');
    const promoCode = String(req.body?.promoCode || '').trim().toUpperCase();
    const userWhatsapp = String(req.body?.userWhatsapp || user.whatsapp || '').trim().slice(0, 40);

    const template = db.templates.find((t) => t.id === templateId);
    if (!template || template.tier !== 'premium') {
      res.status(400).json({ error: 'Modelo Premium inválido.' });
      return;
    }

    if (isTemplateUnlockedForUser(user.id, user.role, template)) {
      res.json({ alreadyUnlocked: true });
      return;
    }

    // Check if user already has a pending request for this same template
    const existingPending = db.paymentRequests.find(
      (p) => p.userId === user.id && p.templateId === template.id && p.status === 'pending'
    );
    if (existingPending) {
      res.json({ paymentRequest: existingPending, duplicatePending: true });
      return;
    }

    let finalAmount = template.price;
    let appliedCode: string | undefined;

    if (promoCode && db.settings.enablePromotions) {
      const promo = db.promotions.find(
        (p) =>
          p.active &&
          p.code.toUpperCase() === promoCode &&
          (p.appliesToTemplateId === 'all' || p.appliesToTemplateId === template.id)
      );
      if (promo) {
        finalAmount = Math.max(0, Math.round(template.price * (1 - promo.discountPercent / 100)));
        appliedCode = promo.code;
      }
    }

    const requestRecord: PaymentRequest = {
      id: `pay-${crypto.randomUUID().slice(0, 10)}`,
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userWhatsapp,
      templateId: template.id,
      templateName: template.name,
      originalAmount: template.price,
      amount: finalAmount,
      currency: db.settings.currency,
      promoCode: appliedCode,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    db.paymentRequests.unshift(requestRecord);
    saveDatabase();

    res.status(201).json({ paymentRequest: requestRecord });
  });

  // 7. CONTACT & SUPPORT TICKETS
  app.post('/api/contact', enforceMaintenanceGate, (req: AuthedRequest, res: Response) => {
    const userName = String(req.body?.name || req.authUser?.fullName || '').trim().slice(0, 120);
    const userEmail = String(req.body?.email || req.authUser?.email || '').trim().slice(0, 140);
    const subject = String(req.body?.subject || 'Contacto Geral').trim().slice(0, 160);
    const message = String(req.body?.message || '').trim().slice(0, 2000);
    const type = req.body?.type === 'report' ? 'report' : req.body?.type === 'support' ? 'support' : 'contact';

    if (!userName || !userEmail.includes('@') || message.length < 5) {
      res.status(400).json({ error: 'Preencha o nome, e-mail válido e uma mensagem com pelo menos 5 caracteres.' });
      return;
    }

    const ticket: SupportTicket = {
      id: `sup-${crypto.randomUUID().slice(0, 10)}`,
      userId: req.authUser?.id,
      userName,
      userEmail,
      resumeId: req.body?.resumeId ? String(req.body.resumeId) : undefined,
      type,
      subject,
      message,
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    db.supportTickets.unshift(ticket);
    saveDatabase();
    res.status(201).json({ ticket });
  });

  app.get('/api/support/my', requireAuth, (req: AuthedRequest, res: Response) => {
    const tickets = db.supportTickets.filter(
      (t) => t.userId === req.authUser!.id || t.userEmail === req.authUser!.email
    );
    res.json({ tickets });
  });

  // ============================================================================
  // 8. EXCLUSIVE ADMINISTRATOR ROUTES (Full Control + Audit Trail)
  // ============================================================================

  app.get('/api/admin/overview', requireAdmin, (_req: AuthedRequest, res: Response) => {
    const freeTemplates = db.templates.filter((t) => t.tier === 'free').length;
    const premiumTemplates = db.templates.filter((t) => t.tier === 'premium').length;
    const pendingPayments = db.paymentRequests.filter((p) => p.status === 'pending').length;
    const approvedPayments = db.paymentRequests.filter((p) => p.status === 'approved').length;
    const rejectedPayments = db.paymentRequests.filter((p) => p.status === 'rejected').length;
    const confirmedRevenue = db.paymentRequests
      .filter((p) => p.status === 'approved')
      .reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

    const topTemplates = [...db.templates]
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 8);

    res.json({
      stats: {
        totalUsers: db.users.length,
        totalResumes: db.resumes.length,
        freeTemplates,
        premiumTemplates,
        totalPaymentRequests: db.paymentRequests.length,
        pendingPayments,
        approvedPayments,
        rejectedPayments,
        confirmedRevenue,
        activeUnlocks: db.unlocks.filter((u) => u.active).length,
        openTickets: db.supportTickets.filter((t) => t.status === 'open').length,
      },
      topTemplates,
      recentAudit: db.auditLogs.slice(0, 15),
      recentPayments: db.paymentRequests.slice(0, 8),
    });
  });

  // Admin: Users management
  app.get('/api/admin/users', requireAdmin, (_req: AuthedRequest, res: Response) => {
    const users = db.users.map((u) => ({
      ...sanitizeUser(u),
      resumeCount: db.resumes.filter((r) => r.userId === u.id).length,
      unlockedTemplateIds: db.unlocks.filter((unl) => unl.userId === u.id && unl.active).map((unl) => unl.templateId),
    }));
    res.json({ users });
  });

  app.put('/api/admin/users/:id/status', requireAdmin, (req: AuthedRequest, res: Response) => {
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
      return;
    }
    if (target.id === req.authUser!.id) {
      res.status(400).json({ error: 'Não pode suspender a sua própria conta de administrador.' });
      return;
    }
    const nextStatus = req.body?.status === 'suspended' ? 'suspended' : 'active';
    target.status = nextStatus;
    target.updatedAt = new Date().toISOString();
    recordAudit(
      req.authUser!,
      nextStatus === 'suspended' ? 'SUSPEND_USER' : 'REACTIVATE_USER',
      'user',
      target.id,
      `Estado da conta ${target.email} alterado para ${nextStatus}.`
    );
    saveDatabase();
    res.json({ user: sanitizeUser(target) });
  });

  app.delete('/api/admin/users/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
    const idx = db.users.findIndex((u) => u.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
      return;
    }
    if (db.users[idx].id === req.authUser!.id) {
      res.status(400).json({ error: 'Não pode eliminar a sua própria conta administrativa.' });
      return;
    }
    const removed = db.users[idx];
    db.users.splice(idx, 1);
    db.resumes = db.resumes.filter((r) => r.userId !== removed.id);
    db.unlocks = db.unlocks.filter((u) => u.userId !== removed.id);
    recordAudit(req.authUser!, 'DELETE_USER', 'user', removed.id, `Conta ${removed.email} eliminada permanentemente.`);
    saveDatabase();
    res.json({ ok: true });
  });

  app.post('/api/admin/users/:id/unlock', requireAdmin, (req: AuthedRequest, res: Response) => {
    const target = db.users.find((u) => u.id === req.params.id);
    const template = db.templates.find((t) => t.id === req.body?.templateId);
    if (!target || !template) {
      res.status(404).json({ error: 'Utilizador ou modelo não encontrado.' });
      return;
    }
    const now = new Date().toISOString();
    const existingUnlock = db.unlocks.find((u) => u.userId === target.id && u.templateId === template.id);
    if (existingUnlock) {
      existingUnlock.active = true;
      existingUnlock.grantedBy = req.authUser!.email;
      existingUnlock.updatedAt = now;
    } else {
      db.unlocks.unshift({
        id: `unl-${crypto.randomUUID().slice(0, 10)}`,
        userId: target.id,
        userEmail: target.email,
        userName: target.fullName,
        templateId: template.id,
        templateName: template.name,
        active: true,
        grantedBy: req.authUser!.email,
        createdAt: now,
        updatedAt: now,
      });
    }
    recordAudit(
      req.authUser!,
      'MANUAL_UNLOCK_GRANT',
      'unlock',
      `${target.id}:${template.id}`,
      `Modelo "${template.name}" desbloqueado manualmente para ${target.email}.`
    );
    saveDatabase();
    res.json({ ok: true });
  });

  app.delete('/api/admin/users/:id/unlock/:templateId', requireAdmin, (req: AuthedRequest, res: Response) => {
    const existingUnlock = db.unlocks.find(
      (u) => u.userId === req.params.id && u.templateId === req.params.templateId
    );
    if (!existingUnlock) {
      res.status(404).json({ error: 'Desbloqueio não encontrado.' });
      return;
    }
    existingUnlock.active = false;
    existingUnlock.updatedAt = new Date().toISOString();
    recordAudit(
      req.authUser!,
      'REVOKE_UNLOCK',
      'unlock',
      existingUnlock.id,
      `Acesso ao modelo "${existingUnlock.templateName}" revogado para ${existingUnlock.userEmail}.`
    );
    saveDatabase();
    res.json({ ok: true });
  });

  // Admin: Templates CRUD
  app.get('/api/admin/templates', requireAdmin, (_req: AuthedRequest, res: Response) => {
    res.json({ templates: db.templates });
  });

  app.post('/api/admin/templates', requireAdmin, (req: AuthedRequest, res: Response) => {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    if (!name) {
      res.status(400).json({ error: 'Indique o nome do modelo.' });
      return;
    }
    const now = new Date().toISOString();
    const tier = body.tier === 'premium' ? 'premium' : 'free';
    const primaryColor = String(body.primaryColor || '#0B192C');
    const accentColor = String(body.accentColor || '#C59B27');
    const created: ResumeTemplate = {
      id: `tpl-${crypto.randomUUID().slice(0, 10)}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: String(body.category || (tier === 'premium' ? 'Currículos executivos de alto nível' : 'Currículo moderno')),
      tier,
      description: String(body.description || 'Modelo profissional personalizado.'),
      price: tier === 'premium' ? Math.max(0, Number(body.price) || db.settings.defaultPremiumPrice) : 0,
      active: body.active !== false,
      layoutType: body.layoutType || 'sidebar-left',
      primaryColor,
      accentColor,
      allowedColors:
        Array.isArray(body.allowedColors) && body.allowedColors.length > 0
          ? body.allowedColors
          : [primaryColor, '#0B192C', '#1E293B', '#18181B'],
      defaultFont: body.defaultFont || 'sans',
      allowedFonts:
        Array.isArray(body.allowedFonts) && body.allowedFonts.length > 0
          ? body.allowedFonts
          : ['sans', 'serif', 'editorial'],
      showPhoto: Boolean(body.showPhoto),
      photoShape: body.photoShape || 'circle',
      skillStyle: body.skillStyle || 'bars',
      sampleGender: body.sampleGender === 'female' ? 'female' : 'male',
      previewImageUrl: body.previewImageUrl ? String(body.previewImageUrl) : '',
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    db.templates.unshift(created);
    recordAudit(req.authUser!, 'CREATE_TEMPLATE', 'template', created.id, `Modelo "${created.name}" (${tier}) criado.`);
    saveDatabase();
    res.status(201).json({ template: created });
  });

  app.put('/api/admin/templates/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
    const tpl = db.templates.find((t) => t.id === req.params.id);
    if (!tpl) {
      res.status(404).json({ error: 'Modelo não encontrado.' });
      return;
    }
    const b = req.body || {};
    if (b.name !== undefined) tpl.name = String(b.name).trim();
    if (b.category !== undefined) tpl.category = String(b.category).trim();
    if (b.tier === 'free' || b.tier === 'premium') tpl.tier = b.tier;
    if (b.description !== undefined) tpl.description = String(b.description);
    if (b.price !== undefined) tpl.price = tpl.tier === 'free' ? 0 : Math.max(0, Number(b.price) || 0);
    if (b.active !== undefined) tpl.active = Boolean(b.active);
    if (b.layoutType !== undefined) tpl.layoutType = b.layoutType;
    if (b.primaryColor !== undefined) tpl.primaryColor = String(b.primaryColor);
    if (b.accentColor !== undefined) tpl.accentColor = String(b.accentColor);
    if (Array.isArray(b.allowedColors) && b.allowedColors.length > 0) tpl.allowedColors = b.allowedColors;
    if (b.defaultFont !== undefined) tpl.defaultFont = b.defaultFont;
    if (Array.isArray(b.allowedFonts) && b.allowedFonts.length > 0) tpl.allowedFonts = b.allowedFonts;
    if (b.showPhoto !== undefined) tpl.showPhoto = Boolean(b.showPhoto);
    if (b.photoShape !== undefined) tpl.photoShape = b.photoShape;
    if (b.skillStyle !== undefined) tpl.skillStyle = b.skillStyle;
    if (b.previewImageUrl !== undefined) tpl.previewImageUrl = String(b.previewImageUrl);
    tpl.updatedAt = new Date().toISOString();

    recordAudit(req.authUser!, 'UPDATE_TEMPLATE', 'template', tpl.id, `Modelo "${tpl.name}" atualizado.`);
    saveDatabase();
    res.json({ template: tpl });
  });

  app.post('/api/admin/templates/:id/duplicate', requireAdmin, (req: AuthedRequest, res: Response) => {
    const tpl = db.templates.find((t) => t.id === req.params.id);
    if (!tpl) {
      res.status(404).json({ error: 'Modelo não encontrado.' });
      return;
    }
    const now = new Date().toISOString();
    const copy: ResumeTemplate = {
      ...structuredClone(tpl),
      id: `tpl-${crypto.randomUUID().slice(0, 10)}`,
      name: `${tpl.name} (Cópia)`,
      slug: `${tpl.slug}-copia-${Date.now().toString().slice(-4)}`,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    db.templates.unshift(copy);
    recordAudit(req.authUser!, 'DUPLICATE_TEMPLATE', 'template', copy.id, `Modelo "${tpl.name}" duplicado.`);
    saveDatabase();
    res.status(201).json({ template: copy });
  });

  app.delete('/api/admin/templates/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
    const idx = db.templates.findIndex((t) => t.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Modelo não encontrado.' });
      return;
    }
    const removed = db.templates[idx];
    db.templates.splice(idx, 1);
    recordAudit(req.authUser!, 'DELETE_TEMPLATE', 'template', removed.id, `Modelo "${removed.name}" removido.`);
    saveDatabase();
    res.json({ ok: true });
  });

  // Admin: Financial, Payments, Unlocks & Promotions
  app.get('/api/admin/payments', requireAdmin, (_req: AuthedRequest, res: Response) => {
    res.json({
      paymentRequests: db.paymentRequests,
      unlocks: db.unlocks,
      promotions: db.promotions,
    });
  });

  app.post('/api/admin/payments/:id/approve', requireAdmin, (req: AuthedRequest, res: Response) => {
    const payment = db.paymentRequests.find((p) => p.id === req.params.id);
    if (!payment) {
      res.status(404).json({ error: 'Pedido de pagamento não encontrado.' });
      return;
    }
    const now = new Date().toISOString();
    payment.status = 'approved';
    payment.adminNotes = String(req.body?.adminNotes || 'Pagamento confirmado via WhatsApp.');
    payment.reviewedAt = now;
    payment.reviewedBy = req.authUser!.email;

    // Automatically unlock the Premium template for that user!
    const existingUnlock = db.unlocks.find(
      (u) => u.userId === payment.userId && u.templateId === payment.templateId
    );
    if (existingUnlock) {
      existingUnlock.active = true;
      existingUnlock.paymentRequestId = payment.id;
      existingUnlock.grantedBy = req.authUser!.email;
      existingUnlock.updatedAt = now;
    } else {
      db.unlocks.unshift({
        id: `unl-${crypto.randomUUID().slice(0, 10)}`,
        userId: payment.userId,
        userEmail: payment.userEmail,
        userName: payment.userName,
        templateId: payment.templateId,
        templateName: payment.templateName,
        paymentRequestId: payment.id,
        active: true,
        grantedBy: req.authUser!.email,
        createdAt: now,
        updatedAt: now,
      });
    }

    recordAudit(
      req.authUser!,
      'APPROVE_PAYMENT',
      'payment',
      payment.id,
      `Pagamento aprovado (${payment.amount} ${payment.currency}) e modelo "${payment.templateName}" desbloqueado para ${payment.userEmail}.`
    );
    saveDatabase();
    res.json({ paymentRequest: payment });
  });

  app.post('/api/admin/payments/:id/reject', requireAdmin, (req: AuthedRequest, res: Response) => {
    const payment = db.paymentRequests.find((p) => p.id === req.params.id);
    if (!payment) {
      res.status(404).json({ error: 'Pedido de pagamento não encontrado.' });
      return;
    }
    payment.status = 'rejected';
    payment.adminNotes = String(req.body?.adminNotes || 'Pedido rejeitado pela administração.');
    payment.reviewedAt = new Date().toISOString();
    payment.reviewedBy = req.authUser!.email;

    recordAudit(
      req.authUser!,
      'REJECT_PAYMENT',
      'payment',
      payment.id,
      `Pedido de desbloqueio de ${payment.userEmail} para "${payment.templateName}" rejeitado.`
    );
    saveDatabase();
    res.json({ paymentRequest: payment });
  });

  app.post('/api/admin/payments/manual', requireAdmin, (req: AuthedRequest, res: Response) => {
    const user = db.users.find((u) => u.id === req.body?.userId || u.email === String(req.body?.userEmail || '').toLowerCase());
    const template = db.templates.find((t) => t.id === req.body?.templateId);
    if (!user || !template) {
      res.status(404).json({ error: 'Utilizador ou modelo não encontrado.' });
      return;
    }
    const amount = Math.max(0, Number(req.body?.amount ?? template.price));
    const now = new Date().toISOString();

    const payment: PaymentRequest = {
      id: `pay-${crypto.randomUUID().slice(0, 10)}`,
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userWhatsapp: user.whatsapp,
      templateId: template.id,
      templateName: template.name,
      originalAmount: template.price,
      amount,
      currency: db.settings.currency,
      status: 'approved',
      adminNotes: String(req.body?.adminNotes || 'Pagamento registado manualmente pelo administrador.'),
      createdAt: now,
      reviewedAt: now,
      reviewedBy: req.authUser!.email,
    };
    db.paymentRequests.unshift(payment);

    const existingUnlock = db.unlocks.find((u) => u.userId === user.id && u.templateId === template.id);
    if (existingUnlock) {
      existingUnlock.active = true;
      existingUnlock.paymentRequestId = payment.id;
      existingUnlock.grantedBy = req.authUser!.email;
      existingUnlock.updatedAt = now;
    } else {
      db.unlocks.unshift({
        id: `unl-${crypto.randomUUID().slice(0, 10)}`,
        userId: user.id,
        userEmail: user.email,
        userName: user.fullName,
        templateId: template.id,
        templateName: template.name,
        paymentRequestId: payment.id,
        active: true,
        grantedBy: req.authUser!.email,
        createdAt: now,
        updatedAt: now,
      });
    }

    recordAudit(
      req.authUser!,
      'MANUAL_PAYMENT_REGISTER',
      'payment',
      payment.id,
      `Pagamento manual registado (${amount} ${db.settings.currency}) para ${user.email} — modelo "${template.name}".`
    );
    saveDatabase();
    res.status(201).json({ paymentRequest: payment });
  });

  app.post('/api/admin/unlocks/:id/revoke', requireAdmin, (req: AuthedRequest, res: Response) => {
    const unlock = db.unlocks.find((u) => u.id === req.params.id);
    if (!unlock) {
      res.status(404).json({ error: 'Registo de acesso não encontrado.' });
      return;
    }
    unlock.active = !unlock.active;
    unlock.updatedAt = new Date().toISOString();
    recordAudit(
      req.authUser!,
      unlock.active ? 'RESTORE_UNLOCK' : 'REVOKE_UNLOCK',
      'unlock',
      unlock.id,
      `Acesso de ${unlock.userEmail} ao modelo "${unlock.templateName}" alterado para ${unlock.active ? 'ativo' : 'bloqueado'}.`
    );
    saveDatabase();
    res.json({ unlock });
  });

  // Promotions CRUD
  app.post('/api/admin/promotions', requireAdmin, (req: AuthedRequest, res: Response) => {
    const code = String(req.body?.code || '').trim().toUpperCase().replace(/\s+/g, '');
    const title = String(req.body?.title || '').trim();
    const discountPercent = Math.min(100, Math.max(1, Number(req.body?.discountPercent) || 10));
    if (!code || !title) {
      res.status(400).json({ error: 'Indique o código e título da promoção.' });
      return;
    }
    const promo: Promotion = {
      id: `prm-${crypto.randomUUID().slice(0, 10)}`,
      code,
      title,
      discountPercent,
      appliesToTemplateId: String(req.body?.appliesToTemplateId || 'all'),
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.promotions.unshift(promo);
    recordAudit(req.authUser!, 'CREATE_PROMOTION', 'promotion', promo.id, `Promoção ${promo.code} (-${discountPercent}%) criada.`);
    saveDatabase();
    res.status(201).json({ promotion: promo });
  });

  app.put('/api/admin/promotions/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
    const promo = db.promotions.find((p) => p.id === req.params.id);
    if (!promo) {
      res.status(404).json({ error: 'Promoção não encontrada.' });
      return;
    }
    if (req.body?.active !== undefined) promo.active = Boolean(req.body.active);
    if (req.body?.discountPercent !== undefined) {
      promo.discountPercent = Math.min(100, Math.max(1, Number(req.body.discountPercent) || 10));
    }
    saveDatabase();
    res.json({ promotion: promo });
  });

  app.delete('/api/admin/promotions/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
    db.promotions = db.promotions.filter((p) => p.id !== req.params.id);
    saveDatabase();
    res.json({ ok: true });
  });

  // Admin: Resumes & Support Moderation
  app.get('/api/admin/resumes', requireAdmin, (_req: AuthedRequest, res: Response) => {
    const enriched = db.resumes.map((r) => {
      const owner = db.users.find((u) => u.id === r.userId);
      const tpl = db.templates.find((t) => t.id === r.templateId);
      return {
        ...r,
        ownerEmail: owner?.email || 'Desconhecido',
        ownerName: owner?.fullName || r.data.personalInfo.fullName,
        templateName: tpl?.name || r.templateId,
      };
    });
    res.json({ resumes: enriched, supportTickets: db.supportTickets });
  });

  app.delete('/api/admin/resumes/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
    const idx = db.resumes.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Currículo não encontrado.' });
      return;
    }
    const removed = db.resumes[idx];
    db.resumes.splice(idx, 1);
    recordAudit(
      req.authUser!,
      'ADMIN_DELETE_RESUME',
      'resume',
      removed.id,
      `Currículo "${removed.title}" removido por moderação/suporte administrativo.`
    );
    saveDatabase();
    res.json({ ok: true });
  });

  app.put('/api/admin/support/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
    const ticket = db.supportTickets.find((t) => t.id === req.params.id);
    if (!ticket) {
      res.status(404).json({ error: 'Pedido de suporte não encontrado.' });
      return;
    }
    if (req.body?.adminReply !== undefined) ticket.adminReply = String(req.body.adminReply);
    if (req.body?.status === 'resolved' || req.body?.status === 'open') {
      ticket.status = req.body.status;
      if (ticket.status === 'resolved') ticket.resolvedAt = new Date().toISOString();
    }
    recordAudit(req.authUser!, 'RESOLVE_SUPPORT_TICKET', 'support', ticket.id, `Atendimento ${ticket.subject} atualizado.`);
    saveDatabase();
    res.json({ ticket });
  });

  // Admin: Global Text Editor ("Gestão de todos os textos")
  app.put('/api/admin/texts', requireAdmin, (req: AuthedRequest, res: Response) => {
    const updates = req.body?.updates as Record<string, string> | undefined;
    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ error: 'Formato de atualização inválido.' });
      return;
    }
    const keys = Object.keys(updates);
    for (const k of keys) {
      db.texts[k] = String(updates[k]);
    }
    recordAudit(
      req.authUser!,
      'UPDATE_SITE_TEXTS',
      'texts',
      keys.slice(0, 3).join(','),
      `${keys.length} texto(s) institucional(is) editado(s) no Editor Global de Textos.`
    );
    saveDatabase();
    res.json({ texts: db.texts });
  });

  app.post('/api/admin/texts/reset', requireAdmin, (req: AuthedRequest, res: Response) => {
    const key = req.body?.key ? String(req.body.key) : null;
    const defaults = buildDefaultTextsMap();
    if (key && defaults[key] !== undefined) {
      db.texts[key] = defaults[key];
      recordAudit(req.authUser!, 'RESET_SINGLE_TEXT', 'texts', key, `Texto "${key}" reposto ao valor original.`);
    } else {
      db.texts = defaults;
      recordAudit(req.authUser!, 'RESET_ALL_TEXTS', 'texts', 'all', 'Todos os textos repostos aos valores padrão.');
    }
    saveDatabase();
    res.json({ texts: db.texts });
  });

  // Admin: General Settings & Maintenance
  app.put('/api/admin/settings', requireAdmin, (req: AuthedRequest, res: Response) => {
    const incoming = req.body || {};
    db.settings = {
      ...db.settings,
      ...incoming,
      socialLinks: {
        ...db.settings.socialLinks,
        ...(incoming.socialLinks || {}),
      },
    };
    recordAudit(
      req.authUser!,
      'UPDATE_SETTINGS',
      'settings',
      'global',
      `Configurações gerais atualizadas (Plataforma: ${db.settings.platformName}, Moeda: ${db.settings.currency}, Manutenção: ${db.settings.maintenanceMode}).`
    );
    saveDatabase();
    res.json({ settings: db.settings });
  });

  // Admin: Audit Logs & Backup / Restore
  app.get('/api/admin/audit-logs', requireAdmin, (_req: AuthedRequest, res: Response) => {
    res.json({ auditLogs: db.auditLogs });
  });

  app.get('/api/admin/backup', requireAdmin, (req: AuthedRequest, res: Response) => {
    recordAudit(req.authUser!, 'EXPORT_BACKUP', 'system', 'backup', 'Cópia de segurança integral exportada pelo administrador.');
    saveDatabase();
    const safeBackup = {
      exportedAt: new Date().toISOString(),
      platform: db.settings.platformName,
      settings: db.settings,
      texts: db.texts,
      templates: db.templates,
      promotions: db.promotions,
      usersCount: db.users.length,
      resumes: db.resumes,
      paymentRequests: db.paymentRequests,
      unlocks: db.unlocks,
      supportTickets: db.supportTickets,
      auditLogs: db.auditLogs,
    };
    res.json(safeBackup);
  });

  app.post('/api/admin/restore', requireAdmin, (req: AuthedRequest, res: Response) => {
    const payload = req.body;
    if (!payload || typeof payload !== 'object' || !payload.settings || !payload.texts) {
      res.status(400).json({ error: 'Ficheiro de cópia de segurança inválido.' });
      return;
    }
    db.settings = { ...db.settings, ...payload.settings };
    db.texts = { ...db.texts, ...payload.texts };
    if (Array.isArray(payload.templates) && payload.templates.length > 0) db.templates = payload.templates;
    if (Array.isArray(payload.promotions)) db.promotions = payload.promotions;
    if (Array.isArray(payload.resumes)) db.resumes = payload.resumes;
    if (Array.isArray(payload.paymentRequests)) db.paymentRequests = payload.paymentRequests;
    if (Array.isArray(payload.unlocks)) db.unlocks = payload.unlocks;
    recordAudit(req.authUser!, 'RESTORE_BACKUP', 'system', 'restore', 'Cópia de segurança restaurada com sucesso.');
    saveDatabase();
    res.json({ ok: true });
  });

  // ============================================================================
  // VITE DEV MIDDLEWARE OR PRODUCTION STATIC ASSETS
  // ============================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AurumCV server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
