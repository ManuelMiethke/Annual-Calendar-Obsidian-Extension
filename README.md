# Annual Calendar

A visual annual calendar for Obsidian, inspired by year-at-a-glance planning tools.

This plugin uses a 12x31 annual calendar grid: months as rows, days as columns.

Screenshot placeholder: add a view capture after the first local build in Obsidian.

## Features

- Custom Obsidian view for a full-year 12x31 annual calendar
- Months on the left, days `1-31` across the top
- Invalid dates stay visible but disabled
- Click a valid date to open or create its daily note
- Existing daily notes are marked in the grid
- Optional highlighting for weekends, today, and past dates
- Year navigation with previous, next, today, and direct year input
- Drag across dates or use `Shift`-click to select a range
- Create simple annual blocks with title, category, and color
- Persisted multi-day blocks are rendered directly in the calendar
- Annual blocks can be reviewed and deleted in a yearly block list
- Settings for folder paths, month language, and display toggles
- MVP data model prepared for future annual blocks

## Installation for Local Development

1. Clone or copy this folder into your vault under `.obsidian/plugins/annual-matrix/`.
2. Run `npm install`.
3. Run `npm run build` for a production bundle or `npm run dev` while developing.
4. Enable **Annual Calendar** in Obsidian under **Settings -> Community plugins**.

## Usage

- Run the command `Open Annual Calendar` from the command palette.
- Or click the ribbon icon to open the view.
- Use the toolbar to move between years or jump back to the current year.
- Click any valid date cell to open the corresponding daily note.
- Missing notes are created automatically by default in `Daily Notes/YYYY-MM-DD.md`.
- Drag across cells to select a range and create an annual block.
- Or use `Shift`-click to start and finish a range selection.
- Use the annual block list to review the current year's blocks or delete them.

## Calendar Layout

- Y axis: January to December
- X axis: day `1` to `31`
- Every cell represents one potential date
- Invalid dates such as `2026-02-30` stay visible but cannot be clicked

## Settings

- `Daily Notes Folder`: default `Daily Notes`
- `Date Format`: default `YYYY-MM-DD`
- `Month Language`: German or English
- `Highlight weekends`: default `true`
- `Highlight today`: default `true`
- `Show past visualization`: default `true`
- `Mark existing daily notes`: default `true`
- `Create daily note on click`: default `true`
- `Annual Calendar Folder`: default `Annual Calendar`

## Architecture

- `src/main.ts`: plugin lifecycle, command registration, ribbon icon, view registration, persisted data
- `src/AnnualMatrixView.ts`: toolbar and 12x31 annual calendar rendering
- `src/settings.ts`: settings tab and defaults
- `src/dateUtils.ts`: leap year and date utility functions
- `src/fileUtils.ts`: daily note path handling, folder creation, file open/create logic
- `src/types.ts`: settings, plugin data, and annual block types

Future annual blocks can be stored in plugin data via `annualBlocks` and rendered in the custom view without changing the core date grid model.

## Known Limitations

- No fiscal year mode yet
- No fixed week layout yet
- No print or export workflow yet
- Mobile layout is not optimized beyond basic responsiveness
- No integration with Obsidian Daily Notes core plugin yet
- No integration with Periodic Notes yet
- No import or export workflow yet

## Roadmap

- Fiscal year mode
- Fixed week layout
- Print/export
- Mobile optimization
- Optional integration with Obsidian Daily Notes core plugin
- Optional integration with Periodic Notes
- Optional import/export
