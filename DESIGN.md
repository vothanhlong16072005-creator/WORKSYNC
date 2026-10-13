# WorkSync Design System — Modern Enterprise SaaS with Bauhaus Accents

WorkSync combines the elite clarity, calm surfaces, and high craftsmanship of modern Enterprise SaaS (Linear, Stripe, Apple Pro) with a distinctive, cultured Bauhaus geometric color identity.

---

## 1. Core Visual Philosophy

- **Clean Enterprise Canvas**: 90% of surfaces remain serene and light (`#F8FAFC` background, pure `#FFFFFF` cards). No heavy black borders or retro game boxes.
- **Modern Soft Architecture**:
  - Cards use soft, premium radii (`rounded-2xl` for major widgets, `rounded-xl` for items/modals).
  - Borders are ultra-subtle 1px neutral dividers (`border-slate-200/80` or `border-slate-100`).
  - Shadows are delicate and floating (`shadow-sm` at rest, `hover:shadow-md transition-all duration-200`).
- **Curated Bauhaus Palette as Purposeful Accents**:
  - **Cobalt Royal Blue (`#2563EB`)**: Primary action buttons, active states, "In Review" indicators, velocity bars.
  - **Bauhaus Ochre / Warm Amber (`#F59E0B`)**: "In Progress" badges, sprint timelines, secondary velocity bars.
  - **Terracotta / Vermilion Red (`#C95D43`)**: "Blocked" status, overdue alerts, "Join Call" meeting actions.
  - **Emerald Green (`#10B981`)**: "Completed" status, positive velocity trends, system health green dots.
  - **Deep Slate / Charcoal (`#0F172A`)**: High-contrast typography, primary headlines.
- **Accents vs Floods**: Colors are applied via **pill badges, status dots, slim progress bars, and subtle left border stripes**, never as massive solid flood-fill backgrounds that overwhelm the user.

---

## 2. Key Layout Patterns

1. **Workspace Hero Banner**:
   - Branded company header (`WorkSync Enterprise • FPT Software Workspace`).
   - Personalized greeting, date pill, and abstract Bauhaus geometric constructivist artwork accent.
2. **Top Attendance Hub**:
   - Quick attendance widget positioned immediately below the hero banner.
   - Live digital clock, standard working hours badge (`08:30 - 17:30`), and prominent Check-in / Check-out button.
3. **Refined 6-KPI Ribbon**:
   - Total Tasks, In Progress (Ochre), In Review (Cobalt), Blocked (Terracotta), Overdue (Alert pill), Completed (Emerald velocity).
4. **Balanced Operational Grid**:
   - Left: Core Tasks checklist (Urgent & Next 7 Days tabs) + 7-Day Velocity Chart.
   - Right: Active Sprint countdown + Upcoming Meetings (with "Join Call" button) + Project Portfolio.
5. **Analytical & Activity Tier**:
   - Task Distribution Donut Chart (Cobalt, Ochre, Terracotta) + Recent Documents Hub + Recent Activity Stream.
6. **Minimal Enterprise Footer**:
   - Operational status indicator (`All systems operational 🟢`), keyboard shortcuts, and copyright.

---

## 3. Typography & Hierarchy

- **Headlines**: Font Inter / Segoe UI, `font-black text-slate-900 tracking-tight`, sentence case for long text to avoid visual fatigue.
- **Labels & Metas**: `font-bold text-xs uppercase tracking-wider text-slate-500`.
- **Numeric KPIs**: `font-black text-3xl text-slate-900`.
- **Badges**: `text-xs font-bold px-2.5 py-0.5 rounded-full border`.
