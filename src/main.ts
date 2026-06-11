import { Plugin, WorkspaceLeaf } from "obsidian";

import { ANNUAL_MATRIX_VIEW_TYPE, AnnualMatrixView } from "./AnnualMatrixView";
import { isDateWithinRange, normalizeDateRange } from "./dateUtils";
import { AnnualMatrixSettingTab, DEFAULT_SETTINGS } from "./settings";
import type {
  AnnualBlock,
  AnnualCategoryPresets,
  AnnualMatrixPluginData,
  AnnualMatrixSettings,
  AnnualStamp,
} from "./types";

export default class AnnualMatrixPlugin extends Plugin {
  settings: AnnualMatrixSettings = DEFAULT_SETTINGS;
  annualBlocks: AnnualBlock[] = [];
  annualStamps: AnnualStamp[] = [];
  categoryPresets: AnnualCategoryPresets = {};

  async onload(): Promise<void> {
    await this.loadPluginData();

    this.registerView(
      ANNUAL_MATRIX_VIEW_TYPE,
      (leaf) => new AnnualMatrixView(leaf, this),
    );

    this.addCommand({
      id: "open-annual-matrix",
      name: "Open Annual Calendar",
      callback: async () => {
        await this.activateView();
      },
    });

    this.addRibbonIcon("calendar-range", "Open Annual Calendar", async () => {
      await this.activateView();
    });

    this.addSettingTab(new AnnualMatrixSettingTab(this.app, this));

    this.registerEvent(this.app.vault.on("create", async () => this.refreshAllViews()));
    this.registerEvent(this.app.vault.on("delete", async () => this.refreshAllViews()));
    this.registerEvent(this.app.vault.on("rename", async () => this.refreshAllViews()));
  }

