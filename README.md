# Annual Calendar

Annual Calendar is an Obsidian plugin for year-at-a-glance planning. It shows the entire year in a single view and lets you mark date ranges as blocks, highlight important days with stamps, and switch between a classic date grid and a fixed-week layout.

## What It Does

- Shows the full year at once, without horizontal scrolling
- Offers two views:
  - `Date Grid`: months as rows, days `1-31` as columns
  - `Fixed Week`: months aligned to weekday columns for easier weekly scanning
- Lets you drag across days to create multi-day blocks
- Supports single-day or multi-day blocks with title, category, and color
- Supports stamps with emoji and custom labels for notable dates
- Remembers category color presets and reuses them automatically
- Highlights today, weekends, and past dates with adjustable display toggles
- Includes a yearly details panel to review and delete blocks and stamps

## Current UX Direction

The plugin is optimized for planning and visual scanning, not for dense daily scheduling. The focus is:

- see the whole year immediately
- mark vacations, launches, trips, deadlines, sprints, and milestones
- keep input lightweight
- make multi-day patterns easy to understand at a glance

That is a good fit for many Obsidian users who plan in notes but want a yearly visual layer on top.

## Installation

### Manual Install

1. Copy this repo into your vault under `.obsidian/plugins/annual-calendar/`
2. Run `npm install`
3. Run `npm run build`
4. Enable `Annual Calendar` in `Settings -> Community plugins`

### Development

1. Clone the repository
2. Run `npm install`
3. Run `npm run dev` for watch mode or `npm run build` for a production bundle
4. Reload the plugin inside Obsidian after changes

## Usage

- Open the command palette and run `Open Annual Calendar`
- Or use the ribbon icon to open the view
- Navigate between years with `Previous`, `Today`, `Next`, or direct year input
- Drag across dates to create a block
- `Shift`-click to create a block range without dragging
- Select a single day and use the stamp action to add an emoji marker
- Open the details panel to review or delete saved blocks and stamps

## Settings

- `View mode`
  Switch between `Date Grid` and `Fixed week`
- `Highlight weekends`
  Slightly tints weekends for easier scanning
- `Highlight today`
  Marks the current day in red
- `Show past visualization`
  Makes past days darker and grayer
- `Annual Calendar Folder`
  Reserved for future data/export workflows

## Data Storage

The plugin currently stores its data in the plugin data file:

- blocks
- stamps
- saved category color presets
- display settings

It does not require Daily Notes, Periodic Notes, or external calendar integrations.

## Known Gaps Before Broader Expansion

These are not blockers for an initial release, but they are the most obvious follow-up areas:

- import from external calendars or ICS
- export or print workflows
- richer block editing after creation
- better mobile ergonomics
- optional integrations with other Obsidian calendar workflows

## Community Plugin Readiness

The plugin is in a publishable state for an initial community release if the goal is:

- annual planning
- visual time ranges
- milestone marking
- lightweight year overview

The core interaction model is already aligned with how many Obsidian users work: notes first, visual overview second.

## Repository

- GitHub: `https://github.com/ManuelMiethke/Annual-Calendar-Obsidian-Extension`

## License

MIT
