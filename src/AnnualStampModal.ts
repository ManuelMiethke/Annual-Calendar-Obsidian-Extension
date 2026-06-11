import { App, Modal, Setting } from "obsidian";

interface AnnualStampModalResult {
  emoji: string;
  label: string;
  color: string;
}

export class AnnualStampModal extends Modal {
  private readonly date: string;
  private readonly onSubmit: (result: AnnualStampModalResult) => Promise<void>;
  private readonly onCancel: () => void;

  private emojiValue = "✨";
  private labelValue = "";
  private colorValue = "#f59e0b";
  private submitted = false;

  constructor(
    app: App,
    date: string,
    onSubmit: (result: AnnualStampModalResult) => Promise<void>,
    onCancel: () => void,
  ) {
    super(app);
    this.date = date;
    this.onSubmit = onSubmit;
    this.onCancel = onCancel;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "Add Stamp" });
    contentEl.createEl("p", {
      text: `Highlight ${this.date} with an emoji or marker.`,
      cls: "annual-matrix-modal-description",
    });

    new Setting(contentEl)
      .setName("Emoji")
      .setDesc("One emoji or short symbol.")
      .addText((text) =>
        text
          .setPlaceholder("✨")
          .setValue(this.emojiValue)
          .onChange((value) => {
            this.emojiValue = value;
          }),
      );

    new Setting(contentEl)
      .setName("Label")
      .setDesc("Optional tooltip and list label.")
      .addText((text) =>
        text
          .setPlaceholder("Birthday")
          .setValue(this.labelValue)
          .onChange((value) => {
            this.labelValue = value;
          }),
      );

    const colorSetting = new Setting(contentEl).setName("Accent").setDesc("Used for the stamp glow and chip.");
    const colorInput = colorSetting.controlEl.createEl("input", {
      cls: "annual-matrix-color-input",
      attr: {
        type: "color",
        value: this.colorValue,
        "aria-label": "Stamp accent color",
      },
    });
    colorInput.addEventListener("input", () => {
      this.colorValue = colorInput.value;
    });

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
      text: "Save Stamp",
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

  private async submit(): Promise<void> {
    const emoji = this.emojiValue.trim() || "✨";
    const label = this.labelValue.trim();

    this.submitted = true;
    await this.onSubmit({
      emoji,
      label,
      color: this.colorValue,
    });
    this.close();
  }
}
