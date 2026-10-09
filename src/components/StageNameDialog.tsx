import { useEffect, useId, useState, type FormEvent } from "react";
import { useI18n } from "../i18n.js";
import { Button } from "./ui/Button.js";

type StageNameDialogProps = {
  initialName?: string;
  mode: "create" | "rename";
  onClose: () => void;
  onSubmit: (name: string) => void;
};

export function StageNameDialog({
  initialName = "",
  mode,
  onClose,
  onSubmit,
}: StageNameDialogProps) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);
  const titleId = useId();
  const descriptionId = useId();
  const normalizedName = name.trim();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (normalizedName) onSubmit(normalizedName);
  };

  return (
    <div className="collection-save-dialog__backdrop">
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="collection-save-dialog"
        role="dialog"
      >
        <form onSubmit={submit}>
          <p className="collection-save-dialog__eyebrow">{t("collection.stageDialogEyebrow")}</p>
          <h2 id={titleId}>{t(`collection.stageDialog.${mode}.title`)}</h2>
          <p id={descriptionId}>{t(`collection.stageDialog.${mode}.description`)}</p>
          <label className="collection-save-dialog__field">
            <span>{t("collection.stageNameLabel")}</span>
            <input
              autoFocus
              maxLength={60}
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder={t("collection.stageNamePlaceholder")}
              required
              type="text"
              value={name}
            />
          </label>
          <div className="collection-save-dialog__actions">
            <Button onClick={onClose} size="lg" variant="ghost">
              {t("figure.collection.cancel")}
            </Button>
            <Button disabled={!normalizedName} size="lg" type="submit" variant="primary">
              {t(mode === "create" ? "collection.createStage" : "collection.saveStageName")}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
