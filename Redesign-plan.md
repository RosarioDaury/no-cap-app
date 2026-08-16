# NoCap redesign — staged implementation plan

Direction: **2a Focus structure + 2b log sheet**. Reference mock: `NoCap Redesign.dc.html` (options 2a, 2b's second phone, 2d).

Ground rules
- No new dependencies. Everything below is expressible with your current stack (Expo Router, `expo-linear-gradient`, `react-native-svg`, lucide, `KeyboardSheet`).
- Keep `formatMoney` / integer cents / `progressRatio` / `capAlertLevel` as-is. This is a presentation + navigation change, not a data change.
- Each stage is shippable on its own.

---

## Stage 0 — tokens & type scale (`src/theme/theme.ts`)

The palette stays. Two additions and one correction.

**Add a type scale** so screens stop hand-rolling `fontSize` (today Home alone uses 10, 11, 12.5, 13, 14, 22):

```ts
export const type = {
  hero:      { fontFamily: typography.display,    fontSize: 52, letterSpacing: -1.5 },
  display:   { fontFamily: typography.display,    fontSize: 28, letterSpacing: -0.6 },
  title:     { fontFamily: typography.display,    fontSize: 24, letterSpacing: -0.4 },
  amountLg:  { fontFamily: typography.display,    fontSize: 21 },
  amountSm:  { fontFamily: typography.display,    fontSize: 14 },
  rowTitle:  { fontFamily: typography.uiSemiBold, fontSize: 13.5 },
  body:      { fontFamily: typography.uiMedium,   fontSize: 13, lineHeight: 20 },
  meta:      { fontFamily: typography.uiMedium,   fontSize: 11 },
  eyebrow:   { fontFamily: typography.uiBold,     fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  tab:       { fontFamily: typography.uiBold,     fontSize: 9,  letterSpacing: 0.4 },
} as const;
```

Note the floor moved up: body copy is 13, metadata 11, and nothing below 9 (tab labels only). Today's 10px `Eyebrow` at `letterSpacing: 1` is the one exception that stays small — it is all-caps and short.

**Add radius `xl: 18`** (grouped list container) to `radius`.

**Add a glow token** for the FAB so it is not repeated inline:
```ts
export const glow = { teal: { shadowColor: '#22D3EE', shadowOpacity: 0.28, shadowRadius: 22, shadowOffset: { width: 0, height: 0 }, elevation: 8 } };
```

Everything else (`bgApp #0C0E11`, `surface #16191E`, `surfaceAlt #1D2127`, `border #2B3038`, text `#EDEFF2 / #9AA2AC / #5C636D`, teal/gold/plum/coral scales) is unchanged and already correct in both themes.

---

## Stage 1 — navigation shell (`app/(tabs)/_layout.tsx`)

Target shape: **Home · Money · [FAB] · Goals · Insights**, Settings moves to a gear in each screen header.

1. Delete the `add` tab screen (`app/(tabs)/add.tsx` and its `Tabs.Screen`). Replace with a floating button rendered *outside* `Tabs` — in `_layout.tsx` wrap `<Tabs>` in a `View {flex:1}` and absolutely position the FAB:
   - 60×60, `borderRadius: 30`, `bottom: 74 + insets.bottom`, `left: '50%'`, `transform: [{ translateX: -30 }]`
   - fill: `LinearGradient` `[chrome1, chrome2, chrome3]` at 135°, border `1px rgba(126,232,245,0.35)`, `glow.teal`
   - `Plus` size 26, color `colors.chromeText`
   - `onPress: () => router.push('/add-expense')`
2. Add `tabBarShowLabel: true` with `type.tab` styling — labels HOME / MONEY / GOALS / INSIGHTS, active `colors.teal[500]`, inactive `colors.textMuted`. Drop the `iconActive` surface pill; the label plus color is enough hierarchy.
3. Tab bar keeps `height: 62 + insets.bottom`; add a middle spacer tab item of width 60 so icons don't sit under the FAB.
4. Move Settings: add a header gear (34×34, `radius 11`, `surface`, `1px border`) on Home and Money that pushes `/(tabs)/settings`, and keep the settings route registered but hidden with `href: null` on its `Tabs.Screen`.

**New route: `app/(tabs)/money.tsx`** — a segmented Income / Debt / Trends screen that replaces the three Settings → More links. Do not duplicate logic: extract the bodies of `app/income.tsx`, `app/debt.tsx`, `app/history.tsx` into `src/screens/IncomePane.tsx`, `DebtPane.tsx`, `TrendsPane.tsx` (props: none; they already read `useDb()`), then:

```tsx
const [pane, setPane] = useState<'income'|'debt'|'trends'>('income');
```

Keep the old routes as thin wrappers rendering the same panes so existing `router.push('/income')` calls and insight actions keep working.

Segmented control: container `surface`, `1px border`, `radius 12`, `padding 3`; active item `surfaceAlt`, `radius 9`, `type.rowTitle` at 12px `textPrimary`; inactive `textMuted`.

Also delete the Income / Debt / History rows from the Settings **More** group once Money ships.

---

## Stage 2 — Home (`app/(tabs)/index.tsx`)

The current screen is five cards of equal weight. Replace with one hero + one grouped list.

**Header row** — `BrandMark` 20 + month name (`type.title` at 15px, `textSecondary`) on the left, gear on the right. Drop the wordmark and the `formatDisplayDate()` eyebrow; the greeting moves out of the hero entirely (keep it if you want, at `type.meta`).

**Hero (no card, no ring)**
```
eyebrow      SAFE TO SPEND · PER DAY        textMuted
hero         RD$483                          textPrimary, type.hero
body         RD$7,250 room left · 15 days to go   textSecondary
bar          6px, radius 3, track surfaceAlt, fill gradient [teal700 → teal500], width = overallProgress
meta row     "RD$19,750 spent"  ·  "73% of RD$27,000"    10.5px textMuted, space-between
```
Per-day figure: `room / max(1, daysRemainingInMonth)`, floored to whole units. Add to `src/lib/format.ts`:
```ts
export function daysLeftInMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1;
}
```
When `room === 0`, swap the eyebrow to `OVER YOUR CAPS` and the hero to the overage in `coral[500]`.

**Alert banner** — collapse from a two-line card to one row: `radius 14`, `background rgba(251,68,99,0.08)`, `border 1px rgba(251,68,99,0.22)`, `Bell` 15 `coral[500]`, text `600 12.5 / coral[300]` reading `Fun is over · Groceries at 82%`, trailing chevron, `onPress → /(tabs)/insights`. Gold variant (`rgba(245,166,35,…)`, `gold[300]`) when nothing is over.

**Caps as one grouped list** — replace the per-category `<Card>` with a single container (`surface`, `1px border`, `radius xl`, `overflow hidden`) and rows separated by `1px border`. Per row:
- 30×30 icon chip, `radius 10`, background `tint[50]`, `CategoryIcon` 15 at `tint[500]`
- name `type.rowTitle`; `OVER` pill (`tint 6px radius`, `700 9.5`, `coral[300]`) when over
- sub `RD$9,850 of RD$12,000` in `type.meta` `textMuted`
- right column: **money left** `type.amountSm` (teal300 ok / gold300 warning / coral500 over) with `left` / `over` label under it — this replaces the second ring, which duplicated the hero
- `QuickAddButton` unchanged (34→30 to match)
- 4px progress bar under the row, full width, `tint[500]` fill
- over-cap row gets `backgroundColor: 'rgba(251,68,99,0.05)'`

Delete the ring per row and the `Card variant="tint"` per row — colour now lives in the bar and the amount.

**Remove from Home**: the 6-month chart card (it now lives in Money → Trends; the alert banner covers the "am I OK" job) and the insight teaser card (redundant with the banner). Keep `EmptyState` as-is.

---

## Stage 3 — logging (2b sheet, `app/add-expense.tsx`)

Convert the full-screen modal into a bottom sheet on `KeyboardSheet`, with its own keypad so logging never depends on the OS keyboard.

Layout top to bottom:
1. Grabber 38×4 `border`, then row: `LOG A SPEND` eyebrow / `Today, Aug 16 · change` (`type.meta`, opens the existing `DateTimePicker`).
2. Amount, centred, `fontFamily display`, `fontSize 50`, `letterSpacing -1.5`, `colors.teal[300]`, formatted live through `formatMoney`.
3. Category chips, horizontal scroll, **ordered by recency of use** (last 30 days, then the rest). Selected: `rgba(34,211,238,0.12)` fill, `rgba(34,211,238,0.45)` border, `teal[300]` label + 14px `CategoryIcon`. Reuse `Chip` with an `icon` prop.
4. Keypad: 3-column grid, `gap 9`, each key 52 tall, `radius 14`, `surface`, `1px border`, digits `display 22 textPrimary`; `.` and a `Delete` icon key. Pure local state — `raw` string → `parseMoneyInput`.
5. Note row: 40 tall, `radius 14`, `surface`, `Pencil` 14 + `Add a note (optional)`; expands to a `TextInput` on press.
6. CTA 54 tall, `radius pill`, `LinearGradient [teal300 → teal700]`, label `Log RD$1,250 to Groceries`, text `#04262b`, `glow.teal`.
7. Footer line, centred `type.meta textMuted`: `Leaves RD$900 in Groceries this month` — computed from the selected category's remaining cap; switch to `Puts Groceries RD$X over` in `coral[500]` when it would exceed.

`QuickLogPanel` (inline row expansion) stays for the Home `+` buttons — same amount styling, but adopt the same footer line.

---

## Stage 4 — category detail, insights, goals

**`app/category/[id].tsx`** — keep the ring here (it is the one place a single ring is the subject). Changes: header gets the gear-free back row as-is; summary card loses the `Card` chrome in favour of the hero pattern (ring 58 + `type.display` amount + `of RD$12,000 · 82%`); transaction list rows get `type.rowTitle` / `type.meta`; move `Edit cap` from a bottom `ButtonSecondary` to a small text action next to the percentage.

**`app/(tabs)/insights.tsx`** — drop the left-border card treatment. Each insight becomes a hairline-separated block: tone eyebrow in the tone colour, body at `type.body` `textSecondary`, actions as underlined text (`textPrimary` with `1px border` bottom) rather than plum links. Write the bodies with numbers in them — `src/lib/insights.ts` already has cap, spend and threshold; add days-left and per-day figures via `daysLeftInMonth`.

**`app/(tabs)/goals.tsx`** — same grouped-list container as Home caps: icon chip 34, name, `%` in `plum[500]`, 5px `ProgressBar`, `RD$21,000 of RD$50,000` in `type.meta`. Move `Contribute` / `Delete` out of the card body into a swipe or a long-press menu, or keep `Contribute` only and put `Delete` in the edit sheet — two text links per card is what makes the current screen noisy.

---

## Stage 5 — history & onboarding

**Trends pane** (from `app/history.tsx`) — replace the three stacked chart cards with:
- *Spend against cap*: one hairline row per month — month name, status (`in progress` / `RD$2,400 saved` / `over cap` in `teal[700]` / `coral[500]`), `%` right-aligned, then an 8px bar with `19,750 / 27,000` at 11px beside it. This reads faster than a bar chart plus a table of the same numbers.
- *Net by month*: month label, two stacked 7px bars (spend `teal`, income `gold`), signed net right-aligned in `type.amountSm`.
- Keep `MonthBarChart` for the Income pane only.

**Onboarding** (`app/onboarding/*`) — same four steps, restyled:
- Progress becomes 4 hairline segments at the top (3px, `radius 2`, filled `teal[500]`, empty `surfaceAlt`) instead of `Step 1 of 3` text (which is also currently wrong — there are four screens).
- Titles go to `type.display` (28/34) — questions rather than labels: "Your data, your call" stays; "Set your caps" → "How much can each one take this month?"
- Budget-setup rows lose the `Card`: icon chip 32, name, 4px proportional bar showing that cap's share of the total, cap input 86 wide right-aligned in `display 14`.
- Add a live **Total capped** block above the list (`surface`, `radius 16`): total in `type.amountLg` `teal[300]` and a segmented 6px bar of each category's share, with the unassigned remainder in `border` colour.
- Final CTA: `Start tracking August` on the teal gradient, with `You can change every cap later` under it.

---

## Order of work

1. Stage 0 + Stage 1 in one PR (tokens + shell + Money route + pane extraction). Nothing visual to argue about, and it unblocks the rest.
2. Stage 2 Home — the change that carries the whole redesign.
3. Stage 3 logging sheet.
4. Stages 4 and 5 in any order.

Check after each stage: light theme (every value above resolves through `useTheme().colors`), an empty database (no categories → `EmptyState`, `room = totalCap = 0`, hero should read `RD$0` not `NaN`), and one over-cap category.
