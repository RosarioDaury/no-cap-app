# NoCap — React Native conversion brief

Source: `nocap-design/` — 13 static HTML screens + `styles.css` (single design-token source).
Goal: rebuild these as React Native screens/components, preserving the token system, component
inventory, and the quick-log interaction described below. Treat `styles.css` as the theme file —
every value below is taken directly from it.

## Tech context
- Offline-first budgeting app, local SQLite, no backend/accounts for v1
- Target: iOS + Google Play
- Icons in the HTML use Tabler Icons (`ti ti-*` webfont) — use `@tabler/icons-react-native` or
  swap for an equivalent icon set (Feather/Lucide) if Tabler RN support is thin
- Fonts: **Space Grotesk** (display/headers/numbers) + **Manrope** (body/UI text) — both on
  Google Fonts, bundle via `expo-font` or `react-native-vector-icons`-style asset linking

## Design tokens → theme object
Convert `:root` CSS variables in `styles.css` into a single `theme.ts`:

```js
export const colors = {
  bgApp: '#0C0E11',
  surface: '#16191E',
  surfaceAlt: '#1D2127',
  border: '#2B3038',
  textPrimary: '#EDEFF2',
  textSecondary: '#9AA2AC',
  textMuted: '#5C636D',

  teal:  { 900:'#003B3E',700:'#0891A8',500:'#22D3EE',300:'#7EE8F5',100:'#B8F3FA',50:'#0E2A2E' },
  gold:  { 700:'#B45309',500:'#F5A623',300:'#FBC55C',100:'#FDE0A6',50:'#2A2013' },
  plum:  { 700:'#5B21B6',500:'#8B5CF6',300:'#B9A6FA',100:'#DCD1FC',50:'#211A38' },
  coral: { 700:'#9F1239',500:'#FB4463',300:'#FB8598',100:'#FDC8D2',50:'#2A1420' },

  chrome1: '#3B4148', chrome2: '#1C1F24', chrome3: '#0A0B0D',
};

export const radius = { sm: 12, md: 16, lg: 26, pill: 999 };

export const typography = {
  display: 'SpaceGrotesk-SemiBold',   // headers, ring labels, big amounts
  ui:      'Manrope-Regular',         // body
  uiMedium:'Manrope-SemiBold',        // row titles, buttons
  eyebrow: 11, // uppercase, letter-spacing 1, weight 700, textMuted
};
```

**Color usage by meaning, not just name** — keep this mapping when building components:
| Token | Meaning | Used for |
|---|---|---|
| `teal` | primary / positive / on-track | primary buttons, "room left" ring, active nav, quick-log accent |
| `gold` | caution / templates / AI insight | groceries-type mid-cap rings, template screen, insight cards |
| `plum` | goals / debt | goals screen, debt tracker |
| `coral` | over-cap / warning | over-budget rings and rows |

## Component inventory (build these once, reuse everywhere)
Map CSS classes → RN components:

| CSS class | RN component | Notes |
|---|---|---|
| `.card` / `.card-flat` / `.card-tint-*` | `<Card variant="default\|flat\|tint" tint="teal\|gold\|plum\|coral">` | gradient background — use `expo-linear-gradient`, top-to-bottom, surface→surfaceAlt |
| `.btn-primary` | `<ButtonPrimary>` | chrome gradient (chrome1→chrome2→chrome3, 145deg) via `expo-linear-gradient`, `shadowColor` + `elevation` for the glow, 1px border `rgba(255,255,255,0.1)` |
| `.btn-secondary` / `.btn-ghost` | `<ButtonSecondary>` / `<ButtonGhost>` | flat, no gradient |
| `.btn-metal-circle` | `<QuickAddButton>` | 34x34 circle, same chrome gradient, toggles between `+` and `x` icon based on expanded state |
| `.chip` | `<Chip selected={bool}>` | selected = teal-tinted background + border |
| `.row` | `<ListRow icon title subtitle value onPress>` | used in category lists, transaction lists, settings |
| ring SVGs (`<svg><circle>`) | `<CapRing progress={0-1} color tint>` | use `react-native-svg`; replicate `stroke-dasharray`/`stroke-dashoffset` math: `circumference = 2 * Math.PI * r`, `dashoffset = circumference * (1 - progress)` |
| `.quicklog` panel | `<QuickLogPanel category onSubmit onCancel>` | see interaction spec below — this is the most important custom component |
| `.bottomnav` | RN bottom tab navigator, custom `tabBarIcon`/`tabBarButton` to match glow-on-active style |

