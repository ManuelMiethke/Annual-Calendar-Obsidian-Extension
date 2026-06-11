import { ItemView, Notice, WorkspaceLeaf, setIcon } from "obsidian";

import { AnnualBlockModal } from "./AnnualBlockModal";
import { AnnualStampModal } from "./AnnualStampModal";
import {
  formatDateYYYYMMDD,
  getDaysInMonth,
  getMonthNames,
  getWeekdayInitialsSundayFirst,
  getWeekdayNameForDate,
  isDateWithinRange,
  isPast,
  isToday,
  isValidDate,
  isWeekend,
  normalizeDateRange,
} from "./dateUtils";
import type AnnualMatrixPlugin from "./main";
import type { AnnualBlock, AnnualStamp } from "./types";

export const ANNUAL_CALENDAR_VIEW_TYPE = "annual-calendar-view";

export class AnnualMatrixView extends ItemView {
  plugin: AnnualMatrixPlugin;
  displayYear: number;
  private blockLaneMap = new Map<string, number>();
  private isAnnualBlockListOpen = false;
  private selectionAnchor: string | null = null;
  private selectionFocus: string | null = null;
  private isSelecting = false;
  private didDragDuringSelection = false;
  private suppressNextClick = false;

  constructor(leaf: WorkspaceLeaf, plugin: AnnualMatrixPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.displayYear = new Date().getFullYear();
  }

  getViewType(): string {
    return ANNUAL_CALENDAR_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Annual Calendar";
  }

  getIcon(): string {
    return "calendar-days";
  }

  async onOpen(): Promise<void> {
    this.registerDomEvent(document, "mouseup", () => {
      void this.handleGlobalMouseUp();
    });
    this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  async refresh(): Promise<void> {
    this.render();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("annual-matrix-view");
    this.blockLaneMap = this.buildBlockLaneMap();

    this.renderToolbar(contentEl);
    this.renderAnnualBlockPanel(contentEl);
    this.renderGrid(contentEl);
  }

  private renderToolbar(container: HTMLElement): void {
    const toolbar = container.createDiv({ cls: "annual-matrix-toolbar" });

    const titleGroup = toolbar.createDiv({ cls: "annual-matrix-toolbar-group" });
    titleGroup.createEl("h2", {
      cls: "annual-matrix-title",
      text: String(this.displayYear),
    });

    const controls = toolbar.createDiv({ cls: "annual-matrix-toolbar-group annual-matrix-toolbar-controls" });

    const prevButton = controls.createEl("button", {
      cls: "mod-cta",
      text: "Previous",
      attr: { type: "button", "aria-label": "Show previous year" },
    });
    prevButton.addEventListener("click", () => {
      this.displayYear -= 1;
      this.render();
    });

    const yearInput = controls.createEl("input", {
      cls: "annual-matrix-year-input",
      attr: {
        type: "number",
        min: "1",
        max: "9999",
        value: String(this.displayYear),
        "aria-label": "Displayed year",
      },
    });
    yearInput.addEventListener("change", () => {
      const parsed = Number.parseInt(yearInput.value, 10);
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 9999) {
        yearInput.value = String(this.displayYear);
        new Notice("Please enter a valid year.");
        return;
      }
      this.displayYear = parsed;
      this.render();
    });

    const todayButton = controls.createEl("button", {
      text: "Today",
      attr: { type: "button", "aria-label": "Jump to the current year" },
    });
    todayButton.addEventListener("click", () => {
      this.displayYear = new Date().getFullYear();
      this.render();
    });

    const nextButton = controls.createEl("button", {
      cls: "mod-cta",
      text: "Next",
      attr: { type: "button", "aria-label": "Show next year" },
    });
    nextButton.addEventListener("click", () => {
      this.displayYear += 1;
      this.render();
    });

    const actions = toolbar.createDiv({ cls: "annual-matrix-toolbar-group annual-matrix-toolbar-actions" });
    const stampButton = actions.createEl("button", {
      cls: "annual-matrix-icon-button",
      attr: {
        type: "button",
        "aria-label": "Add stamp to selected day",
        title: "Add stamp to selected day",
      },
    });
    setIcon(stampButton, "stamp");
    stampButton.addEventListener("click", () => {
      const selection = this.getSelectionRange();
      if (!selection || selection.startDate !== selection.endDate) {
        new Notice("Shift-click a single day first to add a stamp.");
        return;
      }

      void this.openAnnualStampModal(selection.startDate);
    });

    const blockListButton = actions.createEl("button", {
      cls: "annual-matrix-icon-button",
      attr: {
        type: "button",
        "aria-label": this.isAnnualBlockListOpen ? "Hide annual details" : "Show annual details",
        title: this.isAnnualBlockListOpen ? "Hide annual details" : "Show annual details",
      },
    });
    setIcon(blockListButton, "list");
    if (this.isAnnualBlockListOpen) {
      blockListButton.addClass("is-active");
    }
    blockListButton.addEventListener("click", () => {
      this.isAnnualBlockListOpen = !this.isAnnualBlockListOpen;
      this.render();
    });
  }

