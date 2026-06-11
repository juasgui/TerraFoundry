# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies for both backend and frontend
npm run install:all

# Run both backend and frontend concurrently (recommended for development)
npm run dev

# Run backend or frontend independently
npm run dev:backend
npm run dev:frontend

# Seed the database with Mozambique disaster scenario data
cd backend && npm run seed

# Build frontend for production
cd frontend && npm run build
```

**Ports:** Backend runs on `http://localhost:3001`, frontend on `http://localhost:5173`. The Vite dev server proxies `/api/*` requests to the backend automatically.

**Node requirement:** Backend uses Node.js built-in `node:sqlite` (requires Node v22.5+).

## Architecture

TerraFoundry is a climate resilience / disaster response platform built as a monorepo with a separate Express backend and React+TypeScript frontend.

### Data model

The core abstraction is a **property graph** stored in SQLite:

- **Object Types** (`object_types`) define the schema — e.g., Weather Event, Affected Area, Resource, Mission
- **Property Definitions** (`property_definitions`) describe attributes per type, with type, required flag, enum values, and units
- **Link Types** (`link_types`) define typed relationships between two object types
- **Objects** (`objects`) are instances of a type, with a UUID (prefixed `o-`), status, severity, optional lat/lng/polygon for geospatial, and a JSON `properties` bag
- **Links** (`links`) are instances of a link type joining two objects with optional JSON metadata

Everything else (events, alerts, missions, comments, assets, workshop layouts, pipeline runs) references this core graph. The `seed.js` file populates a realistic multi-hazard Mozambique scenario.

### Backend (`backend/`)

- `server.js` — Express app entry; registers all route modules under `/api/`
- `db/database.js` — opens `db/terra.db` with WAL mode and foreign keys, runs `CREATE TABLE IF NOT EXISTS` schema on startup
- `routes/` — one file per domain: `ontology.js`, `objects.js`, `links.js`, `dashboard.js`, `map.js`, `assets.js`, `missions.js`, `pipelines.js`, `ai.js`, `workshop.js`, `reports.js`

The `ai.js` route implements ontology-grounded LLM chat — it builds context from the live object graph before calling the model.

### Frontend (`frontend/src/`)

- `App.tsx` — React Router with 11 routes, all wrapped in `Layout`
- `store/appStore.ts` — single Zustand store for active view, selected object ID, panel visibility, and cached API data
- `api/foundryApi.ts` — centralized API client; all fetch calls go through here, grouped by domain matching the backend route files
- `types/index.ts` — 24+ TypeScript interfaces; start here to understand any data shape
- `views/` — one file per page/route (ControlCenter, OntologyManager, ObjectExplorer, MapsView, AssetsView, MissionsView, PipelinesView, Workshop, AIAssistant, ReportsView)
- `components/layout/Layout.tsx` — outer shell: sidebar + topbar + `<Outlet>` + slide-in ObjectDetailPanel (480px right panel)
- `components/ui/index.tsx` — shared primitives (Badge, KpiCard, Spinner, TimelineItem, etc.)

### Styling

Custom Tailwind theme (`tailwind.config.js`) — dark mode only, Foundry palette with cyan as primary accent, plus green/orange/red/purple for status semantics. Font stack: JetBrains Mono + Inter. Global overrides for Leaflet and Recharts are in `index.css`.

### Conventions

- Object/type IDs use prefixes: `ot-` (object types), `pd-` (property definitions), `lt-` (link types), `o-` (objects)
- Complex values (properties, metadata, polygons) are stored as JSON strings in SQLite and parsed on read
- API paths all share the `/api/` prefix
- The database file lives at `backend/db/terra.db` and is not committed (regenerate with `npm run seed`)
