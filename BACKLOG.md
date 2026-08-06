# NoCap — remaining work backlog

Everything needed to take the app from a working demo shell to a fully functional offline budgeting app.

**Current state:** All 13 screens exist. Onboarding, Home quick-log, and Add Expense write to SQLite. Goals/debts are mostly seeded display-only. Several Settings rows are stubs.

**Out of scope for offline v1** (do not treat as blockers): live conversational AI / network advice, accounts & cloud sync, light theme.

---

## How to use this file

| Priority | Meaning |
|----------|---------|
| **P0 — Blocker** | Cannot trust the app for real money / real first-run |
| **P1 — High** | Major feature incomplete or broken for day-to-day use |
| **P2 — Medium** | Partial vs design / handoff; polish that affects UX |
| **P3 — Low** | Nice-to-have, cleanup, branding, a11y |

Suggested order: **P0 → P1 → P2 → P3**.

---

## P0 — Blockers

### 1. Stop auto-seeding demo data after real onboarding — DONE

| | |
|--|--|
| **Status** | Completed |
| **What changed** | Removed auto-seed from `completeOnboarding` and app launch. Added opt-in `loadSampleData({ force })` and Settings → **Load sample data**. Onboarding clears goals/debts/txns and keeps only user categories. |
| **Files** | [`src/db/repositories.ts`](src/db/repositories.ts), [`src/hooks/DbProvider.tsx`](src/hooks/DbProvider.tsx), [`app/(tabs)/settings.tsx`](app/(tabs)/settings.tsx) |
| **Acceptance criteria** | |
| | - [x] Completing onboarding leaves only the categories/caps the user set |
| | - [x] Empty states show for Goals / Debt / History when there is no user data |
| | - [x] “Load sample data” in Settings for demos |
| | - [x] No launch-time auto-seed |

---

### 2. Categories & caps editor (post-onboarding) — DONE

| | |
|--|--|
| **Status** | Completed |
| **What changed** | New `/categories` screen (add/edit/delete, icon + tint + cap). Settings links there. Category detail has **Edit cap**. `deleteCategory` nulls txn `category_id` then deletes. |
| **Files** | [`app/categories.tsx`](app/categories.tsx), [`app/category/[id].tsx`](app/category/[id].tsx), [`app/(tabs)/settings.tsx`](app/(tabs)/settings.tsx), [`src/db/repositories.ts`](src/db/repositories.ts), [`src/hooks/DbProvider.tsx`](src/hooks/DbProvider.tsx) |
| **Acceptance criteria** | |
| | - [x] Dedicated screen from Settings |
| | - [x] Edit name, icon, tint, monthly cap; add; delete |
| | - [x] Category detail **Edit cap** |
| | - [x] Home refreshes via DbProvider |

---

### 3. Goals — full CRUD + contribute — DONE

| | |
|--|--|
| **Status** | Completed (awaiting commit confirmation) |
| **What changed** | Goals `+` opens add sheet; tap goal to edit; Contribute adds to `saved_cents`; Delete with confirm. Repo: `updateGoal`, `contributeToGoal`, `deleteGoal`. Safer goals sort without `NULLS LAST`. |
| **Files** | [`app/(tabs)/goals.tsx`](app/(tabs)/goals.tsx), [`src/db/repositories.ts`](src/db/repositories.ts), [`src/hooks/DbProvider.tsx`](src/hooks/DbProvider.tsx) |
| **Acceptance criteria** | |
| | - [x] `+` opens add-goal sheet |
| | - [x] Tap goal → edit / delete |
| | - [x] Contribute updates saved amount + progress |
| | - [x] Empty state when no goals |
| | - [x] Repo update/delete/contribute |

---

### 4. Debt tracker — full CRUD + payments — DONE

| | |
|--|--|
| **Status** | Completed (awaiting commit confirmation) |
| **What changed** | Add/edit/delete debts; log payment reduces balance; `original_balance_cents` for real % paid; total remaining summary + tip. |
| **Files** | [`app/debt.tsx`](app/debt.tsx), [`src/db/database.ts`](src/db/database.ts), [`src/db/types.ts`](src/db/types.ts), [`src/db/repositories.ts`](src/db/repositories.ts), [`src/hooks/DbProvider.tsx`](src/hooks/DbProvider.tsx) |
| **Acceptance criteria** | |
| | - [x] Add / edit / delete debt |
| | - [x] Log payment reduces balance |
| | - [x] Total remaining summary |
| | - [x] Progress from original vs remaining |
| | - [x] Repo update/delete/payment helpers |

