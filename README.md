# NoCap

Offline-first budgeting for iOS and Android — set monthly caps, log spends fast, and stay honest about what’s left.

Built with **React Native + Expo**, using the design system in `nocap-design 3/` and the conversion brief in `REACT_NATIVE_HANDOFF.md`.

## Features

- **Onboarding** — welcome, AI consent, budget templates, and per-category caps
- **Home dashboard** — room-left summary, category rings, and **inline quick-log** (tap `+` on a row)
- **Add expense** — full log flow from the center tab button (amount, category, note, date)
- **Goals & debt** — progress tracking with local data
- **Insights** — on-device pace / room / payoff cards; conversational chat is stubbed for now
- **Settings** — currency, AI toggle, links to income, debt, and history
- **Offline SQLite** — no accounts or backend in v1; amounts stored as integer cents

## Stack

| Layer | Choice |
| --- | --- |
| App | Expo SDK 57, TypeScript, Expo Router |
| UI | Design tokens from `styles.css`, Space Grotesk + Manrope, Lucide icons |
| Data | `expo-sqlite` (local only) |
| Charts / rings | `react-native-svg` |

## Getting started

```bash
npm install
npm start
```

Then press `i` for iOS Simulator, `a` for Android emulator, or scan the QR code with Expo Go.

## Project layout

```
app/                 # Screens & navigation (expo-router)
src/theme/           # Colors, radius, typography
src/components/      # Shared UI (Card, CapRing, QuickLogPanel, …)
src/db/              # SQLite schema & repositories
src/hooks/           # DbProvider, onboarding state
src/lib/             # Money formatting, insights math
nocap-design 3/      # HTML design reference
REACT_NATIVE_HANDOFF.md
```

## Design notes

- Dark theme only for v1 (tokens match the HTML gallery)
- Currency defaults to **RD$**
- Conversational AI advice is opt-in in Settings but the Insights input is non-functional until a later release

## License

Private project — see repository settings for access.
