import crypto from 'crypto';

export type JwtRole = 'ADMIN' | 'LANDLORD' | 'TENANT';

export interface JwtPayload {
  userId: string;
  role: JwtRole;
  fullName: string;
  iat: number;
  exp: number;
}

const DEFAULT_JWT_SECRET = 'smarthost_dev_jwt_secret_change_in_prod';

function getJwtSecret(): string {
  return process.env.JWT_SECRET?.trim() || DEFAULT_JWT_SECRET;
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLen), 'base64');
}

export function signJwt(
  payload: { userId: string; role: JwtRole; fullName: string },
  expiresInSeconds = 7 * 24 * 60 * 60
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerEncoded = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${headerEncoded}.${payloadEncoded}`;

  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(data)
    .digest();

  return `${data}.${base64UrlEncode(signature)}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const headerPart = parts[0];
    const payloadPart = parts[1];
    const signaturePart = parts[2];
    if (!headerPart || !payloadPart || !signaturePart) return null;

    const data = `${headerPart}.${payloadPart}`;
    const expectedSig = crypto
      .createHmac('sha256', getJwtSecret())
      .update(data)
      .digest();
    const actualSig = base64UrlDecode(signaturePart);

    if (expectedSig.length !== actualSig.length) return null;
    if (!crypto.timingSafeEqual(expectedSig, actualSig)) return null;

    const decoded = JSON.parse(base64UrlDecode(payloadPart).toString('utf8')) as JwtPayload;
    if (!decoded.userId || !decoded.role) return null;

    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) return null;

    return decoded;
  } catch {
    return null;
  }
}