  async onunload(): Promise<void> {
    await this.app.workspace.detachLeavesOfType(ANNUAL_MATRIX_VIEW_TYPE);
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = null;

    const leaves = workspace.getLeavesOfType(ANNUAL_MATRIX_VIEW_TYPE);
    if (leaves.length > 0) {
      [leaf] = leaves;
    } else {
      leaf = workspace.getLeaf(true);
      await leaf.setViewState({
        type: ANNUAL_MATRIX_VIEW_TYPE,
        active: true,
      });
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  async loadPluginData(): Promise<void> {
    const loaded = (await this.loadData()) as AnnualMatrixPluginData | AnnualMatrixSettings | null;

    if (!loaded) {
      this.settings = { ...DEFAULT_SETTINGS };
      this.annualBlocks = [];
      this.annualStamps = [];
      this.categoryPresets = {};
      return;
    }

    if ("settings" in loaded) {
      this.settings = this.normalizeSettings(loaded.settings);
      this.annualBlocks = this.normalizeAnnualBlocks(loaded.annualBlocks);
      this.annualStamps = this.normalizeAnnualStamps(loaded.annualStamps);
      this.categoryPresets = this.normalizeCategoryPresets(loaded.categoryPresets);
      return;
    }

    this.settings = this.normalizeSettings(loaded);
    this.annualBlocks = [];
    this.annualStamps = [];
    this.categoryPresets = {};
  }

  async savePluginData(): Promise<void> {
    const payload: AnnualMatrixPluginData = {
      settings: this.settings,
      annualBlocks: this.annualBlocks,
      annualStamps: this.annualStamps,
      categoryPresets: this.categoryPresets,
    };
    await this.saveData(payload);
    await this.refreshAllViews();
  }

  getAnnualBlocksForYear(year: number): AnnualBlock[] {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    return this.annualBlocks.filter(
      (block) => block.startDate <= yearEnd && block.endDate >= yearStart,
    );
  }

  getAnnualBlocksForDate(date: string): AnnualBlock[] {
    return this.annualBlocks.filter((block) => isDateWithinRange(date, block.startDate, block.endDate));
  }

  getAnnualStampsForYear(year: number): AnnualStamp[] {
    const yearPrefix = `${year}-`;
    return this.annualStamps.filter((stamp) => stamp.date.startsWith(yearPrefix));
  }

  getAnnualStampsForDate(date: string): AnnualStamp[] {
    return this.annualStamps.filter((stamp) => stamp.date === date);
  }

  getCategoryColorPreset(category: string): string | null {
    const normalizedCategory = category.trim().toLowerCase();
    if (!normalizedCategory) {
      return null;
    }

    return this.categoryPresets[normalizedCategory] ?? null;
  }

  getCategoryPresetNames(): string[] {
    return Object.keys(this.categoryPresets).sort((left, right) => left.localeCompare(right));
  }

  async addAnnualBlock(block: Omit<AnnualBlock, "id">): Promise<AnnualBlock> {
    const normalized = normalizeDateRange(block.startDate, block.endDate);
    const nextBlock: AnnualBlock = {
      ...block,
      ...normalized,
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    this.annualBlocks = [...this.annualBlocks, nextBlock];
    await this.savePluginData();
    return nextBlock;
  }

  async removeAnnualBlock(blockId: string): Promise<void> {
    this.annualBlocks = this.annualBlocks.filter((block) => block.id !== blockId);
    await this.savePluginData();
  }

  async addAnnualStamp(stamp: Omit<AnnualStamp, "id">): Promise<AnnualStamp> {
    const nextStamp: AnnualStamp = {
      ...stamp,
      id: `stamp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    this.annualStamps = [...this.annualStamps, nextStamp];
    await this.savePluginData();
    return nextStamp;
  }

  async removeAnnualStamp(stampId: string): Promise<void> {
    this.annualStamps = this.annualStamps.filter((stamp) => stamp.id !== stampId);
    await this.savePluginData();
  }

  rememberCategoryColorPreset(category: string, color: string): void {
    const normalizedCategory = category.trim().toLowerCase();
    if (!normalizedCategory) {
      return;
    }

    this.categoryPresets = {
      ...this.categoryPresets,
      [normalizedCategory]: color,
    };
  }

  async saveCategoryColorPreset(category: string, color: string): Promise<void> {
    this.rememberCategoryColorPreset(category, color);
    await this.savePluginData();
  }

  async refreshAllViews(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(ANNUAL_MATRIX_VIEW_TYPE);
    await Promise.all(
      leaves.map(async (leaf) => {
        const view = leaf.view;
        if (view instanceof AnnualMatrixView) {
          await view.refresh();
        }
      }),
    );
  }

  private normalizeAnnualBlocks(blocks: unknown): AnnualBlock[] {
    if (!Array.isArray(blocks)) {
      return [];
    }

    return blocks
      .filter((block): block is Partial<AnnualBlock> & Pick<AnnualBlock, "startDate" | "endDate"> => {
        return typeof block === "object" && block !== null
          && typeof block.startDate === "string"
          && typeof block.endDate === "string";
      })
      .map((block, index) => {
        const normalized = normalizeDateRange(block.startDate, block.endDate);
        return {
          id: typeof block.id === "string" && block.id.length > 0 ? block.id : `legacy-block-${index}`,
          title: typeof block.title === "string" && block.title.trim().length > 0 ? block.title : normalized.startDate,
          category: typeof block.category === "string" && block.category.trim().length > 0 ? block.category : "general",
          color: typeof block.color === "string" && block.color.trim().length > 0 ? block.color : "#4a8f6f",
          startDate: normalized.startDate,
          endDate: normalized.endDate,
        };
      });
  }

  private normalizeAnnualStamps(stamps: unknown): AnnualStamp[] {
    if (!Array.isArray(stamps)) {
      return [];
    }

    return stamps
      .filter((stamp): stamp is Partial<AnnualStamp> & Pick<AnnualStamp, "date"> => {
        return typeof stamp === "object" && stamp !== null
          && typeof stamp.date === "string"
          && stamp.date.length > 0;
      })
      .map((stamp, index) => {
        return {
          id: typeof stamp.id === "string" && stamp.id.length > 0 ? stamp.id : `legacy-stamp-${index}`,
          date: stamp.date,
          emoji: typeof stamp.emoji === "string" && stamp.emoji.trim().length > 0 ? stamp.emoji.trim() : "✨",
          label: typeof stamp.label === "string" ? stamp.label.trim() : "",
          color: typeof stamp.color === "string" && stamp.color.trim().length > 0 ? stamp.color : "#f59e0b",
        };
      });
  }

  private normalizeCategoryPresets(presets: unknown): AnnualCategoryPresets {
    if (!presets || typeof presets !== "object") {
      return {};
    }

    return Object.entries(presets).reduce<AnnualCategoryPresets>((accumulator, [category, color]) => {
      const normalizedCategory = category.trim().toLowerCase();
      if (!normalizedCategory || typeof color !== "string" || color.trim().length === 0) {
        return accumulator;
      }

      accumulator[normalizedCategory] = color;
      return accumulator;
    }, {});
  }

  private normalizeSettings(settings: unknown): AnnualMatrixSettings {
    if (!settings || typeof settings !== "object") {
      return { ...DEFAULT_SETTINGS };
    }

    const raw = settings as Partial<AnnualMatrixSettings> & Record<string, unknown>;
    return {
      ...DEFAULT_SETTINGS,
      monthLanguage: raw.monthLanguage === "de" ? "de" : DEFAULT_SETTINGS.monthLanguage,
      viewMode: raw.viewMode === "fixed-week" ? "fixed-week" : DEFAULT_SETTINGS.viewMode,
      highlightWeekends: typeof raw.highlightWeekends === "boolean" ? raw.highlightWeekends : DEFAULT_SETTINGS.highlightWeekends,
      highlightToday: typeof raw.highlightToday === "boolean" ? raw.highlightToday : DEFAULT_SETTINGS.highlightToday,
      showPastVisualization: typeof raw.showPastVisualization === "boolean" ? raw.showPastVisualization : DEFAULT_SETTINGS.showPastVisualization,
      annualCalendarFolder: typeof raw.annualCalendarFolder === "string" && raw.annualCalendarFolder.trim().length > 0
        ? raw.annualCalendarFolder
        : DEFAULT_SETTINGS.annualCalendarFolder,
    };
  }
}
