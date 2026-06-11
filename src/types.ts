export interface AnnualBlock {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color: string;
  category: string;
}

export interface AnnualStamp {
  id: string;
  date: string;
  emoji: string;
  label: string;
  color: string;
}

export type AnnualCategoryPresets = Record<string, string>;

export type AnnualMatrixViewMode = "matrix" | "fixed-week";

export interface AnnualMatrixSettings {
  monthLanguage: "de" | "en";
  viewMode: AnnualMatrixViewMode;
  highlightWeekends: boolean;
  highlightToday: boolean;
  showPastVisualization: boolean;
  annualCalendarFolder: string;
}

export interface AnnualMatrixPluginData {
  settings: AnnualMatrixSettings;
  annualBlocks: AnnualBlock[];
  annualStamps: AnnualStamp[];
  categoryPresets: AnnualCategoryPresets;
}
