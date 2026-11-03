/**
 * Formato y validación de celulares colombianos en el cliente. La validación que
 * protege es la del servidor; esta solo ayuda a escribir bien el número.
 */

const MAX_DIGITS = 10

function group(digits: string): string {
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean).join(' ')
}

/**
 * Agrupa mientras se escribe: "3001234567" → "300 123 4567". Funciona tecla por
 * tecla: un "+" inicial se conserva mientras se escribe el indicativo (+5, +57).
 */
export function formatColombianMobile(raw: string): string {
  const trimmed = raw.trimStart()
  const digits = trimmed.replace(/\D/g, '')

  if (trimmed.startsWith('+')) {
    if (digits === '' || digits === '5') return `+${digits}`
    if (!digits.startsWith('57')) return `+${digits.slice(0, 12)}` // otro país: el servidor lo rechazará
    return `+57 ${group(digits.slice(2, 2 + MAX_DIGITS))}`.trimEnd()
  }
  // Número pegado con indicativo pero sin "+": 573001234567
  if (digits.length > MAX_DIGITS && digits.startsWith('57')) {
    return `+57 ${group(digits.slice(2, 2 + MAX_DIGITS))}`
  }
  return group(digits.slice(0, MAX_DIGITS))
}

/** Celular colombiano: 10 dígitos que empiezan por 3 (con o sin +57). */
export function isValidColombianMobile(value: string): boolean {
  let digits = value.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('57')) digits = digits.slice(2)
  return /^3\d{9}$/.test(digits)
}
