# CineVault — Brand Identity Guidelines

## Logo Concept

**Direction:** CV Monogram — Aperture + Vault  

The mark fuses the letters **C** and **V** into a single geometric symbol:
- The **C** is an open arc inspired by a camera aperture — cinematic, precise, inviting
- The **V** sits inside as a chevron — representing a vault, depth, discovery
- A horizontal **film-frame accent dash** extends from the opening, implying motion and forward progress

The design is intentional: the open C suggests an invitation to explore, while the contained V implies curated, protected content — a *vault* of cinema.

---

## Logo Versions

| Version | File | Usage |
|---|---|---|
| Horizontal (dark bg) | `cinevault-horizontal-dark.svg` | Main usage on dark surfaces |
| Horizontal (light bg) | `cinevault-horizontal-light.svg` | Print, light surfaces |
| Icon only | `cinevault-icon.svg` | App icons, social avatars, compact spaces |
| Favicon | `favicon.svg` | Browser tabs |

---

## Color System

| Role | Hex | Usage |
|---|---|---|
| **Midnight** | `#0a0a14` | Primary background, text on light |
| **Surface** | `#10101c` | Cards, elevated surfaces |
| **Cyan** | `#00d4ff` | Primary accent, C arc, links, interactive |
| **Cyan Deep** | `#0077b6` | Light-mode accent, reduced intensity |
| **White** | `#ffffff` | V mark, text on dark |
| **Muted** | `#8888aa` | Secondary text, meta |
| **Purple** | `#a855f7` | Secondary accent (tags, badges) |
| **Amber** | `#f59e0b` | Ratings, star highlights |

### Usage Rules
- Cyan is the **only** brand color used in the logo mark
- Purple and amber are **UI-only** — never used in the logo
- On dark backgrounds: white V + cyan C
- On light backgrounds: midnight V + deep cyan C

---

## Typography

### Primary: Inter
- **Weights used:** 300 (Light), 400 (Regular), 600 (Semi-Bold), 700 (Bold)
- **Source:** [Google Fonts](https://fonts.google.com/specimen/Inter)

### Wordmark Styling
- **"Cine"** → Inter Light 300 | subtle, cinematic
- **"Vault"** → Inter Bold 700 | strong, confident
- Letter-spacing: `+1px`
- The weight contrast creates visual hierarchy within the name

### Fallback Stack
```
Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif
```

---

## Spacing Rules

### Clear Space
Minimum clear space around the logo = **½ the height of the symbol mark** on all sides.

### Minimum Size
| Version | Min Width |
|---|---|
| Horizontal lockup | 160px |
| Icon only | 24px |
| Favicon | 16px |

---

## Usage Guidelines

### ✅ Do
- Use on solid backgrounds (dark preferred)
- Maintain aspect ratio
- Keep minimum clear space
- Use the appropriate version for the background

### ❌ Don't
- Add drop shadows or outer glow
- Rotate or skew the mark
- Change the stroke weights
- Place on busy/patterned backgrounds
- Recolor outside the defined palette
- Add gradients to the mark

---

## Favicon

The favicon uses a simplified version of the CV mark on a dark rounded-corner square:
- 6px corner radius for modern browser tab appearance
- Reduced stroke weights for legibility at 16×16 and 32×32
- The accent dash is removed at this size for clarity

---

## File Locations

```
webapp/frontend/static/logo/
├── cinevault-horizontal-dark.svg    # Primary logo
├── cinevault-horizontal-light.svg   # Light background variant
├── cinevault-icon.svg               # Symbol mark only
└── favicon.svg                      # Browser favicon
```
