import { ItemView, Notice, WorkspaceLeaf, setIcon } from "obsidian";

import { AnnualBlockModal } from "./AnnualBlockModal";
import {
  formatDateYYYYMMDD,
  getDaysInMonth,
  getMonthNames,
  getWeekdayNames,
  isDateWithinRange,
  isPast,
  isToday,
  isValidDate,
  isWeekend,
  normalizeDateRange,
} from "./dateUtils";
import { dailyNoteExists, openOrCreateDailyNote } from "./fileUtils";
import type AnnualMatrixPlugin from "./main";

export const ANNUAL_MATRIX_VIEW_TYPE = "annual-matrix-view";

export class AnnualMatrixView extends ItemView {
  plugin: AnnualMatrixPlugin;
  displayYear: number;
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
    return ANNUAL_MATRIX_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Date Grid";
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

    this.renderToolbar(contentEl);
    this.renderAnnualBlockPanel(contentEl);
    this.renderGrid(contentEl);
  }

  private renderToolbar(container: HTMLElement): void {
    const toolbar = container.createDiv({ cls: "annual-matrix-toolbar" });

    const titleGroup = toolbar.createDiv({ cls: "annual-matrix-toolbar-group" });
    titleGroup.createEl("h2", {
      cls: "annual-matrix-title",
      text: `Date Grid ${this.displayYear}`,
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

    const blockListButton = actions.createEl("button", {
      cls: "annual-matrix-icon-button",
      attr: {
        type: "button",
        "aria-label": this.isAnnualBlockListOpen ? "Hide annual block list" : "Show annual block list",
        title: this.isAnnualBlockListOpen ? "Hide annual block list" : "Show annual block list",
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

    const selection = this.getSelectionRange();
    if (selection) {
      const selectionInfo = container.createDiv({ cls: "annual-matrix-selection-bar" });
      selectionInfo.createSpan({
        text:
          selection.startDate === selection.endDate
            ? `Selected: ${selection.startDate}`
            : `Selected: ${selection.startDate} -> ${selection.endDate}`,
      });

      const createBlockButton = selectionInfo.createEl("button", {
        cls: "mod-cta",
        text: "Create Block",
        attr: { type: "button" },
      });
      createBlockButton.addEventListener("click", () => {
        void this.openAnnualBlockModal(selection.startDate, selection.endDate);
      });

      const clearSelectionButton = selectionInfo.createEl("button", {
        text: "Clear Selection",
        attr: { type: "button" },
      });
      clearSelectionButton.addEventListener("click", () => {
        this.clearSelection();
        this.render();
      });
    }
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
    grid.style.setProperty("--annual-matrix-columns", "5rem repeat(31, minmax(2.8rem, 1fr))");

    const corner = grid.createDiv({ cls: "annual-matrix-header-cell annual-matrix-corner-cell" });
    setIcon(corner, "calendar-range");

    for (let day = 1; day <= 31; day += 1) {
      grid.createDiv({
        cls: "annual-matrix-header-cell annual-matrix-day-header",
        text: String(day),
      });
    }

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
          invalidCell.setAttribute("title", "Invalid date");
          continue;
        }

        this.createDateCell(grid, monthIndex, day);
      }
    }
  }

  private renderFixedWeekGrid(container: HTMLElement): void {
    const gridWrapper = container.createDiv({ cls: "annual-matrix-grid-wrapper" });
    const grid = gridWrapper.createDiv({ cls: "annual-matrix-fixed-week-grid" });
    grid.style.setProperty("--annual-matrix-columns", "5rem repeat(31, minmax(2.8rem, 1fr))");

    const monthNames = getMonthNames();
    const weekdayNames = getWeekdayNames();

    const corner = grid.createDiv({ cls: "annual-matrix-header-cell annual-matrix-corner-cell" });
    setIcon(corner, "calendar-range");

    for (let day = 1; day <= 31; day += 1) {
      const weekdayIndex = this.getWeekdayIndexForColumn(day);
      grid.createDiv({
        cls: "annual-matrix-header-cell annual-matrix-day-header",
        text: weekdayNames[weekdayIndex],
      });
    }

    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      grid.createDiv({
        cls: "annual-matrix-month-label",
        text: monthNames[monthIndex],
      });

      const startWeekdayOffset = this.getWeekdayOffsetForMonthStart(monthIndex);
      const daysInMonth = getDaysInMonth(this.displayYear, monthIndex);

      for (let column = 1; column <= 31; column += 1) {
        const day = column - startWeekdayOffset;
        if (day < 1 || day > daysInMonth) {
          grid.createDiv({ cls: "annual-matrix-day-cell is-invalid", attr: { "aria-disabled": "true" } });
          continue;
        }

        this.createDateCell(grid, monthIndex, day);
      }
    }
  }

  private createDateCell(container: HTMLElement, monthIndex: number, day: number): HTMLButtonElement {
    const isoDate = formatDateYYYYMMDD(this.displayYear, monthIndex, day);
    const cell = container.createEl("button", {
      cls: "annual-matrix-day-cell",
      text: String(day),
      attr: {
        type: "button",
        title: isoDate,
      },
    });

    if (this.plugin.settings.markExistingDailyNotes && dailyNoteExists(this.app, this.displayYear, monthIndex, day, this.plugin.settings)) {
      cell.addClass("has-note");
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
    if (matchingBlocks.length > 0) {
      const [firstBlock] = matchingBlocks;
      cell.addClass("has-block");
      cell.style.setProperty("--annual-block-color", firstBlock.color);

      const previousDate = this.shiftIsoDate(isoDate, -1);
      const nextDate = this.shiftIsoDate(isoDate, 1);
      const isBlockStart = !this.plugin.getAnnualBlocksForDate(previousDate).some((block) => block.id === firstBlock.id);
      const isBlockEnd = !this.plugin.getAnnualBlocksForDate(nextDate).some((block) => block.id === firstBlock.id);

      if (isBlockStart) {
        cell.addClass("has-block-start");
      }
      if (!isBlockStart && !isBlockEnd) {
        cell.addClass("has-block-middle");
      }
      if (isBlockEnd) {
        cell.addClass("has-block-end");
      }

      if (matchingBlocks.length > 1) {
        cell.addClass("has-multiple-blocks");
      }

      const blockSummary = matchingBlocks.map((block) => block.title).join(", ");
      cell.setAttribute("title", `${isoDate} • ${blockSummary}`);
      cell.setAttribute("aria-label", `${isoDate}. Blocks: ${blockSummary}`);
    }

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

      await openOrCreateDailyNote(this.app, this.displayYear, monthIndex, day, this.plugin.settings);
      await this.refresh();
    });

    return cell;
  }

  private shiftIsoDate(isoDate: string, offsetDays: number): string {
    const [year, month, day] = isoDate.split("-").map((part) => Number.parseInt(part, 10));
    const shifted = new Date(year, month - 1, day + offsetDays);
    return formatDateYYYYMMDD(shifted.getFullYear(), shifted.getMonth(), shifted.getDate());
  }

  private getWeekdayOffsetForMonthStart(monthIndex: number): number {
    return (new Date(this.displayYear, monthIndex, 1).getDay() + 6) % 7;
  }

  private getWeekdayIndexForColumn(column: number): number {
    return (column - 1) % 7;
  }

  private renderAnnualBlockPanel(container: HTMLElement): void {
    if (!this.isAnnualBlockListOpen) {
      return;
    }

    const blocks = this.plugin.getAnnualBlocksForYear(this.displayYear);
    const panel = container.createDiv({ cls: "annual-matrix-block-panel" });

    const header = panel.createDiv({ cls: "annual-matrix-block-panel-header" });
    header.createEl("h3", {
      cls: "annual-matrix-block-panel-title",
      text: `Annual Blocks ${this.displayYear}`,
    });
    header.createSpan({
      cls: "annual-matrix-block-count",
      text: `${blocks.length}`,
    });

    if (blocks.length === 0) {
      panel.createEl("p", {
        cls: "annual-matrix-block-empty",
        text: "No annual blocks for this year yet. Drag across dates or use Shift-click to create one.",
      });
      return;
    }

    const list = panel.createDiv({ cls: "annual-matrix-block-list" });

    for (const block of blocks) {
      const item = list.createDiv({ cls: "annual-matrix-block-item" });
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
      async (result) => {
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
}
