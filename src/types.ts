export interface AnnualBlock {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color: string;
  category: string;
}

export type AnnualMatrixViewMode = "matrix" | "fixed-week";

export interface AnnualMatrixSettings {
  dailyNotesFolder: string;
  dateFormat: string;
  monthLanguage: "de" | "en";
  viewMode: AnnualMatrixViewMode;
  highlightWeekends: boolean;
  highlightToday: boolean;
  showPastVisualization: boolean;
  markExistingDailyNotes: boolean;
  createDailyNoteOnClick: boolean;
  annualCalendarFolder: string;
}

export interface AnnualMatrixPluginData {
  settings: AnnualMatrixSettings;
  annualBlocks: AnnualBlock[];
}