---

## P1 — High priority

### 5. Transaction edit & delete — DONE

| | |
|--|--|
| **Status** | Completed (awaiting commit confirmation) |
| **What changed** | `updateTransaction` / `deleteTransaction`; tap expense on category detail or income row to edit amount/note/date (and category for expenses) or delete with confirm. Income “This month” total now filters by calendar month. |
| **Files** | [`src/db/repositories.ts`](src/db/repositories.ts), [`src/hooks/DbProvider.tsx`](src/hooks/DbProvider.tsx), [`app/category/[id].tsx`](app/category/[id].tsx), [`app/income.tsx`](app/income.tsx) |
| **Acceptance criteria** | |
| | - [x] update/delete in repo + provider |
| | - [x] Tap txn → edit / delete |
| | - [x] Rings/totals refresh after change |
| | - [x] Confirm before delete |

---

### 6. Cap alerts that actually work — DONE

| | |
|--|--|
| **Status** | Completed (awaiting commit confirmation) |
| **What changed** | Settings picks 50/80/90/100% threshold. Home shows alert banner + gold/coral row badges when categories hit threshold or go over. In-app only (no push notifications yet). |
| **Files** | [`src/lib/capAlerts.ts`](src/lib/capAlerts.ts), [`app/(tabs)/settings.tsx`](app/(tabs)/settings.tsx), [`app/(tabs)/index.tsx`](app/(tabs)/index.tsx) |
| **Acceptance criteria** | |
| | - [x] User can set threshold |
| | - [x] In-app approaching/over state on Home |
| | - [x] Banner summarizing alerts |

---

### 7. Expense date picker — DONE

| | |
|--|--|
| **Status** | Completed (awaiting commit confirmation) |
| **What changed** | Add Expense date row opens `@react-native-community/datetimepicker`; selected date saved on the transaction; defaults to today. |
| **Files** | [`app/add-expense.tsx`](app/add-expense.tsx), `package.json` / lockfile, `app.json` plugin |
| **Acceptance criteria** | |
| | - [x] Date row opens picker |
| | - [x] Selected date saved |
| | - [x] Default today |

---

### 8. Income — correct month totals + design parity — DONE

| | |
|--|--|
| **Status** | Completed (awaiting commit confirmation) |
| **What changed** | Month-filtered income total; Spent (category month spend) + Net (income − spent); Sources list shows this month’s income rows. |
| **Files** | [`app/income.tsx`](app/income.tsx) |
| **Acceptance criteria** | |
| | - [x] Monthly income filtered by calendar month |
| | - [x] Show spent and net |
| | - [x] Edit/delete already wired (task 5) |

---

### 9. Local backup export & import — DONE

| | |
|--|--|
| **Why** | Offline-first needs recovery. Welcome “Import a backup” and Settings Export/Import are stubs / Alerts. |
| **Files** | [`app/onboarding/welcome.tsx`](app/onboarding/welcome.tsx), [`app/(tabs)/settings.tsx`](app/(tabs)/settings.tsx), [`src/db/backup.ts`](src/db/backup.ts) |
| **Done** | JSON v1 backup via share sheet; import replaces all data after confirm; Welcome import sets onboarding complete and lands on tabs; schema version validated |

---

### 10. Currency & display-name settings

| | |
|--|--|
| **Why** | Currency only shows an Alert. Display name is hardcoded to `"Alex"` with no UI to change it (Home greets by name). |
| **Files** | [`app/(tabs)/settings.tsx`](app/(tabs)/settings.tsx), [`src/hooks/DbProvider.tsx`](src/hooks/DbProvider.tsx) (`setSetting` already supports these fields) |
| **Acceptance criteria** | |
| | - Edit display name → Home greeting updates |
| | - Choose currency symbol/code (at least RD$ / USD; formatMoney uses it everywhere) |
| | - Persist via `updateSettings` |

---

## P2 — Medium

### 11. Wire Insights card actions

| | |
|--|--|
| **Why** | Lines like “Adjust cap · Set a mid-month alert”, “Move to Emergency fund”, “See payoff plan” are non-interactive text. |
| **Files** | [`app/(tabs)/insights.tsx`](app/(tabs)/insights.tsx), [`src/lib/insights.ts`](src/lib/insights.ts) |
| **Acceptance criteria** | |
| | - Actions navigate to the right screen (category edit, goals, debt) or open a sheet |
| | - Insights model includes actionable `href` / action ids, not just copy |

---

