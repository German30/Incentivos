# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Three roles with equal weight; each sees only the modules its role allows (the backend's `GET /auth/me` returns them):

- **ADMINISTRADOR**: reviews sales, goals and incentives for every branch, checks data sync, and maintains goals, rules, parameters and users.
- **DISPENSADOR**: checks individual and branch progress against goals (18 SKUs, 5 SKUs, SOLURAL, zero-shortage, global sales).
- **DOCTOR**: checks sales and commissions by doctor category.

## Product Purpose
"Incentivos" interprets pharmacy sales data to calculate incentives. It replaces a Power BI report (`Farmacias VIDA_ABR_v1.pbix`) with an API (Incentivos-Back, FastAPI + MySQL) and this web frontend. Success: each role can answer "how am I doing against my goal this month, and what do I earn?" without help, and the administrator can adjust goals and rules without touching code.

## Positioning
Business rules (goals, classification, commissions, bonus) live in the database and are edited from the UI; the calculation is the same one the backend validates. Each figure is read against its goal and its month-end projection, never on its own.

## Operating Context
- Default period: the month of the latest sale; accepts any date range and a branch filter (AC1, AC2, ALL, LB, NVA, PZA, VL1, VL2, ZZA).
- Projection: sales / day of last sale × days in the month (single month only).
- Global bonus: awarded when the projection reaches the branch's global goal.
- JWT session, 8 h by default.

## Capabilities and Constraints
- Stack: Angular 21 (standalone, SCSS, routing), Node 22.17; the backend is at `../Incentivos-Back`, prefix `/api/v1`.
- Endpoints: auth, catalogs, dispensers (summary/sales/incentives), branches (summary/sync), doctors (commissions/summary), goals, classification rules, commission rules, parameters, users.
- The UI must not duplicate permission logic: menu and guards come from `modulos`.

## Brand Commitments
Neutral identity of its own: product "Incentivos", portfolio piece, not tied to a client's brand.
Visual reference pinned by the user (2026-10-12): `Pictures/Screenshots/uiux.png`, a light fintech dashboard (white rounded cards, navy, KPIs with colored accent, delta pills, area chart, donut). Replaces the previous Crouwel-grid world.

## Evidence on Hand
Real data lives in the local MySQL (`../db_incentivos/*.sql`). No logos, testimonials, or external claims.

## Product Principles
1. Every number has context: goal, progress, and whether it hits.
2. Detailed charts with clear hierarchy; no generic charts or Power BI-style tile mosaics (user's explicit request).
3. One role, one focused view: show only what that role can act on.
4. Configuration is part of the product, not a hidden screen.
