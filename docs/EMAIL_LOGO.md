# Email sender logo (BIMI)

The inbox sender avatar is controlled by **BIMI**, not the email content. This
sets up the free part. The logo lives at:

    https://www.moolas.site/assets/moola-bimi.svg   (BIMI-compliant SVG Tiny PS)

## DNS records to add at Namecheap (Advanced DNS → Add Record)

**1. DMARC at enforcement** (BIMI requires this). Host `_dmarc`, type `TXT`:

    v=DMARC1; p=quarantine; rua=mailto:verityvoxai@gmail.com; adkim=r; aspf=r

**2. BIMI record.** Host `default._bimi`, type `TXT`:

    v=BIMI1; l=https://www.moolas.site/assets/moola-bimi.svg;

(Namecheap appends the domain automatically — enter just `_dmarc` and
`default._bimi` in the Host field.)

## Where the logo will show
- ✅ **Yahoo Mail, Apple Mail (iOS 16+/macOS Ventura+)** and other BIMI-aware
  clients — free, with the records above.
- ❌ **Gmail** — requires a paid **VMC (Verified Mark Certificate)** (~$1,000+/yr,
  needs a registered trademark) in addition to BIMI. Add `a=https://.../vmc.pem`
  to the BIMI record once you have one.

## Notes
- Only switch DMARC to `p=quarantine` once all senders for the domain are
  authenticated. You send only via Resend (SPF+DKIM verified), so this is fine.
- BIMI logos must be square **SVG Tiny PS** with a `<title>`, no scripts, no
  external refs — which `moola-bimi.svg` is.
