export interface AnnualBlock {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color: string;
  category: string;
}

export interface AnnualMatrixSettings {
  dailyNotesFolder: string;
  dateFormat: string;
  monthLanguage: "de" | "en";
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
