import crypto from 'crypto';

/**
 * Format Date to VNPay yyyyMMddHHmmss in GMT+7 (Asia/Ho_Chi_Minh),
 * independent of the host/container timezone.
 */
export function formatVnpDate(date: Date = new Date()): string {
  const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    vnTime.getUTCFullYear().toString() +
    pad(vnTime.getUTCMonth() + 1) +
    pad(vnTime.getUTCDate()) +
    pad(vnTime.getUTCHours()) +
    pad(vnTime.getUTCMinutes()) +
    pad(vnTime.getUTCSeconds())
  );
}

/**
 * Sort params lexicographically by key and URL-encode key/value
 * replacing %20 with '+' to match VNPay HMAC-SHA512 specification.
 */
export function sortAndEncodeVnpParams(
  params: Record<string, string | number | undefined | null>
): Array<[string, string]> {
  return Object.keys(params)
    .filter((key) => {
      const val = params[key];
      return val !== undefined && val !== null && String(val) !== '';
    })
    .sort()
    .map((key) => [
      encodeURIComponent(key),
      encodeURIComponent(String(params[key])).replace(/%20/g, '+'),
    ]);
}

export function buildVnpSignData(
  params: Record<string, string | number | undefined | null>
): string {
  return sortAndEncodeVnpParams(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

export function signVnpParams(
  params: Record<string, string | number | undefined | null>,
  secretKey: string
): string {
  const signData = buildVnpSignData(params);
  return crypto
    .createHmac('sha512', secretKey)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');
}

export function verifyVnpSignature(
  query: Record<string, unknown>,
  secretKey: string
): boolean {
  const receivedHash = typeof query.vnp_SecureHash === 'string' ? query.vnp_SecureHash : '';
  if (!receivedHash) return false;

  const cleanParams: Record<string, string> = {};
  for (const [key, val] of Object.entries(query)) {
    if (key === 'vnp_SecureHash' || key === 'vnp_SecureHashType') continue;
    if ((typeof val === 'string' || typeof val === 'number') && String(val) !== '') {
      cleanParams[key] = String(val);
    } else if (Array.isArray(val) && typeof val[0] === 'string' && val[0] !== '') {
      cleanParams[key] = val[0];
    }
  }

  const expectedHash = signVnpParams(cleanParams, secretKey);
  const a = Buffer.from(receivedHash.toLowerCase(), 'utf8');
  const b = Buffer.from(expectedHash.toLowerCase(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function extractInvoiceIdFromTxnRef(txnRef: string): string {
  const idx = txnRef.lastIndexOf('_');
  return idx > 0 ? txnRef.slice(0, idx) : txnRef;
}

export function parseVnpayTxnRef(txnRef: string): { type: 'topup' | 'invoice'; id: string } {
  if (txnRef.startsWith('TOPUP_')) {
    const rest = txnRef.slice('TOPUP_'.length);
    const idx = rest.lastIndexOf('_');
    return {
      type: 'topup',
      id: idx > 0 ? rest.slice(0, idx) : rest,
    };
  }
  return {
    type: 'invoice',
    id: extractInvoiceIdFromTxnRef(txnRef),
  };
}

export function normalizeClientIp(rawIp?: string | string[]): string {
  const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp;
  if (!ip) return '127.0.0.1';
  const first = ip.split(',')[0]?.trim() || '127.0.0.1';
  if (first === '::1' || first === '::ffff:127.0.0.1') return '127.0.0.1';
  return first.startsWith('::ffff:') ? first.slice(7) : first;
}
