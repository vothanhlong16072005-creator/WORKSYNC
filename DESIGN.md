# WorkSync Design System — Bauhaus Editorial

WorkSync uses a restrained, editorial interpretation of Bauhaus: geometric color blocks and confident typography create identity, while work surfaces stay calm and readable. Use this system across all product screens.

## Visual direction

- Keep data dense but easy to scan. Use warm white canvases, ink-colored text, clear grouping, and compact metadata.
- Use geometry as a purposeful accent: a small square, line, circle, or color block near a heading or status. Do not decorate behind dense content.
- Use thin neutral dividers for repeated surfaces. Reserve strong outlines and offset shadows for selected elements or primary moments, not every card.
- Keep corners mostly square with a restrained 4–8px radius. Do not mix unrelated corner styles.

## Color tokens

| Token | Reference | HSL | Use |
|---|---|---|---|
| Canvas | Warm white `#FAF9F6` | `42 29% 97%` | App background |
| Surface | White `#FFFFFF` | `0 0% 100%` | Cards, menus, dialogs |
| Ink | Deep charcoal `#201F26` | `250 10% 14%` | Main text and strong outlines |
| Navy | Deep indigo `#241B4B` | `251 46% 20%` | Brand block, strong contrast |
| Cobalt | `#4D7FC2` | `215 51% 53%` | Primary action, links, active state |
| Vermilion | `#C95D43` | `11 56% 53%` | Risk, urgent priority, warm accent |
| Sun | `#F1E64A` | `56 85% 62%` | Highlight, selected accent, pending state |
| Mist | `#F1F0EC` | `45 13% 94%` | Secondary surface |
| Line | `#D8D6D2` | `40 6% 83%` | Dividers and quiet borders |

Use Cobalt for the main call to action. Use Vermilion for destructive actions and urgent states. Use Sun for small highlights with Ink text. Do not place white text on Sun.

## Typography

- Display: `Arial Narrow`, `Roboto Condensed`, `Haettenschweiler`, `Impact`, sans-serif. Use for page titles, short labels, and numeric emphasis.
- Body: `Inter`, `Segoe UI`, system-ui, sans-serif. Use for task titles, descriptions, controls, and long text.
- Page titles may be uppercase with tight line-height and modest tracking. Body copy uses sentence case for readability.
- Keep labels compact and uppercase only when they are short metadata, navigation labels, or status names.

## Components and interaction

- Buttons: one visually dominant Cobalt action per group; secondary actions use quiet surfaces or text treatments.
- Cards: white surface, neutral border, restrained shadow. Use a narrow status or priority accent instead of a thick outline around every card.
- Status: pair color with a text label or icon; never communicate state through color alone.
- Focus: show a clear 2px Cobalt focus ring with offset. Preserve keyboard access and semantic HTML.
- Motion: use short 150–220ms transitions for hover, focus, and drag feedback. Respect reduced-motion preferences.
- Responsive: preserve usable horizontal board scrolling on small screens; controls wrap before they overlap.

## Accessibility

- Meet WCAG AA contrast for normal text (4.5:1) and large text (3:1).
- Every icon-only control needs an accessible name. Keep visible focus states and logical keyboard order.
- Dialogs need a title, `aria-modal`, and a clearly labeled close control.

## Tailwind mapping

Shared semantic utilities (`bg-background`, `text-foreground`, `bg-primary`, `bg-accent`, `bg-destructive`, `border-border`) resolve from CSS variables in `frontend/src/index.css`. Prefer these tokens over literal color values in components.
