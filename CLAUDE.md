# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DLC v2** is a barcode scanner web application for tracking food expiry dates. Built from design mockups exported from Claude Design, it's a mobile-first React + Vite app with desktop support, backed by Supabase.

**Key features:**
- Barcode scanning using Barcode Detector API
- Product catalog search with category filtering
- Recent scan history (localStorage-based)
- Desktop shell with sidebar navigation and table view
- Integration with Open Food Facts API for product metadata
- Image search via Google Custom Search API for product photos

## Stack and Commands

**Framework:** React 18 + React Router 7 + Vite
**Database:** Supabase (PostgreSQL)
**Styling:** CSS-in-JS (inline styles) + custom design tokens
**Language:** JavaScript (no TypeScript)

**Run dev server:**
Run "npm run dev" to start Vite on http://localhost:5173.

**Build for production:**
Run "npm run build" to output to dist/.

**Preview production build locally:**
Run "npm run preview".

**Environment variables:**
- VITE_SUPABASE_URL — Supabase project URL
- VITE_SUPABASE_ANON_KEY — Supabase anonymous key
- GOOGLE_CSE_KEY — Google Custom Search API key (optional; image search gracefully disabled if missing)
- GOOGLE_CSE_ID — Google Custom Search Engine ID (optional; image search gracefully disabled if missing)

Add to .env.local (git-ignored). Vite exposes them via import.meta.env.*.

**No test runner.** UI/integration testing is done manually in-browser.

## Architecture and Data Flow

### Routing and Layout

**Mobile (default, <1024px):**
- Single-page app with bottom tab bar
- Routes: / (Affiche), /catalogue, /scan, /p/:ean (Product)
- Tab bar hidden on /scan and product detail pages
- Hook useIsDesktop(1024) detects breakpoint

**Desktop (1024px+):**
- DesktopShell replaces entire router
- Two-column layout: 220px fixed sidebar + flex main area
- Sidebar: nav buttons (Affiche, Catalogue, DLC Calendar, Settings) + session stats
- Main area renders different views per selected nav item

**Viewport:** viewport-fit=cover in index.html; Scanner and BottomTabBar use env(safe-area-inset-*) for notch support.

### Core Pages

**Scanner (src/pages/Scanner.jsx)**
- Uses native Barcode Detector API with camera fallback
- Renders real camera feed with viewfinder corners and animated scan line
- Manual EAN input if camera unavailable
- Batch mode: rapid scanning with toast notifications instead of navigation
- Tracks: session start time, scan count (today), low-confidence detections
- RAF-based detection loop; pauses during navigation to prevent race conditions

**Catalogue (src/pages/Catalogue.jsx)**
- Full-text search on title, brand, EAN via Supabase .ilike() filters
- Category filter buttons (8 categories: Glaces, Viande, Poisson, etc.)
- "A corriger" filter shows products without images
- Sticky header with search input and category chips
- EAN shortcut: if search box contains 8-13 digits, shows direct link button

**Product (src/pages/Product.jsx)**
- Lookup chain: Supabase → Open Food Facts API → Not Found screen
- Conditional banners:
  - Google Custom Search image suggestion (if product lacks image_url)
  - "Add to catalogue" prompt (for OFF-sourced products)
- Copy buttons for all fields; "Copy all" exports tab-separated values for bulk import
- Accepts query param from=scan to trigger auto-save to scan history

**Affiche (src/pages/Affiche.jsx)**
- Grid view of recent scans from localStorage: 2 columns on mobile, auto-fill on desktop
- Card: packshot + title + EAN suffix + copy-EAN button
- Click card to navigate to /p/:ean
- Packshot selection modal: choose between multiple Google Custom Search image results
- Inline product editing: title, brand, weight, category, image
- Desktop: renders as AfficheTableRow (row with 64px packshot thumbnail); first item auto-selected on load

**DesktopShell (src/pages/DesktopShell.jsx)**
- Sidebar with logo, nav buttons, session stats
- Main area switches views (Affiche, Catalogue, DLC Calendar, Settings)
- Catalogue table: columns (thumbnail, title, brand, weight, EAN, category)
- Row selection and inline editing

### Data Sources

**Supabase (src/lib/supabase.js)**
- Single client initialized with env vars
- Tables: products (ean, title, brand, weight, category, image_url, created_at), scans (ean, scanned_at)

