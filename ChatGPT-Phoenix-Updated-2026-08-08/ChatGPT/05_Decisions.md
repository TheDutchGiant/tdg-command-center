# 📜 TDG Phoenix - Decisions

Dit document bevat alle definitieve ontwerp- en projectbeslissingen.

Nieuwe chats mogen deze beslissingen niet opnieuw ter discussie stellen.

Bij twijfel geldt:

**Dit document is leidend.**

---

# Projectvisie

Phoenix is geen Clash of Clans dashboard.

Phoenix is het digitale geheugen van de TDG Family.

Iedere nieuwe feature moet bijdragen aan deze visie.

---

# Legacy Hall

Besloten op:
07-08-2026

De Legacy Hall vormt het hart van Phoenix.

Iedere bezoeker begint hier.

Vanuit de Legacy Hall kiest de gebruiker een clanarchief.

De Legacy Hall blijft bewust rustig.

---

# Homepage

De homepage is geen dashboard.

Geen statistieken.

Geen widgets.

Geen overbodige informatie.

Doel:

De bezoeker zo snel mogelijk de Legacy Hall binnen laten stappen.

---

# Hero Artwork

Artwork is belangrijker dan interface.

Artwork vertelt het verhaal.

Niet de tekst.

Iedere Hero is een unieke illustratie.

Standaard banners worden niet gebruikt.

---

# Clan Hero

Iedere clanpagina begint met een grote Hero.

De Hero bepaalt de sfeer van de pagina.

Daaronder bevindt zich direct de Clan HUD.

Hero en HUD vormen visueel één geheel.

---

# Clan HUD

De HUD is onderdeel van de Hero.

Geen losse kaart.

De clanbadge staat centraal.

Live informatie wordt compact weergegeven.

Alleen The Dutch Giant toont daarnaast de Nederlandse ranking.

---

# Clan Cards

Besloten op:
06-08-2026

Definitieve opbouw:

Clannaam

Artwork

Ledenaantal

View Clan →

Artwork krijgt altijd de meeste aandacht.

Er komt nooit tekst over de artwork.

---

# Navigatie

Iedere clanpagina gebruikt dezelfde navigatie.

Back to Legacy Hall

Dashboard

Members

CWL

Wars

Bases

Statistics

Discord

Settings

Navigatie blijft voor iedere clan identiek.

---

# Multi-clan Architectuur

Phoenix wordt volledig gebouwd voor meerdere clans.

Nieuwe functionaliteit ondersteunt standaard:

- The Dutch Giant
- TDG II
- TDG Mini
- TDG Micro

Single-clan oplossingen worden niet meer toegevoegd.

---

# Database

Op 07-08-2026 is besloten om Phoenix voor de productieomgeving op PostgreSQL te laten draaien in plaats van SQLite.

De huidige codebase gebruikt Prisma met PostgreSQL.

---

# Hosting

Op 08-08-2026 is definitief besloten om **Oracle Cloud niet verder te gebruiken voor de livegang**.

De Oracle-route heeft te veel tijd gekost door netwerkproblemen die niet nodig zijn voor het doel van Phoenix.

Nieuwe deploymentstrategie:

- lokaal ontwikkelen en testen
- goedkope VPS voor hosting
- eigen domeinnaam
- Phoenix rechtstreeks vanaf de VPS live zetten

Vercel is niet langer de vereiste deploymentroute.

---

# Ontwikkelmethode

Complete bestanden hebben de voorkeur.

Snippets alleen wanneer daar expliciet om gevraagd wordt.

Eén probleem tegelijk oplossen.

Eerst de oorzaak vinden.

Daarna oplossen.

---

# Projectkwaliteit

Geen tijdelijke oplossingen.

Geen quick fixes.

Geen placeholder code.

Iedere oplossing moet geschikt zijn voor langdurig gebruik.

---

# Filosofie

Rust is belangrijker dan veel informatie.

Artwork is belangrijker dan tekst.

Iedere tekst moet zichzelf verdedigen.

Kan iets weg?

Dan gaat het weg.

Gebruiksvriendelijkheid is belangrijker dan technische perfectie.

---

# Releasebeleid

Eerst een stabiele release.

Daarna nieuwe functionaliteit.

Nieuwe features mogen nooit ten koste gaan van stabiliteit.

---

# Documentatie

Na iedere belangrijke mijlpaal wordt de ChatGPT-documentatie bijgewerkt.

De documentatie weerspiegelt altijd de actuele staat van Project Phoenix.

Nieuwe gesprekken gebruiken deze documentatie als uitgangspunt.
