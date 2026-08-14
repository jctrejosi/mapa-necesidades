# Plan: Colombia Earthquake Relief Platform

## Context
Build a full-featured, mobile-first solidarity platform for coordinating earthquake relief in Colombia (10/08/2026). The app has 9 pages, an interactive Leaflet map, admin panel, dashboard with charts, and a PIN-based self-service editing system. No real backend — all data stored in localStorage with mock initial data.

## Aesthetic Stance
**Swiss-functional** with Colombian flag palette. Clean grid, strong typographic hierarchy, functional color-as-signal (yellow/blue/red/green/orange/gray). Emergency contexts demand clarity over decoration.

- **Display font**: `Work Sans` (600/700 weights) — functional, warm, legible at small sizes
- **Body font**: `Nunito` (400/500/600) — accessible, excellent mobile readability
- Both are public Google Fonts → `@import` in `src/index.css`

## Color Tokens (src/index.css @theme)
```
--col-yellow: #FCD116    (alerts, accent band)
--col-blue:   #003893    (primary buttons, active chips, titles)
--col-red:    #CE1126    (critical states)
--col-orange: #E08E00    (in-progress states)
--col-green:  #2E9E5B    (resolved states)
--col-gray:   #9AA0AC    (no-data states)
--background: #f4f5f7
--card:       #ffffff
--border:     #e1e4e9
--foreground: #1f2430
```

## Architecture

### Single-file React app with client-side routing (no React Router needed)
- State: `currentPage` string drives which page renders
- Data: `useLocalStorage` hook for all entities
- No backend — mock data seeded on first load

### File structure
- `src/App.tsx` — Router shell + Header + Footer + page switcher
- `src/data/mock.ts` — Initial seed data (sectors, needs, news, etc.)
- `src/store.ts` — localStorage hooks and data operations
- `src/components/Header.tsx` — Tricolor band + city selector + nav
- `src/components/Footer.tsx` — Fixed solidarity footer
- `src/components/Modal.tsx` — Generic overlay modal
- `src/components/PinModal.tsx` — PIN display after publishing
- `src/components/StatusTag.tsx` — Colored pill badges
- `src/components/FilterChips.tsx` — Pill filter row
- `src/pages/MapPage.tsx` — index: Leaflet map + sidebar
- `src/pages/OfrecimientosPage.tsx` — Offers list
- `src/pages/MascotasPage.tsx` — Lost pets map + list
- `src/pages/NoticiasPage.tsx` — News feed
- `src/pages/ViviendaPage.tsx` — Housing list
- `src/pages/DanosPage.tsx` — Structural damage (Manizales only)
- `src/pages/DashboardPage.tsx` — Stats + donut chart
- `src/pages/AyudaPage.tsx` — Help/FAQ static page
- `src/pages/AdminPage.tsx` — Admin panel with login

### Dependencies to install
- `leaflet` + `react-leaflet` — maps
- `recharts` — donut chart in dashboard
- `@types/leaflet` — TypeScript types

### Key implementation details

**Header**: 3px tricolor gradient band (yellow|blue|red) → white bar with emoji title, city selector (6 cities, localStorage), nav links (collapse to hamburger ≤720px).

**Map (Leaflet)**: Custom colored circle markers. Sector popup with needs list. Lazy import (`React.lazy` or dynamic import) to avoid SSR issues. Map + sidebar layout: on mobile sidebar stacks below map (≈50vh map / 50vh list).

**PIN system**: Generate 4-digit random PIN on publish. Show in success modal. Edit forms verify PIN before saving.

**Auto-refresh**: `useEffect` with `setInterval(30000)` on list pages — re-reads from localStorage (simulates API poll).

**Image compression**: `canvas.toDataURL('image/jpeg', 0.72)` + max 1000px resize before storing as base64.

**Dashboard**: Recharts `PieChart` (donut) for overall progress. 6 stat cards. Progress bars per type and per sector.

**Admin login**: Password `admin1234` checked against hardcoded value, session in `sessionStorage`.

**Damage reports**: Radicado format `DA` + 6 random digits. Only available for Manizales city.

**Mobile responsive** (≤720px breakpoint):
- Map pages: map 50vh top, list below
- Sidebar becomes full-width bottom panel
- Nav collapses to hamburger menu
- Cards stack single-column
- Modals use full width with padding

## Critical files to create/modify
1. `src/index.css` — Google Font imports, color tokens, global resets
2. `src/App.tsx` — Full rewrite as app shell
3. `src/data/mock.ts` — New file with seed data
4. `src/store.ts` — New file with localStorage hooks
5. `src/components/` — New directory with shared components
6. `src/pages/` — New directory with all 9 pages

## Verification
1. App loads and shows MapPage with mock sectors and colored pins
2. City selector filters content, persists in localStorage
3. Reporting a need generates a PIN modal
4. Admin login with correct password shows full panel
5. Dashboard donut chart renders with correct totals
6. Mobile (≤720px): map/list stacks, nav collapses, modals full-width
7. Damage report button shows "(Manizales)" and blocks other cities
