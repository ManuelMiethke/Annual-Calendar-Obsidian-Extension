import { App, Modal, Setting } from "obsidian";

interface AnnualBlockModalResult {
  title: string;
  category: string;
  color: string;
}

export class AnnualBlockModal extends Modal {
  private readonly startDate: string;
  private readonly endDate: string;
  private readonly onSubmit: (result: AnnualBlockModalResult) => Promise<void>;
  private readonly onCancel: () => void;
  private readonly categoryPresets: Record<string, string>;
  private readonly categorySuggestions: string[];

  private titleValue: string;
  private categoryValue = "";
  private colorValue = "#4a8f6f";

  constructor(
    app: App,
    startDate: string,
    endDate: string,
    categoryPresets: Record<string, string>,
    categorySuggestions: string[],
    onSubmit: (result: AnnualBlockModalResult) => Promise<void>,
    onCancel: () => void,
  ) {
    super(app);
    this.startDate = startDate;
    this.endDate = endDate;
    this.categoryPresets = categoryPresets;
    this.categorySuggestions = categorySuggestions;
    this.onSubmit = onSubmit;
    this.onCancel = onCancel;
    this.titleValue = startDate === endDate ? startDate : `${startDate} -> ${endDate}`;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "Create Annual Block" });
    contentEl.createEl("p", {
      text: `${this.startDate} to ${this.endDate}`,
      cls: "annual-matrix-modal-description",
    });

    new Setting(contentEl)
      .setName("Title")
      .setDesc("Visible label for the selected range.")
      .addText((text) =>
        text
          .setPlaceholder("Vacation")
          .setValue(this.titleValue)
          .onChange((value) => {
            this.titleValue = value;
          }),
      );

    const colorSetting = new Setting(contentEl).setName("Color").setDesc("Used to tint the selected cells.");
    const colorInput = colorSetting.controlEl.createEl("input", {
      cls: "annual-matrix-color-input",
      attr: {
        type: "color",
        value: this.colorValue,
        "aria-label": "Annual block color",
      },
    });
    colorInput.addEventListener("input", () => {
      this.colorValue = colorInput.value;
    });

    const categoryListId = `annual-matrix-category-presets-${Date.now()}`;
    const categorySetting = new Setting(contentEl)
      .setName("Category")
      .setDesc("Optional group or theme. Saved categories reuse their color automatically.");
    categorySetting.addText((text) => {
      text
        .setPlaceholder("travel")
        .setValue(this.categoryValue)
        .onChange((value) => {
          this.categoryValue = value;
          this.applyPresetColor(value, colorInput);
        });
      text.inputEl.setAttr("list", categoryListId);
    });

    const categoryList = contentEl.createEl("datalist", { attr: { id: categoryListId } });
    for (const category of this.categorySuggestions) {
      categoryList.createEl("option", { attr: { value: category } });
    }

    const buttonRow = contentEl.createDiv({ cls: "annual-matrix-modal-actions" });

    const cancelButton = buttonRow.createEl("button", {
      text: "Cancel",
      attr: { type: "button" },
    });
    cancelButton.addEventListener("click", () => {
      this.close();
    });

    const createButton = buttonRow.createEl("button", {
      cls: "mod-cta",
      text: "Create Block",
      attr: { type: "button" },
    });
    createButton.addEventListener("click", async () => {
      await this.submit();
    });
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.submitted) {
      this.onCancel();
    }
  }

  private submitted = false;

  private async submit(): Promise<void> {
    const title = this.titleValue.trim() || (this.startDate === this.endDate ? this.startDate : `${this.startDate} -> ${this.endDate}`);
    const category = this.categoryValue.trim() || "general";

    this.submitted = true;
    await this.onSubmit({
      title,
      category,
      color: this.colorValue,
    });
    this.close();
  }

  private applyPresetColor(category: string, colorInput: HTMLInputElement): void {
    const presetColor = this.categoryPresets[category.trim().toLowerCase()];
    if (!presetColor) {
      return;
    }

    this.colorValue = presetColor;
    colorInput.value = presetColor;
  }
}
