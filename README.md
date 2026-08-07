# NoCap

**Offline-first budgeting for iOS and Android** — set monthly caps, log spends fast, and stay honest about what’s left.

NoCap stores everything on-device with SQLite. There are no accounts or cloud sync in v1. Currency defaults to **RD$** (Dominican peso); USD is available in Settings.

Built with **React Native + Expo**, matching the visual system in [`nocap-design 3/`](nocap-design%203/) and the conversion brief in [`REACT_NATIVE_HANDOFF.md`](REACT_NATIVE_HANDOFF.md).

| | |
| --- | --- |
| **Version** | 1.0.0 |
| **Bundle ID** | `com.nocap.budget` (iOS & Android) |
| **Scheme** | `nocap://` |
| **Orientation** | Portrait |

---

## Product principles

1. **Offline-first** — core budgeting works with no network.
2. **Caps over accounts** — monthly category caps and “room left,” not full double-entry banking.
3. **Fast logging** — inline quick-log on Home / category detail; full Add Expense from the center tab.
4. **Honest alerts** — cap warnings when spend actually hits a threshold, not pace projections.
5. **Opt-in AI** — conversational advice is gated on consent + internet; local insights stay on-device.

---

## Features

### Onboarding

1. Welcome  
2. Display name + privacy (on-device insights always on; conversational AI opt-in)  
3. Budget template  
4. Category caps (icon, tint, cap; add/remove categories)

Completing onboarding writes categories and settings only — **no demo seed**. Sample data is opt-in later from Settings.

### Home

- Greeting by display name  
- Cap-alert banner when categories hit the configured % (50 / 80 / 90 / 100)  
- Room-left ring (total spent vs total caps)  
- Compact **spend vs income** bar chart (last 6 months) → History  
- Category rows with CapRings, quick-log (`+`), over/warn badges  
- Insight teaser only for real threshold / over-cap alerts  

### Logging

- **Quick-log** — amount + optional note on one expanded row at a time  
- **Add Expense** modal — amount, category, note, date picker  
- Edit / delete transactions from category detail and Income  

### Categories & caps

- Full CRUD from Settings → Categories & caps  
- Edit cap from category detail  
- Icons + tint (teal / gold / plum / coral)  

### Goals & debt

- Goals: add / edit / delete / contribute toward target  
- Debt: add / edit / delete / log payment; progress from original balance  

### Income

- Log income; month filter; spent / net summary for the month  

### History & trends

- Monthly spend as % of total cap (zero-filled months)  
- Monthly income bars  
- Spend vs income paired bars + net  

### Insights

- Cards for **over cap** and **at threshold %** only (no pace extrapolation)  
- Chat stub requires **AI consent** and **internet**; otherwise clear gate messages  

### Settings

| Setting | Behavior |
| --- | --- |
| Display name | Home greeting |
| Currency | RD$ or USD (`formatMoney` shows decimals for USD) |
| Cap alerts | 50% / 80% / 90% / 100% |
| Conversational AI | Opt-in; needs network to use chat UI |
| Theme | Dark or Light (persisted) |
| Load sample data | Opt-in demo goals / debts / spends |
| Export / import backup | JSON v1 via share sheet / document picker |
| Reset NoCap | Double-confirm wipe → onboarding |

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Runtime | Expo SDK **57**, React Native **0.86**, React **19** |
| Language | TypeScript |
| Navigation | Expo Router (file-based), typed routes |
| UI | Custom design system, Space Grotesk + Manrope, Lucide icons |
| Gradients | `expo-linear-gradient` |
| Charts / rings | `react-native-svg` (`CapRing`, `MonthBarChart`) |
| Data | `expo-sqlite` (WAL), integer **cents** |
| Files | `expo-file-system`, `expo-sharing`, `expo-document-picker` |
| Network gate | `@react-native-community/netinfo` |
| Dates | `@react-native-community/datetimepicker` |

---

## Architecture

```
app/                    Expo Router screens
  (tabs)/               Home, Goals, Insights, Settings (+ Add tab → modal)
  onboarding/           Welcome → permissions → templates → budget-setup
  categories, category/[id], income, debt, history, add-expense

src/
  theme/theme.ts        Dark + light palettes, radius, typography
  hooks/
    DbProvider.tsx      SQLite access, refresh, CRUD helpers
    ThemeProvider.tsx   mode + colors from settings.theme
    OnboardingContext   In-progress onboarding fields
    useAiAvailability   consent ∧ online
  components/           Screen, Card, buttons, CapRing, QuickLogPanel, MonthBarChart, …
  db/
    database.ts         Schema + migrations
    repositories.ts     Queries / writes
    backup.ts           JSON export / import
    types.ts            Domain types
  lib/
    format.ts           Money, dates, progress
    insights.ts         Cap-threshold insight cards
    capAlerts.ts        warning / over levels
```

**State flow:** screens call `useDb()` → repositories → SQLite → `refresh()` updates provider state. Theme reads `settings.theme` and exposes `useTheme().colors` so UI StyleSheets remount with the active palette.

---

## Data model (SQLite)

| Table | Purpose |
| --- | --- |
| `settings` | display name, currency, AI consent, onboarding flag, cap alert %, theme |
| `categories` | name, icon, tint, `cap_cents`, sort |
| `transactions` | expense / income, amount cents, note, date, optional `category_id` |
| `goals` | target / saved cents, due date |
| `debts` | balance, `original_balance_cents`, payment, due date |

**Money:** all amounts are integer **cents**. RD$ displays whole units; USD shows two decimals.

**Backup:** versioned JSON (`BACKUP_VERSION = 1`) with settings + categories + transactions + goals + debts. Import replaces local rows after confirm.

---

## Screens map

| Route | Role |
| --- | --- |
| `/onboarding/*` | First-run setup |
| `/(tabs)` | Home |
| `/(tabs)/goals` | Savings goals |
| `/(tabs)/insights` | Cap alerts + AI gate |
| `/(tabs)/settings` | Preferences & tools |
| `/add-expense` | Full expense modal |
| `/categories`, `/category/[id]` | Caps & history per category |
| `/income`, `/debt`, `/history` | Income, debt, trends |

---

## Design system

- **Typography:** Space Grotesk (display / amounts), Manrope (UI / body)  
- **Accents:** teal (on-track), gold (caution / income), plum (goals / debt), coral (over)  
- **Themes:** dark (default) and cool-neutral light; switch in Settings  
- **Reference:** HTML gallery in `nocap-design 3/`, tokens originally from `styles.css`

---

## Getting started

**Requirements:** Node 20+, Expo Go or iOS Simulator / Android emulator.

```bash
npm install
npm start
```

| Script | Command |
| --- | --- |
| Dev server | `npm start` |
| iOS | `npm run ios` |
| Android | `npm run android` |
| Web | `npm run web` |

Then press `i` / `a` in the terminal, or scan the QR code with Expo Go.

---

## Out of scope (v1)

- Live conversational AI / networked advice (UI stub only when consented + online)  
- Accounts, cloud sync, multi-device  
- Full accounting / bank linking  

Future AI analysis of monthly data is intentional later work; current Insights stay local and threshold-based.

---

## Related docs

| File | Contents |
| --- | --- |
| [`REACT_NATIVE_HANDOFF.md`](REACT_NATIVE_HANDOFF.md) | Design → RN conversion brief |
| [`BACKLOG.md`](BACKLOG.md) | Feature checklist (most P0–P3 items completed) |
| [`nocap-design 3/`](nocap-design%203/) | Static HTML design reference |

---

## License

Private project — see repository settings for access.
