import { App, Notice, TFile, TFolder, normalizePath } from "obsidian";

import { formatDateWithPattern, formatDateYYYYMMDD } from "./dateUtils";
import type { AnnualMatrixSettings } from "./types";

function trimSlashes(path: string): string {
  return path.replace(/^\/+|\/+$/g, "");
}

export function getDailyNotePath(
  year: number,
  monthIndex: number,
  day: number,
  settings: AnnualMatrixSettings,
): string {
  const folder = trimSlashes(settings.dailyNotesFolder);
  const fileName = `${formatDateWithPattern(year, monthIndex, day, settings.dateFormat)}.md`;
  return normalizePath(folder ? `${folder}/${fileName}` : fileName);
}

export async function ensureFolderExists(app: App, folderPath: string): Promise<void> {
  const normalized = normalizePath(folderPath);
  if (!normalized) {
    return;
  }

  const existing = app.vault.getAbstractFileByPath(normalized);
  if (existing instanceof TFolder) {
    return;
  }

  const segments = normalized.split("/");
  let currentPath = "";

  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    if (!app.vault.getAbstractFileByPath(currentPath)) {
      await app.vault.createFolder(currentPath);
    }
  }
}

export async function openOrCreateDailyNote(
  app: App,
  year: number,
  monthIndex: number,
  day: number,
  settings: AnnualMatrixSettings,
): Promise<TFile | null> {
  const path = getDailyNotePath(year, monthIndex, day, settings);
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) {
    await app.workspace.getLeaf(true).openFile(existing);
    return existing;
  }

  if (!settings.createDailyNoteOnClick) {
    new Notice(`Daily note not found: ${formatDateYYYYMMDD(year, monthIndex, day)}`);
    return null;
  }

  const folderPath = path.includes("/") ? path.split("/").slice(0, -1).join("/") : "";
  await ensureFolderExists(app, folderPath);

  const content = `# ${formatDateYYYYMMDD(year, monthIndex, day)}\n`;
  const file = await app.vault.create(path, content);
  await app.workspace.getLeaf(true).openFile(file);
  return file;
}

export function dailyNoteExists(
  app: App,
  year: number,
  monthIndex: number,
  day: number,
  settings: AnnualMatrixSettings,
): boolean {
  const path = getDailyNotePath(year, monthIndex, day, settings);
  return app.vault.getAbstractFileByPath(path) instanceof TFile;
}
