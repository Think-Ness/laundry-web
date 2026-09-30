/**
 * QR Payload Verifier — Online Side (Next.js)
 *
 * Verifies the HMAC-SHA256 signature from the offline stand QR payload.
 * MUST use the same QR_SIGNATURE_SECRET as laundry-stand.
 */

export interface QrPayload {
  id: string       // Transaction ID: LW-RT01-260930-0001
  wali: string     // Customer name
  santri: string   // Student name
  nis?: string     // Student registration number / NIS
  layanan?: string // Service type: biasa | express | kilat
  hp: string       // Phone (optional)
  kg: number       // Weight
  harga: number    // Unit price
  total: number    // Total amount
  bayar: string    // Payment method: cash | qris
  lunas: boolean   // Is paid
  ts: number       // Issued timestamp
  nonce: string    // Random nonce
  sig: string      // HMAC-SHA256 signature
}

/**
 * Decode and verify a QR URL token.
 * Returns the payload if valid, null otherwise.
 */
export function decodeQrToken(token: string): QrPayload | null {
  try {
    const json = base64urlDecode(token)
    if (!json) return null

    const payload = JSON.parse(json) as QrPayload
    if (!payload.id || !payload.sig) return null

    return payload
  } catch {
    return null
  }
}

/**
 * Verify HMAC-SHA256 signature server-side (in API route or Server Action).
 * Uses Web Crypto API (available in Next.js Edge + Node.js environments).
 */
export async function verifyQrSignature(payload: QrPayload): Promise<boolean> {
  const secret = process.env.QR_SIGNATURE_SECRET
  if (!secret) throw new Error('QR_SIGNATURE_SECRET is not configured')

  const { sig, ...data } = payload
  const sortedData = Object.fromEntries(
    Object.entries(data).sort(([a], [b]) => a.localeCompare(b))
  )
  const message = JSON.stringify(sortedData)

  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const msgData = encoder.encode(message)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  const sigBytes = hexToBytes(sig)
  return await crypto.subtle.verify('HMAC', key, sigBytes.buffer as ArrayBuffer, msgData)
}

/**
 * Format currency to Indonesian Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

// ─── Helpers ──────────────────────────────────────────────
function base64urlDecode(str: string): string | null {
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '==='.slice((base64.length + 3) % 4)
    return atob(padded)
  } catch {
    return null
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}