  private renderGrid(container: HTMLElement): void {
    if (this.plugin.settings.viewMode === "fixed-week") {
      this.renderFixedWeekGrid(container);
      return;
    }

    this.renderMatrixGrid(container);
  }

  private renderMatrixGrid(container: HTMLElement): void {
    const gridWrapper = container.createDiv({ cls: "annual-matrix-grid-wrapper" });
    const grid = gridWrapper.createDiv({ cls: "annual-matrix-grid" });

    const monthNames = getMonthNames();

    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      grid.createDiv({
        cls: "annual-matrix-month-label",
        text: monthNames[monthIndex],
      });

      for (let day = 1; day <= 31; day += 1) {
        if (!isValidDate(this.displayYear, monthIndex, day)) {
          const invalidCell = grid.createDiv({
            cls: "annual-matrix-day-cell is-invalid",
            attr: { "aria-disabled": "true" },
          });
          invalidCell.setAttribute("aria-label", "Invalid date");
          continue;
        }

        this.createDateCell(grid, monthIndex, day, { showWeekdayLabel: true });
      }
    }
  }

  private renderFixedWeekGrid(container: HTMLElement): void {
    const gridWrapper = container.createDiv({ cls: "annual-matrix-grid-wrapper" });
    const grid = gridWrapper.createDiv({ cls: "annual-matrix-fixed-week-grid" });
    const weekdayInitials = getWeekdayInitialsSundayFirst(this.plugin.settings.monthLanguage);
    const fixedWeekColumns = 37;

    const monthNames = getMonthNames();
    const corner = grid.createDiv({ cls: "annual-matrix-header-cell annual-matrix-corner-cell" });
    setIcon(corner, "calendar-range");

    for (let column = 0; column < fixedWeekColumns; column += 1) {
      grid.createDiv({
        cls: "annual-matrix-header-cell annual-matrix-fixed-week-header",
        text: weekdayInitials[column % weekdayInitials.length],
      });
    }

    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      grid.createDiv({
        cls: "annual-matrix-month-label",
        text: monthNames[monthIndex],
      });

      const startWeekdayOffset = new Date(this.displayYear, monthIndex, 1).getDay();
      const daysInMonth = getDaysInMonth(this.displayYear, monthIndex);

      for (let column = 0; column < fixedWeekColumns; column += 1) {
        const day = column - startWeekdayOffset + 1;
        if (day < 1 || day > daysInMonth) {
          grid.createDiv({ cls: "annual-matrix-day-cell is-invalid annual-matrix-fixed-week-empty", attr: { "aria-disabled": "true" } });
          continue;
        }

        this.createDateCell(grid, monthIndex, day, { isFixedWeek: true });
      }
    }
  }

  private createDateCell(
    container: HTMLElement,
    monthIndex: number,
    day: number,
    options: { isFixedWeek?: boolean; showWeekdayLabel?: boolean } = {},
  ): HTMLButtonElement {
    const isoDate = formatDateYYYYMMDD(this.displayYear, monthIndex, day);
    const cell = container.createEl("button", {
      cls: "annual-matrix-day-cell",
      attr: {
        type: "button",
      },
    });

    const head = cell.createDiv({ cls: "annual-matrix-cell-head" });
    head.createSpan({
      cls: "annual-matrix-day-number",
      text: String(day),
    });
    if (options.showWeekdayLabel) {
      head.createSpan({
        cls: "annual-matrix-day-weekday",
        text: getWeekdayNameForDate(this.displayYear, monthIndex, day),
      });
      cell.addClass("shows-weekday-label");
    }
    if (options.isFixedWeek) {
      cell.addClass("is-fixed-week-cell");
    }

    if (this.plugin.settings.highlightToday && isToday(this.displayYear, monthIndex, day)) {
      cell.addClass("is-today");
    }

    if (this.plugin.settings.showPastVisualization && isPast(this.displayYear, monthIndex, day)) {
      cell.addClass("is-past");
    }

    if (this.plugin.settings.highlightWeekends && isWeekend(this.displayYear, monthIndex, day)) {
      cell.addClass("is-weekend");
    }

    const matchingBlocks = this.plugin.getAnnualBlocksForDate(isoDate);
    const matchingStamps = this.plugin.getAnnualStampsForDate(isoDate);

    if (matchingBlocks.length > 0) {
      cell.addClass("has-block");
      const sortedBlocks = [...matchingBlocks].sort((left, right) => {
        const leftLane = this.blockLaneMap.get(left.id) ?? 0;
        const rightLane = this.blockLaneMap.get(right.id) ?? 0;
        if (leftLane !== rightLane) {
          return leftLane - rightLane;
        }

        if (left.startDate !== right.startDate) {
          return left.startDate.localeCompare(right.startDate);
        }

        return left.endDate.localeCompare(right.endDate);
      });

      for (const block of sortedBlocks) {
        const lane = this.blockLaneMap.get(block.id) ?? 0;
        const previousDate = this.shiftIsoDate(isoDate, -1);
        const nextDate = this.shiftIsoDate(isoDate, 1);
        const isBlockStart = !this.plugin.getAnnualBlocksForDate(previousDate).some((candidate) => candidate.id === block.id);
        const isBlockEnd = !this.plugin.getAnnualBlocksForDate(nextDate).some((candidate) => candidate.id === block.id);
        const isVisibleSegmentStart = isBlockStart || day === 1;
        const isVisibleSegmentEnd = isBlockEnd || day === getDaysInMonth(this.displayYear, monthIndex);
        const shouldShowBlockLabel = isVisibleSegmentStart;
        const blockBar = cell.createDiv({ cls: "annual-matrix-block-bar" });
        const blockTextColors = this.getBlockTextColors(block.color);
        const visibleSpanDays = isVisibleSegmentStart
          ? this.getVisibleBlockSpanDays(block.id, monthIndex, day)
          : 1;
        blockBar.style.setProperty("--annual-block-color", block.color);
        blockBar.style.setProperty("--annual-block-text-color", blockTextColors.primary);
        blockBar.style.setProperty("--annual-block-text-muted-color", blockTextColors.secondary);
        blockBar.style.setProperty("--annual-block-lane", String(lane));
        blockBar.style.setProperty("--annual-block-span-days", String(visibleSpanDays));
        if (isVisibleSegmentStart) {
          blockBar.addClass("is-segment-start");
          cell.addClass("has-block-label");
        }
        if (!isVisibleSegmentStart && !isVisibleSegmentEnd) {
          blockBar.addClass("is-segment-middle");
        }
        if (isVisibleSegmentEnd) {
          blockBar.addClass("is-segment-end");
        }
        if (shouldShowBlockLabel) {
          blockBar.createSpan({
            cls: `annual-matrix-block-label${isBlockStart ? "" : " is-continuation"}`,
            text: block.title,
          });
        }
      }
    }

    if (matchingStamps.length > 0) {
      const [firstStamp] = matchingStamps;
      cell.addClass("has-stamp");
      cell.style.setProperty("--annual-stamp-color", firstStamp.color);

      const stampRow = cell.createDiv({ cls: "annual-matrix-stamp-row" });
      stampRow.createSpan({
        cls: "annual-matrix-stamp-badge",
        text: firstStamp.emoji,
      });
      if (matchingStamps.length > 1) {
        stampRow.createSpan({
          cls: "annual-matrix-stamp-count",
          text: `+${matchingStamps.length - 1}`,
        });
      }
    }

    const titleParts = [isoDate];
    if (matchingBlocks.length > 0) {
      titleParts.push(`Blocks: ${matchingBlocks.map((block) => block.title).join(", ")}`);
    }
    if (matchingStamps.length > 0) {
      titleParts.push(
        `Stamps: ${matchingStamps.map((stamp) => stamp.label || stamp.emoji).join(", ")}`,
      );
    }
    cell.setAttribute("aria-label", titleParts.join(". "));

    if (this.isDateSelected(isoDate)) {
      cell.addClass("is-selected");
      const range = this.getSelectionRange();
      if (range?.startDate === isoDate) {
        cell.addClass("is-selection-start");
      }
      if (range?.endDate === isoDate) {
        cell.addClass("is-selection-end");
      }
    }

    cell.addEventListener("mousedown", (event) => {
      this.handleCellMouseDown(event, isoDate);
    });

    cell.addEventListener("mouseenter", () => {
      this.handleCellMouseEnter(isoDate);
    });

    cell.addEventListener("click", async (event) => {
      if (event.shiftKey) {
        this.handleShiftClickSelection(isoDate);
        return;
      }

      if (this.suppressNextClick) {
        this.suppressNextClick = false;
        return;
      }
    });

    return cell;
  }

  private shiftIsoDate(isoDate: string, offsetDays: number): string {
    const [year, month, day] = isoDate.split("-").map((part) => Number.parseInt(part, 10));
    const shifted = new Date(year, month - 1, day + offsetDays);
    return formatDateYYYYMMDD(shifted.getFullYear(), shifted.getMonth(), shifted.getDate());
  }

  private getVisibleBlockSpanDays(blockId: string, monthIndex: number, startDay: number): number {
    const daysInMonth = getDaysInMonth(this.displayYear, monthIndex);
    let spanDays = 1;

    for (let day = startDay + 1; day <= daysInMonth; day += 1) {
      const isoDate = formatDateYYYYMMDD(this.displayYear, monthIndex, day);
      const isCovered = this.plugin.getAnnualBlocksForDate(isoDate).some((block) => block.id === blockId);
      if (!isCovered) {
        break;
      }
      spanDays += 1;
    }

    return spanDays;
  }

  private getBlockTextColors(color: string): { primary: string; secondary: string } {
    const rgb = this.parseHexColor(color);
    if (!rgb) {
      return {
        primary: "#f7fbff",
        secondary: "rgba(247, 251, 255, 0.7)",
      };
    }

    const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    if (luminance >= 0.72) {
      return {
        primary: "#162033",
        secondary: "rgba(22, 32, 51, 0.68)",
      };
    }

    return {
      primary: "#f7fbff",
      secondary: "rgba(247, 251, 255, 0.7)",
    };
  }

  private parseHexColor(color: string): { r: number; g: number; b: number } | null {
    const normalized = color.trim();
    const shorthandMatch = /^#([\da-f]{3})$/i.exec(normalized);
    if (shorthandMatch) {
      const [r, g, b] = shorthandMatch[1].split("");
      return {
        r: Number.parseInt(`${r}${r}`, 16),
        g: Number.parseInt(`${g}${g}`, 16),
        b: Number.parseInt(`${b}${b}`, 16),
      };
    }

    const fullMatch = /^#([\da-f]{6})$/i.exec(normalized);
    if (!fullMatch) {
      return null;
    }

    return {
      r: Number.parseInt(fullMatch[1].slice(0, 2), 16),
      g: Number.parseInt(fullMatch[1].slice(2, 4), 16),
      b: Number.parseInt(fullMatch[1].slice(4, 6), 16),
    };
  }

  private buildBlockLaneMap(): Map<string, number> {
    const laneMap = new Map<string, number>();
    const laneEndDates: string[] = [];
    const blocks = [...this.plugin.getAnnualBlocksForYear(this.displayYear)].sort((left, right) => {
      if (left.startDate !== right.startDate) {
        return left.startDate.localeCompare(right.startDate);
      }

      return right.endDate.localeCompare(left.endDate);
    });

    for (const block of blocks) {
      let lane = laneEndDates.findIndex((endDate) => endDate < block.startDate);
      if (lane === -1) {
        lane = laneEndDates.length;
        laneEndDates.push(block.endDate);
      } else {
        laneEndDates[lane] = block.endDate;
      }

      laneMap.set(block.id, lane);
    }

    return laneMap;
  }

  private renderAnnualBlockPanel(container: HTMLElement): void {
    if (!this.isAnnualBlockListOpen) {
      return;
    }

    const blocks = this.plugin.getAnnualBlocksForYear(this.displayYear);
    const stamps = this.plugin.getAnnualStampsForYear(this.displayYear);
    const panel = container.createDiv({ cls: "annual-matrix-block-panel" });

    const header = panel.createDiv({ cls: "annual-matrix-block-panel-header" });
    header.createEl("h3", {
      cls: "annual-matrix-block-panel-title",
      text: `Highlights ${this.displayYear}`,
    });
    header.createSpan({
      cls: "annual-matrix-block-count",
      text: `${blocks.length + stamps.length}`,
    });

    if (blocks.length === 0 && stamps.length === 0) {
      panel.createEl("p", {
        cls: "annual-matrix-block-empty",
        text: "No highlights for this year yet. Drag across dates for blocks or Shift-click a day to add a stamp.",
      });
      return;
    }

    if (blocks.length > 0) {
      const blockSection = panel.createDiv({ cls: "annual-matrix-panel-section" });
      blockSection.createEl("h4", {
        cls: "annual-matrix-panel-section-title",
        text: "Blocks",
      });

      const list = blockSection.createDiv({ cls: "annual-matrix-block-list" });

      for (const block of blocks) {
        this.renderBlockListItem(list, block);
      }
    }

    if (stamps.length > 0) {
      const stampSection = panel.createDiv({ cls: "annual-matrix-panel-section" });
      stampSection.createEl("h4", {
        cls: "annual-matrix-panel-section-title",
        text: "Stamps",
      });

      const list = stampSection.createDiv({ cls: "annual-matrix-block-list" });

      for (const stamp of stamps) {
        this.renderStampListItem(list, stamp);
      }
    }
  }

  private renderBlockListItem(container: HTMLElement, block: AnnualBlock): void {
    const item = container.createDiv({ cls: "annual-matrix-block-item" });
    item.style.setProperty("--annual-block-color", block.color);

    const content = item.createDiv({ cls: "annual-matrix-block-content" });
    content.addEventListener("click", () => {
      this.selectionAnchor = block.startDate;
      this.selectionFocus = block.endDate;
      this.render();
    });

    const titleRow = content.createDiv({ cls: "annual-matrix-block-title-row" });
    titleRow.createSpan({ cls: "annual-matrix-block-swatch" });
    titleRow.createEl("strong", {
      cls: "annual-matrix-block-item-title",
      text: block.title,
    });

    content.createDiv({
      cls: "annual-matrix-block-dates",
      text:
        block.startDate === block.endDate
          ? block.startDate
          : `${block.startDate} -> ${block.endDate}`,
    });

    content.createSpan({
      cls: "annual-matrix-block-category",
      text: block.category,
    });

    const deleteButton = item.createEl("button", {
      cls: "annual-matrix-block-delete",
      text: "Delete",
      attr: {
        type: "button",
        "aria-label": `Delete annual block ${block.title}`,
      },
    });
    deleteButton.addEventListener("click", async () => {
      await this.plugin.removeAnnualBlock(block.id);
      const selection = this.getSelectionRange();
      if (
        selection &&
        selection.startDate === block.startDate &&
        selection.endDate === block.endDate
      ) {
        this.clearSelection();
      }
      await this.refresh();
    });
  }

  private renderStampListItem(container: HTMLElement, stamp: AnnualStamp): void {
    const item = container.createDiv({ cls: "annual-matrix-block-item annual-matrix-stamp-item" });
    item.style.setProperty("--annual-block-color", stamp.color);

    const content = item.createDiv({ cls: "annual-matrix-block-content" });
    content.addEventListener("click", () => {
      this.selectionAnchor = stamp.date;
      this.selectionFocus = stamp.date;
      this.render();
    });

    const titleRow = content.createDiv({ cls: "annual-matrix-block-title-row" });
    titleRow.createSpan({
      cls: "annual-matrix-stamp-item-emoji",
      text: stamp.emoji,
    });
    titleRow.createEl("strong", {
      cls: "annual-matrix-block-item-title",
      text: stamp.label || stamp.date,
    });

    content.createDiv({
      cls: "annual-matrix-block-dates",
      text: stamp.date,
    });

    const deleteButton = item.createEl("button", {
      cls: "annual-matrix-block-delete",
      text: "Delete",
      attr: {
        type: "button",
        "aria-label": `Delete stamp ${stamp.label || stamp.emoji}`,
      },
    });
    deleteButton.addEventListener("click", async () => {
      await this.plugin.removeAnnualStamp(stamp.id);
      const selection = this.getSelectionRange();
      if (selection && selection.startDate === stamp.date && selection.endDate === stamp.date) {
        this.clearSelection();
      }
      await this.refresh();
    });
  }

  private handleCellMouseDown(event: MouseEvent, isoDate: string): void {
    if (event.button !== 0 || event.shiftKey) {
      return;
    }

    event.preventDefault();
    this.selectionAnchor = isoDate;
    this.selectionFocus = isoDate;
    this.isSelecting = true;
    this.didDragDuringSelection = false;
  }

  private handleCellMouseEnter(isoDate: string): void {
    if (!this.isSelecting || !this.selectionAnchor) {
      return;
    }

    if (this.selectionFocus !== isoDate) {
      this.didDragDuringSelection = true;
      this.selectionFocus = isoDate;
      this.render();
    }
  }

  private async handleGlobalMouseUp(): Promise<void> {
    if (!this.isSelecting) {
      return;
    }

    this.isSelecting = false;

    if (!this.didDragDuringSelection) {
      this.clearSelection();
      return;
    }

    const selection = this.getSelectionRange();
    if (!selection) {
      this.clearSelection();
      this.render();
      return;
    }

    this.suppressNextClick = true;
    await this.openAnnualBlockModal(selection.startDate, selection.endDate);
  }

  private handleShiftClickSelection(isoDate: string): void {
    if (!this.selectionAnchor) {
      this.selectionAnchor = isoDate;
      this.selectionFocus = isoDate;
      this.render();
      return;
    }

    this.selectionFocus = isoDate;
    const selection = this.getSelectionRange();
    if (!selection) {
      this.render();
      return;
    }

    void this.openAnnualBlockModal(selection.startDate, selection.endDate);
  }

  private getSelectionRange(): { startDate: string; endDate: string } | null {
    if (!this.selectionAnchor || !this.selectionFocus) {
      return null;
    }

    return normalizeDateRange(this.selectionAnchor, this.selectionFocus);
  }

  private isDateSelected(isoDate: string): boolean {
    const selection = this.getSelectionRange();
    if (!selection) {
      return false;
    }

    return isDateWithinRange(isoDate, selection.startDate, selection.endDate);
  }

  private clearSelection(): void {
    this.selectionAnchor = null;
    this.selectionFocus = null;
    this.isSelecting = false;
    this.didDragDuringSelection = false;
    this.suppressNextClick = false;
  }

  private async openAnnualBlockModal(startDate: string, endDate: string): Promise<void> {
    const normalized = normalizeDateRange(startDate, endDate);
    const modal = new AnnualBlockModal(
      this.app,
      normalized.startDate,
      normalized.endDate,
      this.plugin.categoryPresets,
      this.plugin.getCategoryPresetNames(),
      async (result) => {
        this.plugin.rememberCategoryColorPreset(result.category, result.color);
        await this.plugin.addAnnualBlock({
          title: result.title,
          category: result.category,
          color: result.color,
          startDate: normalized.startDate,
          endDate: normalized.endDate,
        });
        this.clearSelection();
        await this.refresh();
      },
      () => {
        this.clearSelection();
        void this.refresh();
      },
    );

    modal.open();
  }

  private async openAnnualStampModal(date: string): Promise<void> {
    const modal = new AnnualStampModal(
      this.app,
      date,
      async (result) => {
        await this.plugin.addAnnualStamp({
          date,
          emoji: result.emoji,
          label: result.label,
          color: result.color,
        });
        this.clearSelection();
        await this.refresh();
      },
      () => {
        this.clearSelection();
        void this.refresh();
      },
    );

    modal.open();
  }
}
