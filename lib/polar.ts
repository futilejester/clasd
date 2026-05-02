import { Polar } from '@polar-sh/sdk';

let _polar: Polar | null = null;

export function getPolar(): Polar {
  if (!_polar) {
    const token = process.env.POLAR_ACCESS_TOKEN;
    if (!token) {
      throw new Error('POLAR_ACCESS_TOKEN is not set');
    }
    _polar = new Polar({
      accessToken: token,
      // 'sandbox' for dev, 'production' for live. Defaults to production
      // if unset, which is intentionally cautious.
      server:
        (process.env.POLAR_SERVER as 'sandbox' | 'production') ??
        'production',
    });
  }
  return _polar;
}

export function getProductId(): string {
  const id = process.env.POLAR_PRODUCT_ID_PRO;
  if (!id) {
    throw new Error('POLAR_PRODUCT_ID_PRO is not set');
  }
  return id;
}
