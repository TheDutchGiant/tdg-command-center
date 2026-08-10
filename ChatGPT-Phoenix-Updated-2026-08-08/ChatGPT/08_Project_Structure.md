# 🏗 TDG Phoenix - Project Structure

Dit document beschrijft de architectuur van Project Phoenix.

Nieuwe onderdelen volgen altijd deze structuur.

---

# Hoofdstructuur

```
app/
├── api/
├── actions/
├── bases/
├── clan/
├── components/
├── lib/
```

---

# app/api

Alle API-routes.

Voorbeelden:

- Clan API
- CWL Import
- War Import

---

# app/actions

Server Actions.

Hier staat alle logica die data opslaat of wijzigt.

Voorbeelden:

- saveSeason()
- saveWar()
- savePlayers()
- saveAttacks()

---

# app/components

Alle herbruikbare componenten.

Bijvoorbeeld:

- Clan Hero
- Clan HUD
- Clan Navigation
- Base Cards

---

# app/clan

Alle clanpagina's.

Iedere clan gebruikt exact dezelfde structuur.

```
clan/

Dashboard

Members

CWL

Wars

Bases

Statistics

Discord

Settings
```

---

# app/lib

Algemene logica.

Bijvoorbeeld:

- Prisma
- Clash API
- Config
- Synchronisatie

---

# Database

Prisma vormt de volledige database-laag.

Belangrijkste modellen:

- Clan
- Season
- War
- Player
- Attack
- Base

---

# Architectuur

Phoenix ondersteunt standaard meerdere clans.

Nieuwe functionaliteit moet automatisch werken voor:

- The Dutch Giant
- TDG II
- TDG Mini
- TDG Micro

Single-clan oplossingen worden niet meer toegevoegd.

---

# Ontwikkelregel

Nieuwe functionaliteit wordt gebouwd binnen de bestaande structuur.

Geen losse bestanden.

Geen dubbele logica.

Hergebruik gaat altijd voor duplicatie.