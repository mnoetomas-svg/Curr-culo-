import type { SiteSettings } from '../types/index.ts';

export function formatCurrency(amount: number, currency: SiteSettings['currency'] | string = 'AOA'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  switch (currency) {
    case 'AOA': {
      const formatted = new Intl.NumberFormat('pt-AO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(safeAmount);
      return `${formatted} Kz`;
    }
    case 'EUR':
      return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(safeAmount);
    case 'USD':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(safeAmount);
    case 'BRL':
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeAmount);
    case 'MZN': {
      const formatted = new Intl.NumberFormat('pt-MZ', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(safeAmount);
      return `${formatted} MT`;
    }
    default:
      return `${safeAmount} ${currency}`;
  }
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function sanitizeWhatsappNumber(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

export function buildWhatsappUnlockLink(
  whatsappNumber: string,
  messageTemplate: string,
  templateName: string,
  userEmail?: string
): string | null {
  const cleanPhone = sanitizeWhatsappNumber(whatsappNumber || '');
  if (!cleanPhone || cleanPhone.length < 7) {
    return null;
  }
  let msg = (messageTemplate || 'Olá! Tenho interesse em adquirir o modelo Premium [NOME DO MODELO].')
    .replace(/\[NOME DO MODELO\]/gi, templateName);
  if (userEmail) {
    msg += ` (Conta: ${userEmail})`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}