## Critical interaction: inline quick-log (not a separate screen)
This is the main behavioral change from a typical CRUD form and needs to be built as **local
component state**, not a navigation route:

- Each category row on Home and the category detail screen has a small circular quick-add button
- Tapping it toggles that row into an **expanded state** (icon flips to `x`), revealing an inline
  amount input + "Log to [category]" button *directly below that row*, pushing the rows below it
  down (use `LayoutAnimation` or `Animated`/`Reanimated` for the expand/collapse)
- Only one row should be expanded at a time — track `expandedCategoryId: string | null` in the
  parent list's state, not per-row state
- Submitting clears the field, collapses the row, and updates that category's ring/spent total
  immediately (optimistic update against local SQLite)
- The full-screen "Add expense" flow (category picker + note + date) stays as a fallback for
  logging without a pre-selected category — reachable from the bottom-tab `+` button

## Screen inventory
| # | File | RN screen name | Notes |
|---|---|---|---|
| 1 | `01-onboarding-welcome.html` | `OnboardingWelcome` | static |
| 2 | `02-onboarding-permissions.html` | `OnboardingAIConsent` | toggle switch currently unstyled placeholder — use RN `Switch` themed to teal |
| 3 | `03-budget-setup.html` | `BudgetSetup` | dynamic list, "Add category" opens a modal/sheet |
| 4 | `04-budget-templates.html` | `BudgetTemplates` | selectable cards, one `selected` state |
| 5 | `05-home-dashboard.html` | `HomeDashboard` | contains quick-log panel — see above |
| 6 | `06-add-expense.html` | `AddExpenseModal` | present as modal/bottom sheet, not full push screen |
| 7 | `07-income.html` | `IncomeTracking` | separate from expense totals, per original product decision |
| 8 | `08-goals.html` | `GoalsList` | progress bars, plum tint |
| 9 | `09-debt-tracker.html` | `DebtTracker` | shares progress-bar component with Goals |
| 10 | `10-history-trends.html` | `HistoryTrends` | bar chart — use `react-native-svg` or `victory-native`, not a heavy charting lib given offline/perf constraints |
| 11 | `11-category-detail.html` | `CategoryDetail` | has its own quick-log panel, category pre-selected |
| 12 | `12-ai-insights.html` | `AIInsights` | card list + free-text input; see architecture note below |
| 13 | `13-settings.html` | `Settings` | standard grouped list |

Bottom tab bar (5 items, visible on Home/Goals/Insights/Settings, `+` opens Add Expense modal):
`Home · + · Goals · Insights · Settings`

## Open architectural decision to flag back to the user
The AI insights screen has two tiers described in earlier design conversation:
1. **On-device pattern insights** (pace projections, "consistent room" detection) — pure math on
   local SQLite data, no network needed, safe to build first
2. **Conversational AI advice** (the free-text input at the bottom of that screen) — needs either
   an on-device model or an API call, which breaks the "fully offline" constraint unless it's
   explicitly optional and network-gated. The permissions screen (#2) already stages this as an
   opt-in toggle — wire the free-text input to be disabled/hidden until that permission is granted.

## Assets not yet in the HTML
- App icon / splash screen
- Empty states (no categories yet, no transactions yet, no goals yet)
- Error/loading states for the quick-log submit action
- Dark-mode-only currently — no light theme variant exists yet if that's wanted later
