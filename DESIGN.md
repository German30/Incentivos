---
name: Incentivos
description: Ventas, metas, incentivos y comisiones en un panel financiero claro de tarjetas blancas y azul marino.
colors:
  blue: "#1d4580"
  blue-hover: "#163766"
  navy-deep: "#12284b"
  blue-wash: "#eaf0f9"
  blue-line: "#b9cbe6"
  card-gradient-light: "#2a5ea6"
  surface: "#f4f6fa"
  paper: "#ffffff"
  sunken: "#f7f9fc"
  grid: "#edf0f5"
  rule: "#dde3ec"
  ink: "#172033"
  ink-2: "#475467"
  ink-3: "#667085"
  ok: "#12805c"
  ok-wash: "#e3f5ec"
  warn: "#b25e09"
  warn-wash: "#fdf1e1"
  alert: "#c4312f"
  alert-wash: "#fdeceb"
  acc-1: "#1d4580"
  acc-2: "#23a26d"
  acc-3: "#e3ac2b"
  acc-4: "#ef8a3c"
  s-18: "#2b5797"
  s-5: "#2e9ad8"
  s-solural: "#c27a0e"
typography:
  display:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2rem, 3.4vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  figure:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "'tnum'"
  title:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'cv11', 'ss01'"
  body-sm:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  micro:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 550
    lineHeight: 1.3
rounded:
  card: "16px"
  segment: "12px"
  row: "12px"
  control: "10px"
  segment-inner: "9px"
  inset: "8px"
  mark: "6px"
  pill: "999px"
  circle: "50%"
spacing:
  "2": "2px"
  "4": "4px"
  "6": "6px"
  "8": "8px"
  "10": "10px"
  "12": "12px"
  "14": "14px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
  gap: "20px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
    typography: "{typography.body-sm}"
  button-primary-hover:
    backgroundColor: "{colors.blue-hover}"
  button-primary-active:
    backgroundColor: "{colors.navy-deep}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.sunken}"
  button-danger:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.alert}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-small:
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "32px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    size: "36px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "40px"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
    padding: "16px 20px 20px"
  card-navy:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.card}"
    padding: "18px 20px"
  delta-pill-up:
    backgroundColor: "{colors.ok-wash}"
    textColor: "{colors.ok}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
    typography: "{typography.caption}"
  delta-pill-down:
    backgroundColor: "{colors.alert-wash}"
    textColor: "{colors.alert}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  pill-info:
    backgroundColor: "{colors.blue-wash}"
    textColor: "{colors.blue}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  nav-link:
    textColor: "{colors.ink-3}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "38px"
  nav-link-active:
    backgroundColor: "{colors.blue-wash}"
    textColor: "{colors.blue}"
  segmented:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.segment}"
    padding: "3px"
  segmented-option-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.blue}"
    rounded: "{rounded.segment-inner}"
    height: "32px"
  progress-track:
    backgroundColor: "{colors.grid}"
    rounded: "{rounded.pill}"
    height: "8px"
  avatar:
    backgroundColor: "{colors.blue-wash}"
    textColor: "{colors.blue}"
    rounded: "{rounded.circle}"
    size: "36px"
---

# Design System: Incentivos

## Overview

**Creative North Star: "The Navy Ledger Card"**

Incentivos is a light fintech dashboard. Every figure lives on a white card floating a few pixels above a cool gray-blue page, and every figure is read against something: its goal, its month-end projection, its change. Navy is the single brand voice; it marks action, selection, the main data series and the one dark card that identifies the person being looked at (the dispenser "ficha"). Everything else is ink on white, washed tints for state, and four accent colors that tag the KPI row.

Density is moderate-high: a 300px side column plus a six-track grid of cards on desktop, collapsing to one column on phones with a bottom tab bar. Charts are drawn in-house as SVG: smooth area curves with a dashed projection tail and a dashed green goal line, thin rounded progress rails, a donut with a centered figure, a stacked mix bar. Motion is limited to 120-200ms color, shadow and opacity transitions on one ease curve, and is removed under reduced-motion.

