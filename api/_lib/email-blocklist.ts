// Disposable / throwaway email domains used to mass-create farm accounts.
// Built-in list covers the common temp-mail providers plus the specific domains
// seen abusing Moola (guerrillamail, bwmyga, 1novic, web-library, …). Extend at
// runtime with BLOCKED_EMAIL_DOMAINS (comma-separated) — no redeploy needed to
// add a newly-spotted domain.

const BUILT_IN = [
  // observed abusing Moola
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
  'guerrillamail.de', 'guerrillamailblock.com', 'sharklasers.com', 'grr.la',
  'web-library.net', 'bwmyga.com', '1novic.com', 'ruutukf.com', 'yzcalo.com', 'ozsaip.com',
  // common disposable providers
  'mailinator.com', '10minutemail.com', '10minutemail.net', 'tempmail.com', 'temp-mail.org',
  'throwawaymail.com', 'yopmail.com', 'getnada.com', 'nada.email', 'dispostable.com',
  'trashmail.com', 'maildrop.cc', 'mohmal.com', 'fakemailgenerator.com', 'mailnesia.com',
  'tempr.email', 'moakt.com', 'emailondeck.com', 'discard.email', 'spamgourmet.com',
  'mailcatch.com', 'tempmailo.com', 'fakeinbox.com', 'trashmail.de', 'mytemp.email',
]

function envDomains(): string[] {
  return (process.env.BLOCKED_EMAIL_DOMAINS || '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
}

let cached: Set<string> | null = null
function blocklist(): Set<string> {
  if (!cached) cached = new Set([...BUILT_IN, ...envDomains()])
  return cached
}

/** True if the email's domain is a known disposable / throwaway provider. */
export function isBlockedEmailDomain(email: string): boolean {
  const at = email.lastIndexOf('@')
  if (at < 0) return false
  const domain = email.slice(at + 1).trim().toLowerCase()
  if (!domain) return false
  return blocklist().has(domain)
}