**Products API (src/lib/products.js)**
- getProductByEan(ean) — fetch single product
- searchProducts({query, category, needsReview, limit}) — full-text and filters
- createProduct(product) — insert with field whitelist
- updateProduct(ean, updates) — patch with field whitelist

**Open Food Facts (src/lib/openFoodFacts.js)**
- fetchFromOFF(ean) returns {ean, title, brand, weight, category, image_url: null}
- Maps OFF categories to app categories (ice_cream/frozen -> Glaces, etc.)

**Image Search (src/lib/bingImages.js + api/search-image.js)**
- Frontend: searchPackshot(title, brand) calls /api/search-image
- Backend: Vercel serverless function queries Google Custom Search JSON API
- Returns up to 3 image URLs; gracefully empty if Google CSE unavailable

**Scan History (src/lib/scanHistory.js)**
- localStorage key dlc_scans (JSON array, max 20)
- Structure: {ean, title, brand, weight, image_url, category, ts}
- addScan(product) — add full product (deduplicated by EAN)
- getTodayCount() — filters scans since midnight
- getRecentWithData(n) — only entries with complete product data

**Scans API (src/lib/scans.js)**
- insertScan(ean) — fire-and-forget write to Supabase
- getRecentScans(limit) — deduplicated recent scans, falls back to localStorage on error

### Styling and Design System

**Global tokens (src/styles.css):**
- Colors: --primary (#5645d4), --ink (#1a1a1a), text scales --ink-2 through --ink-5, tints (--tint-sky, --tint-mint, --tint-peach, etc.)
- Type: --font-sans (Geist), --font-mono (Geist Mono)
- Radii: --r-1 (4px) through --r-5 (16px); --radius-md (8px), --radius-lg (12px)
- Shadows: --sh-1, --sh-2, --sh-3, --sh-sheet

**Reusable classes:**
- .btn, .btn-primary, .btn-ghost — buttons
- .chip, .chip.is-active — category filter chips
- .input — text input
- .focus-ring — outline on focus-visible
- .mono — tabular numerals
- .app-shell — max-width 520px centered container
- .no-sb — hide scrollbar (horizontal scroll regions)

**Responsive:**
- .app-shell at 768px+ gets desktop styling (box-shadow, side borders)
- Animations: @keyframes scan-line, pulse-ring, detected-pop, sheet-up, fade-in
- Safe-area insets via CSS env() for notch support

### Component Library (src/primitives.jsx, src/icons.jsx)

**Packshot** — Product placeholder/thumbnail
- If image_url: shows image
- Else: brand initials on tinted background (category-dependent)
- Tint map: Glaces → sky, Frais → mint, Epicerie → peach

**CopyField** — Label + value + copy button

**Icons** — SVG components (Image, Catalog, Scan, Calendar, Settings, Close, Plus, Check, Copy, Warn, ChevronRight, etc.)
- Props: s (size), c (color), w (stroke width)

## Key Patterns

**Async with cleanup:** useState + useEffect with cancelled flag to prevent state updates after unmount.

**Error handling:** Many APIs use .catch(() => {}) for graceful degradation (OFF missing product, camera unavailable, image search failure).

**Barcode loop:** RAF-based polling; pauses when navigating to prevent race conditions.

**Batch mode:** batchModeRef (useRef) maintains state; toast notification replaces navigation; auto-dismisses after 2.2s.

**Image pipeline:** Supabase → OFF → Google CSE suggestion (banner) → user accepts/rejects before save.

**Locale:** All UI text is French (Affiche, Catalogue, Scannes, etc.).

## Testing and Local Development

**Setup:**
1. Create .env.local with Supabase credentials
2. Run npm run dev → localhost:5173
3. Test on mobile: DevTools emulation or real device

**Barcode Detector:**
- HTTPS or localhost only
- Chrome/Edge/Safari (limited support in Firefox)
- Real testing requires camera access

**localStorage debugging:**
- DevTools → Application → localStorage → dlc_scans

**Supabase debugging:**
- Network tab shows requests to supabase.project.com
- Check RLS policies if rows not returning

## Project History

Originated as design mockups in Claude Design. HTML/CSS prototypes in project/ directory; design iteration documented in chats/. React implementation follows visual design but differs in internal structure from the prototype.