This world replaces the retired "Crouwel grid specimen" (visible grid, square corners, Chakra Petch, diagonal). None of those rules apply.

**Key Characteristics:**
- Light gray-blue page (#f4f6fa), white cards at 16px radius with a soft two-layer shadow and a hairline border.
- Navy #1d4580 as the only brand/action color; one navy gradient card per screen at most.
- KPI cards marked by a 3px rounded vertical accent bar in navy, green, amber or orange.
- Green/red delta pills (999px) beside every key figure.
- Inter Variable everywhere, tabular numerals for all figures, weights 500-700.
- Rounded everything: 16 / 12 / 10 / 9 / 8 / 6 / 999 / 50%.

## Colors

A cool, restrained light palette: one navy brand hue, neutral ink-on-white, washed semantic tints, and a fixed set of accent and series colors that belong to data, never to chrome.

### Primary
- **Ledger Navy** (blue): buttons, links, focus outline, active nav and segmented option, selected row tint partner, main chart line, filled progress, the dispenser card. Hover deepens to **Pressed Navy** (blue-hover), active to **Deep Navy** (navy-deep).
- **Navy Wash** (blue-wash): active nav background, selected row/ranking item, avatar fill, info pill, input focus ring.
- **Navy Line** (blue-line): hover borders, projection point and projected progress segment.
- **Card Gradient Light** (card-gradient-light): only as the light stop of the navy card gradient (`135deg, #2a5ea6 0%, blue 45%, navy-deep 100%`) on the dispenser card and the login panel.

### Secondary (semantic)
- **Ledger Green** (ok / ok-wash): goal met, positive delta pill, goal line on the flow chart, excess over goal.
- **Signal Red** (alert / alert-wash): negative delta, "Debajo" status, errors, danger button.
- **Amber Warn** (warn / warn-wash): caution states.

### Tertiary (data)
- **KPI accents** (acc-1..acc-4: navy, green, amber, orange): only the 3px vertical bar on KPI cards, in that order.
- **Incentive series** (s-18, s-5, s-solural): the three incentive programs (18 SKUs, 5 SKUs, SOLURAL) in the donut, mix bar, legends and dots. Validated for CVD separation and 3:1 contrast; do not substitute.

### Neutral
- **Cool Page** (surface): page background and segmented-control track.
- **Paper** (paper): cards, inputs, top bar, tab bar.
- **Sunken** (sunken): table headers, row hover, hover fills, neutral pill.
- **Grid** (grid): card borders, dividers, chart gridlines, progress tracks.
- **Rule** (rule): control borders.
- **Ink / Ink 2 / Ink 3** (ink, ink-2, ink-3): primary text, secondary text and icons, labels and meta.

### Named Rules
**The One Navy Rule.** Navy is the only chrome color. Accent and series colors tag data; they never color buttons, nav or headings.

**The Context Pill Rule.** A headline figure carries its context beside it: a delta pill (green up, red down) or a neutral/info pill with the goal ratio.

## Typography

**Display Font:** Inter Variable (with system-ui, -apple-system, Segoe UI)
**Body Font:** Inter Variable
**Label/Mono Font:** none; numbers use `font-variant-numeric: tabular-nums`.

**Character:** One neutral grotesque at many weights (400, 500, 550, 600, 650, 700); hierarchy comes from size and weight, never from a second family. Headings are tightened (-0.01em), figures tighter (-0.02em). Body enables `cv11` and `ss01`.

### Hierarchy
- **Display** (700, clamp(2rem, 3.4vw, 2.75rem), 1.1): login hero line only.
- **Headline** (650, 1.625rem, 1.2; 1.375rem under 640px): page h1.
- **Figure** (700, 1.375rem, 1.1, tabular): KPI values and card headline numbers; 1.5rem for the detail figure, 1.125rem for secondary rhythm figures and mobile KPIs.
- **Title** (650, 1rem; 1.0625rem for brand and side-column titles; 1.125rem allowed): card titles.
- **Body** (400, 0.9375rem, 1.5): base text.
- **Body small** (0.875rem): tables, lists, nav, buttons (600), legends.
- **Label** (500-600, 0.8125rem): field labels, KPI captions, "Ver todo" links, small buttons, segmented options, tooltip text. The most-used size.
- **Caption** (500-600, 0.75rem): pills, table headers, data sublabels.
- **Micro** (550, 0.6875rem): mobile tab bar labels and the card's tiny sublabels.
- **Chart text** (SVG px): axis 11.5px/500, goal label 11px/600, donut center figure 17px/700 and caption 9px/500. These are drawn in SVG user units and are part of the chart components, not the page ramp.

### Named Rules
**The Tabular Figures Rule.** Every money, percentage and count uses tabular numerals so columns and KPI rows align.

## Layout

Max content width 1440px, centered, padded 24px 28px 64px on desktop. Base rhythm is the `--gap` of 20px between cards (16px on mobile). Internal spacing uses 2/4/6/8/10/12/14/16/20/24/28px steps.

The dispenser screen uses a named-area grid: a 300px side column (navy card, detail card, switcher) beside six equal tracks (KPI row of four, flow 4/6 + goals 2/6, mix 3/6 + ranking 3/6), then a full-width matrix table. At 1320px the side column drops below the KPIs and flow; at 860px everything stacks to one column with KPIs in two columns.

The top bar is a 64px sticky white strip (logo, nav, user chip, logout). At 1100px the nav hides and a fixed bottom tab bar appears (icons plus micro labels, safe-area padded). Wide tables scroll inside their card; on 640px the matrix converts rows to stacked two-column cards.

## Elevation & Depth

Lifted, but quietly. Cards sit on the page with a soft ambient shadow plus a hairline grid border; the only strong shadow belongs to the navy card and floating tooltips. Interaction uses rings, not lifts.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 1px 2px rgba(16,24,40,.04), 0 6px 20px rgba(16,24,40,.05)`, `--shadow`): every white card.
- **Floating** (`box-shadow: 0 12px 32px rgba(16,24,40,.14)`, `--shadow-alto`): chart tooltip.
- **Navy card** (`box-shadow: 0 10px 24px rgba(18,40,75,.28)`): the dispenser gradient card only.
- **Primary button** (`box-shadow: 0 1px 2px rgba(18,40,75,.2)`).
- **Segment thumb** (`box-shadow: 0 1px 3px rgba(16,24,40,.1)`): active segmented option.
- **Tab bar** (`box-shadow: 0 -4px 16px rgba(16,24,40,.05)`): mobile bottom bar.
- **Focus ring** (`box-shadow: 0 0 0 3px blue-wash` on inputs; `outline: 2px solid blue, offset 2px` elsewhere).
- **Avatar ring** (`0 0 0 1px grid`, hover `0 0 0 2px blue-line`, active `0 0 0 2px blue`).

### Named Rules
**The Flat Interaction Rule.** Hover changes fill, border or ring color; nothing translates or grows.

## Shapes

Soft and consistent. Radius scale: 16px cards, the navy card and skeletons; 12px segmented track, ranking rows, role option tiles; 10px (`--radius-sm`) buttons, inputs, icon buttons, nav links, tooltips, notices; 9px segmented thumb (nested inside 12px with 3px padding); 8px inset elements (skip link, password toggle, commission ladder steps); 6px small marks (inline code, checkbox mark); 999px pills, progress rails, mix bar, user chip; 50% avatars, logo, legend dots. The KPI accent bar is 3px wide with 3px rounded ends.

Borders are 1px hairlines in grid (cards, dividers) or rule (controls). Chart strokes are round-capped.

## Components

### Buttons
Calm and solid.
- **Shape:** gently rounded (10px), 40px tall, 0 16px padding, 0.875rem/600.
- **Primary:** navy fill, white text, small navy shadow; hover Pressed Navy, active Deep Navy.
- **Secondary (default):** white with rule border; hover sunken fill and navy-line border; active navy wash.
- **Danger:** white, red text, pale red border; hover red wash and red border.
- **Ghost:** transparent border. **Small:** 32px tall, 0 12px, 0.8125rem.
- **Icon button:** 36px square, 10px radius, ink-2; hover sunken fill, navy icon.
- **Text action ("Ver todo"):** navy 0.8125rem/600 link in card heads, underline on hover.
- Disabled at 50% opacity.

### Chips / Pills
- **Delta pill:** 999px, 2px 8px, 0.75rem/600 tabular; green wash/green up, red wash/red down, navy wash/navy info, sunken/ink-2 neutral. Arrow icons inline.
- **Status pill (Sí / No / sin dato):** same shape, 3px 9px 3px 7px, with a 1.8-stroke icon.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** paper, 1px grid border, Card shadow, overflow clipped.
- **Internal Padding:** head 18px 20px 0 (title left, action right), body 16px 20px 20px; 16px sides on mobile.
- **KPI card:** caption in ink-3, figure plus context pill on one row, 3px accent bar inset 12px from the left edge.
- **Navy dispenser card:** gradient navy, white text, faint white wave strokes, rank and share on top, name centered, branch and sales at the bottom; one per screen.

### Inputs / Fields
- **Style:** 40px, 8px 12px, rule border, 10px radius, white; label above at 0.8125rem/500 ink-2.
- **Focus:** navy border plus 3px navy-wash ring. Hover: navy-line border.
- **Error:** red border via aria-invalid. Selects use a drawn chevron; numeric inputs right-align tabular.

### Navigation
- **Top bar:** white, 64px, sticky. Links are 38px soft-rounded tabs (10px) with icon + label, 0.875rem/550 ink-3; hover sunken; active navy-wash fill, navy text, 650.
- **User chip:** 999px pill with name/role and a 36px navy-wash initials avatar.
- **Mobile:** bottom tab bar under 1100px, active tab in navy wash.
- **Segmented control:** 12px track on page gray with a 3px inset; active option is a white 9px thumb with navy text and a soft shadow. Used for Mes/Rango and 6/12 meses.

### Progress rails
8px (6px small, 10px large) 999px rails on grid; navy fill, green when met, navy-line for projected remainder; excess shown as a green caption.

### Charts
- **Flow:** smooth navy area/line (2.5px, round), dashed projection tail to an open point, dashed green goal line with label, white value tag with drop shadow, grid lines in grid color.
- **Donut:** 150px, series colors, centered figure and caption, legend with dots and percentages.
- **Mix bar:** 14px pill bar of series segments with 2px gaps, legend rows below.
- **Tooltip:** white, 10px radius, Floating shadow, color dot + label + tabular value.

### Avatar lists
Ranking rows: 38px circular rank avatar, name and meta, value right-aligned; rows 12px radius, hover sunken, selected navy wash with a navy avatar. Switcher avatars: 42px circles with a white border and grid ring.

## Do's and Don'ts

### Do:
- **Do** put every figure on a white 16px card with the Card shadow, on the #f4f6fa page.
- **Do** pair headline figures with a delta or goal pill (999px, 0.75rem/600).
- **Do** mark KPI cards with the 3px accent bar, in the navy, green, amber, orange order.
- **Do** use the incentive series colors for 18 SKUs, 5 SKUs and SOLURAL wherever they appear.
- **Do** keep radii on the scale (16, 12, 10, 9, 8, 6, 999, 50%) and nest inner radii smaller than outer.
- **Do** use tabular numerals for all numbers.

### Don't:
- **Don't** use a second typeface; Inter carries everything.
- **Don't** use accent or series colors for chrome (buttons, nav, headings).
- **Don't** put more than one navy gradient card on a screen.
- **Don't** use square corners, visible layout grids or diagonal devices from the retired Crouwel world.
- **Don't** build Power BI-style tile mosaics or generic charts; each chart shows a figure against its goal or projection.
- **Don't** animate position or scale on hover; change color, fill or ring.
