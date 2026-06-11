import { App, PluginSettingTab, Setting } from "obsidian";

import type AnnualMatrixPlugin from "./main";
import type { AnnualMatrixSettings } from "./types";

export const DEFAULT_SETTINGS: AnnualMatrixSettings = {
  dailyNotesFolder: "Daily Notes",
  dateFormat: "YYYY-MM-DD",
  monthLanguage: "en",
  viewMode: "matrix",
  highlightWeekends: true,
  highlightToday: true,
  showPastVisualization: true,
  markExistingDailyNotes: true,
  createDailyNoteOnClick: true,
  annualCalendarFolder: "Annual Calendar",
};

export class AnnualMatrixSettingTab extends PluginSettingTab {
  plugin: AnnualMatrixPlugin;

  constructor(app: App, plugin: AnnualMatrixPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Annual Matrix" });

    this.addTextSetting(
      "Daily Notes Folder",
      "Folder used for daily note files.",
      this.plugin.settings.dailyNotesFolder,
      async (value) => {
        this.plugin.settings.dailyNotesFolder = value.trim() || DEFAULT_SETTINGS.dailyNotesFolder;
        await this.plugin.savePluginData();
      },
    );

    this.addTextSetting(
      "Date Format",
      "Filename pattern for daily notes. Supported tokens: YYYY, MM, DD.",
      this.plugin.settings.dateFormat,
      async (value) => {
        this.plugin.settings.dateFormat = value.trim() || DEFAULT_SETTINGS.dateFormat;
        await this.plugin.savePluginData();
      },
    );

    new Setting(containerEl)
      .setName("View mode")
      .setDesc("Choose between the Date Grid and a fixed-week layout.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("matrix", "Date Grid")
          .addOption("fixed-week", "Fixed week")
          .setValue(this.plugin.settings.viewMode)
          .onChange(async (value) => {
            this.plugin.settings.viewMode = value === "fixed-week" ? "fixed-week" : "matrix";
            await this.plugin.savePluginData();
          }),
      );

    this.addToggleSetting(
      "Highlight weekends",
      "Mark Saturdays and Sundays in the annual matrix.",
      this.plugin.settings.highlightWeekends,
      async (value) => {
        this.plugin.settings.highlightWeekends = value;
        await this.plugin.savePluginData();
      },
    );

    this.addToggleSetting(
      "Highlight today",
      "Visually mark the current date when the current year is shown.",
      this.plugin.settings.highlightToday,
      async (value) => {
        this.plugin.settings.highlightToday = value;
        await this.plugin.savePluginData();
      },
    );

    this.addToggleSetting(
      "Show past visualization",
      "Subtly differentiate dates that are already in the past.",
      this.plugin.settings.showPastVisualization,
      async (value) => {
        this.plugin.settings.showPastVisualization = value;
        await this.plugin.savePluginData();
      },
    );

    this.addToggleSetting(
      "Mark existing daily notes",
      "Highlight cells that already have a daily note file.",
      this.plugin.settings.markExistingDailyNotes,
      async (value) => {
        this.plugin.settings.markExistingDailyNotes = value;
        await this.plugin.savePluginData();
      },
    );

    this.addToggleSetting(
      "Create daily note on click",
      "Create a missing daily note automatically when a date is clicked.",
      this.plugin.settings.createDailyNoteOnClick,
      async (value) => {
        this.plugin.settings.createDailyNoteOnClick = value;
        await this.plugin.savePluginData();
      },
    );

    this.addTextSetting(
      "Annual Calendar Folder",
      "Reserved for future annual block and metadata files.",
      this.plugin.settings.annualCalendarFolder,
      async (value) => {
        this.plugin.settings.annualCalendarFolder = value.trim() || DEFAULT_SETTINGS.annualCalendarFolder;
        await this.plugin.savePluginData();
      },
    );
  }

  private addTextSetting(
    name: string,
    description: string,
    value: string,
    onChange: (value: string) => Promise<void>,
  ): void {
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(description)
      .addText((text) => text.setPlaceholder(value).setValue(value).onChange(onChange));
  }

  private addToggleSetting(
    name: string,
    description: string,
    value: boolean,
    onChange: (value: boolean) => Promise<void>,
  ): void {
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(description)
      .addToggle((toggle) => toggle.setValue(value).onChange(onChange));
  }
}