### 12. History & trends closer to design

| | |
|--|--|
| **Why** | Basic monthly bars only. HTML has richer vs-cap / over-under context. Months with zero spend may be missing from the chart. |
| **Files** | [`app/history.tsx`](app/history.tsx), [`src/db/repositories.ts`](src/db/repositories.ts) (`monthlyExpenseTotals`), design: [`nocap-design 3/10-history-trends.html`](nocap-design%203/10-history-trends.html) |
| **Acceptance criteria** | |
| | - Fill empty months in the last N months |
| | - Show spend vs total caps (or % of budget) where it fits the design |
| | - Clear over/under labeling |

---

### 13. Onboarding budget-setup polish

| | |
|--|--|
| **Why** | Add category only asks for a name (default icon/tint). No remove. Design allows “ranged cap” (e.g. 10k–15k) which is unsupported. |
| **Files** | [`app/onboarding/budget-setup.tsx`](app/onboarding/budget-setup.tsx), [`src/db/types.ts`](src/db/types.ts) if schema needs min/max cap |
| **Acceptance criteria** | |
| | - Pick icon + tint when adding a category |
| | - Remove a category row before continuing |
| | - Decide: implement ranged caps **or** drop from design and keep single cap (document choice) |
| | - Step labels consistent (permissions “1 of 4” vs templates “1 of 3”) |

---

### 14. Gate Insights chat stub on AI consent

| | |
|--|--|
| **Why** | Chat input is always disabled. Handoff: show/enable only when conversational AI is opted in (still stub OK for v1). |
| **Files** | [`app/(tabs)/insights.tsx`](app/(tabs)/insights.tsx), settings `aiConsent` |
| **Acceptance criteria** | |
| | - If consent off: hide input or show “Enable in Settings” |
| | - If consent on: show stub with “Coming soon” (still no network) |

---

### 15. Bottom sheets for Add Expense / add category

| | |
|--|--|
| **Why** | Plan specified `@gorhom/bottom-sheet`; package is installed but unused. Stack modal + RN `Modal` are used instead. |
| **Files** | [`package.json`](package.json), [`app/add-expense.tsx`](app/add-expense.tsx), onboarding/settings add-category flows |
| **Acceptance criteria** | |
| | - Either migrate to `@gorhom/bottom-sheet` **or** remove the unused dependency |
| | - Gesture dismiss + keyboard-friendly sheet behavior |

---

### 16. Quick-log notes (optional product gap)

| | |
|--|--|
| **Why** | Full Add Expense supports notes; quick-log is amount-only. |
| **Files** | [`src/components/QuickLogPanel.tsx`](src/components/QuickLogPanel.tsx) |
| **Acceptance criteria** | |
| | - Optional note field on quick-log, or explicit “more options” → Add Expense with category preselected |

---

### 17. Accessibility labels

| | |
|--|--|
| **Why** | Icon-only tab bar and quick-add controls have no `accessibilityLabel` / roles. |
| **Files** | [`app/(tabs)/_layout.tsx`](app/(tabs)/_layout.tsx), [`src/components/Buttons.tsx`](src/components/Buttons.tsx), list rows |
| **Acceptance criteria** | |
| | - Every icon button and tab has a spoken label |
| | - Screen reader can complete: open quick-log → enter amount → submit |

---

### 18. Home insight teaser (design parity)

| | |
|--|--|
| **Why** | HTML home may include a bottom insight teaser; RN Home focuses on caps only. |
| **Files** | [`app/(tabs)/index.tsx`](app/(tabs)/index.tsx), [`nocap-design 3/05-home-dashboard.html`](nocap-design%203/05-home-dashboard.html) |
| **Acceptance criteria** | |
| | - Match design if teaser exists; otherwise mark N/A after visual check |

---

## P3 — Low / polish

### 19. Real app icon & splash

| | |
|--|--|
| **Why** | Expo defaults only; splash background is already dark in `app.json` but art is generic. |
| **Files** | [`assets/`](assets/), [`app.json`](app.json) |
| **Acceptance criteria** | Branded icon + splash approved for store listing prep |

---

### 20. Remove dead Expo template leftovers

| | |
|--|--|
| **Why** | Unused template files and unused Tabler package add noise. |
| **Files** | [`components/EditScreenInfo.tsx`](components/EditScreenInfo.tsx), [`components/Themed.tsx`](components/Themed.tsx), [`constants/Colors.ts`](constants/Colors.ts), etc.; `@tabler/icons-react-native` in [`package.json`](package.json) |
| **Acceptance criteria** | |
| | - Delete unused template components **or** migrate icons to Tabler and drop Lucide |
| | - `package.json` only lists used deps (`@gorhom/bottom-sheet` handled in task 15) |

