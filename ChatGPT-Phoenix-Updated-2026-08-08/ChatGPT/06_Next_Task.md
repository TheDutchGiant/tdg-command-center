# 🚀 TDG Phoenix - Next Task

Dit document vertelt een nieuwe ChatGPT precies waar direct verder gewerkt moet worden.

Wanneer dit document bestaat, hoeft nooit gevraagd te worden:

"Waar waren we gebleven?"

---

# 🎯 Huidige taak

## Phoenix lokaal klaarzetten voor een eenvoudige livegang

De Oracle-route is afgesloten.

De lokale production build is succesvol.

De volgende stap is **niet** opnieuw Oracle of Vercel onderzoeken.

De nieuwe route is:

1. Lokale Phoenix-omgeving controleren.
2. Een goedkope VPS kiezen.
3. VPS installeren/configureren.
4. Domeinnaam regelen.
5. Domein naar de VPS laten wijzen.
6. Phoenix op de VPS deployen.
7. Website testen.
8. Livegang.

> In het gesprek werd "VPN" genoemd. Voor websitehosting wordt hier uitgegaan van een **VPS** (Virtual Private Server).

---

# Belangrijkste technische status

✅ GitHub bevat de huidige Phoenix-code.

✅ Project is gemigreerd naar PostgreSQL.

✅ `npm install` werkt.

✅ `prisma generate` werkt.

✅ `npm run build` werkt lokaal.

✅ `npm run start` werkt lokaal.

✅ `/api/clan` werkt en geeft live gegevens van alle vier TDG-clans terug.

✅ Clash API-token werkt in de lokale omgeving.

---

# Oracle

❌ Oracle Cloud niet meer gebruiken voor deployment.

Er is uitgebreid gecontroleerd:

- Next.js
- Nginx
- NSG
- Security List
- Route Table
- Internet Gateway
- VNIC
- Public IP

Phoenix werkte lokaal, maar de Oracle-instance bleef vanaf het internet onbereikbaar.

**Niet opnieuw in deze cirkel terechtkomen.**

---

# Nieuwe livegang

De livegang moet bewust eenvoudig blijven.

Kleine investering.

Zo weinig mogelijk infrastructuur.

Eigen domeinnaam.

VPS als host.

---

# Na livegang

Voer een korte eindcontrole uit:

- Homepage
- Legacy Hall
- Clanpagina's
- Members
- CWL
- Base Library
- Navigatie
- API's
- Database

Wanneer alles correct werkt:

✅ Project Phoenix v1.0 officieel live zetten.

---

# Daarna

Start Phase 3:

1. Members uitbreiden
2. CWL History
3. Wars
4. Base Library uitbreiden
5. Statistics
6. Discord
7. Settings

---

# Opmerking voor nieuwe ChatGPT

Lees altijd eerst:

00_Working_With_Maarten.md

Daarna:

01_Project_Vision.md

02_Design_Rules.md

03_Project_Status.md

04_Roadmap.md

05_Decisions.md

06_Next_Task.md

Pas daarna verder bouwen aan Project Phoenix.

**Werk stap voor stap. Geef één opdracht tegelijk en wacht op de uitvoer.**
