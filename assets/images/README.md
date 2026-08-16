# NoCap brand assets

Shipped direction: **lid-off** (rising bars out of an open vessel).

| File | Use |
| --- | --- |
| `lid-off/app-icon-1024.png` | iOS / Play listing icon (`expo.icon`) |
| `lid-off/app-icon-maskable-512.png` | Android adaptive foreground (60% safe zone) |
| `lid-off/mark-512-transparent.png` | splash and font-loading screen |
| `lid-off/favicon-32.png` | browser tab (`web.favicon`); also `public/favicon-32.png` |
| `lid-off/favicon-16.png` | browser tab 16px; also `public/favicon-16.png` |
| `lid-off/app-icon-apple-touch-180.png` | copied to `public/apple-touch-icon.png` |

In-app mark is `BrandMark` (`src/components/BrandMark.tsx`), drawn from `mark-on-dark` / `mark-on-light` so it follows light and dark theme. `BrandLockup` is the symbol plus the NoCap wordmark.

## Rules

- Clearspace: half the symbol's height on every side; never less.
- Minimum sizes: symbol 16px (`BrandMark` uses a thicker stroke under 32px).
- Colors are Nocturne tokens: ground `#161826`, ink `#e9e9ed`, accent `#9184d9` (`#5d5294` on light grounds).
