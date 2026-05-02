import { Resend } from 'resend';

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error('RESEND_API_KEY is not set');
    }
    _resend = new Resend(key);
  }
  return _resend;
}

export function getFromAddress(): string {
  const email = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const name = process.env.RESEND_FROM_NAME || 'Clasd';
  return `${name} <${email}>`;
}