---

### 21. Reset / clear local data

| | |
|--|--|
| **Why** | No Settings path to wipe DB and re-run onboarding. |
| **Files** | [`app/(tabs)/settings.tsx`](app/(tabs)/settings.tsx), new reset helper in `src/db/` |
| **Acceptance criteria** | |
| | - “Reset NoCap” with double confirm |
| | - Clears all tables / settings; routes back to welcome |

---

### 22. Money formatting edge cases

| | |
|--|--|
| **Why** | `formatMoney` currently drops fractional cents (whole units only). Fine for RD$ pesos-as-cents storage if always whole, but document or support decimals if USD cents matter. |
| **Files** | [`src/lib/format.ts`](src/lib/format.ts) |
| **Acceptance criteria** | Document storage unit; show decimals when currency needs them |

---

### 23. SQLite goals query robustness

| | |
|--|--|
| **Why** | `ORDER BY due_date ASC NULLS LAST` may be fragile depending on SQLite / expo-sqlite version. |
| **Files** | [`src/db/repositories.ts`](src/db/repositories.ts) `listGoals` |
| **Acceptance criteria** | Sorting works on iOS + Android without SQL errors |

---

### 24. Theme row honesty

| | |
|--|--|
| **Why** | Settings shows Theme → “Dark” with empty press. Dark-only is fine per handoff. |
| **Files** | [`app/(tabs)/settings.tsx`](app/(tabs)/settings.tsx) |
| **Acceptance criteria** | Remove chevron / disable row, or label “Dark (only)” so it doesn’t look broken |

---

## Already done (do not re-build)

Use this as a checklist of what **not** to redo:

- [x] Expo + TypeScript + Expo Router scaffold  
- [x] Design tokens / shared components (Card, buttons, CapRing, QuickLogPanel, etc.)  
- [x] SQLite schema for settings, categories, transactions, goals, debts  
- [x] Onboarding: welcome → permissions → templates → budget setup → tabs  
- [x] Home: room left, category rings, inline quick-log (single expanded row)  
- [x] Add Expense modal from center tab `+`  
- [x] Category detail with quick-log + txn list (read)  
- [x] Goals / Debt / History / Insights / Settings **screens exist**  
- [x] On-device Insights cards (pace / room / debt math)  
- [x] Insights chat stub (non-functional by product choice)  
- [x] AI consent Switch in onboarding + Settings  
- [x] Safe areas / dark status bar  

---

## Dependency notes

| Package | Status | Action |
|---------|--------|--------|
| `expo-sqlite` | Used | Keep |
| `expo-linear-gradient`, `react-native-svg`, Google fonts | Used | Keep |
| `lucide-react-native` | Used | Keep **or** swap to Tabler |
| `@tabler/icons-react-native` | Unused | Use or remove |
| `@gorhom/bottom-sheet` | Unused | Use or remove |
| Missing for P1 features | — | Consider `expo-notifications`, date picker (`@react-native-community/datetimepicker` or Expo equivalent), share/document picker for backup |

---

## Tracking checklist (copy into issues / project board)

```
P0
[x] 1. Stop auto-seed / opt-in sample data
[x] 2. Categories & caps editor + Edit cap
[x] 3. Goals CRUD + contribute
[x] 4. Debt CRUD + payments

P1
[x] 5. Transaction edit & delete
[x] 6. Cap alerts
[x] 7. Expense date picker
[x] 8. Income month filter + spent/net
[x] 9. Export / import backup
[ ] 10. Currency + display name settings

P2
[ ] 11. Insights action links
[ ] 12. History vs design
[ ] 13. Onboarding setup polish
[ ] 14. AI consent gates chat stub
[ ] 15. Bottom sheets or drop unused dep
[ ] 16. Quick-log notes / deep link to Add Expense
[ ] 17. Accessibility labels
[ ] 18. Home insight teaser (if in design)

P3
[ ] 19. App icon & splash
[ ] 20. Remove template leftovers / unused packages
[ ] 21. Reset local data
[ ] 22. Money format / decimals policy
[ ] 23. Goals SQL sort robustness
[ ] 24. Theme row honesty
```

---

*Generated from the functional completeness review (Aug 2026). Companion canvas: Cursor canvases → `nocap-functional-review.canvas.tsx`.*
