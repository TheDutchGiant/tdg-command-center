# 📌 TDG Phoenix - Current Project Status

Laatste update:
08-08-2026

---

# Projectfase

## 🚀 Phoenix v1.0 — lokaal production-ready

Project Phoenix is functioneel klaar voor een eerste livegang.

De lokale production build is succesvol:

```text
npm run build
✓ Compiled successfully
✓ Finished TypeScript config validation
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

De applicatie start lokaal succesvol met `npm run start`.

---

# Database

Phoenix is gemigreerd van SQLite naar PostgreSQL.

Prisma Client:

`@prisma/client` / Prisma 6.19.3

De lokale omgeving bevat een werkende `DATABASE_URL` en `CLASH_API_TOKEN`.

`prisma generate` werkt succesvol.

---

# API

De Clash of Clans API werkt.

De lokale API-route:

`/api/clan`

geeft momenteel de vier TDG-clans terug met live gegevens zoals ledenaantal, level, war league, winstreak en badge.

---

# Legacy Hall

✅ Nieuwe branding

✅ Legacy Hall

✅ The Dutch Giant Family Archives

✅ Hero artwork

✅ Vier clan-archieven

---

# Clan Experience

✅ Clan Hero

✅ Live Clan HUD

✅ Clan Navigation

✅ Back to Legacy Hall

✅ Live ledenaantallen

✅ Clanpagina's

---

# Functionaliteit

✅ Members pagina

✅ Base Library

✅ CWL import

✅ Wars import

✅ Players import

✅ Attack import

---

# Oracle Cloud

## ❌ Oracle deployment wordt niet voortgezet

We hebben Phoenix op Oracle Cloud getest en daarbij langdurig netwerkproblemen onderzocht.

De applicatie zelf werkte:

- Next.js werkte
- Nginx werkte
- API werkte lokaal
- Prisma werkte
- PostgreSQL werkte
- Production build werkte

De Oracle-instance bleef echter vanaf het internet niet betrouwbaar bereikbaar, ondanks controles van NSG, Security List, Route Table, Internet Gateway, VNIC en Nginx.

**Besluit:** geen verdere tijd verspillen aan Oracle.

De Oracle-omgeving is niet langer onderdeel van de geplande livegang.

---

# Nieuwe livegangstrategie

De nieuwe strategie is bewust simpel:

1. Phoenix lokaal volledig stabiel maken.
2. Een goedkope VPS kiezen voor hosting.
3. Een domeinnaam regelen.
4. Phoenix vanaf die VPS live zetten.
5. Daarna pas verder bouwen.

> Opmerking: in de gesprekken werd "VPN" genoemd; voor websitehosting wordt hier uitgegaan van een **VPS** (Virtual Private Server).

---

# Huidige focus

🎯 **Lokale omgeving + eenvoudige VPS-livegang voorbereiden.**

Niet terug naar Oracle.

Niet opnieuw Vercel als blocker behandelen.

Eerst een kleine, betaalbare en beheersbare hostingoplossing realiseren.

---

# Belangrijkste ontwerpbesluiten

- Legacy Hall vormt het hart van Phoenix.
- Artwork vertelt het verhaal.
- Hero is belangrijker dan interface.
- HUD vormt één geheel met de Hero.
- Phoenix ondersteunt standaard vier clans.
- Eerst een stabiele release, daarna nieuwe functionaliteit.
- Geen tijdelijke oplossingen.
- Complete bestanden hebben altijd de voorkeur.
- Eén probleem tegelijk oplossen.
