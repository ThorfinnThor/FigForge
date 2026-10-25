import { useEffect, useId, useState, type FormEvent } from "react";
import { useI18n } from "../i18n.js";
import { Button } from "./ui/Button.js";

type FigureRenameDialogProps = {
  initialName: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
};

export function FigureRenameDialog({ initialName, onClose, onSubmit }: FigureRenameDialogProps) {
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
          <p className="collection-save-dialog__eyebrow">{t("collection.figureDialog.eyebrow")}</p>
          <h2 id={titleId}>{t("collection.figureDialog.title")}</h2>
          <p id={descriptionId}>{t("collection.figureDialog.description")}</p>
          <label className="collection-save-dialog__field">
            <span>{t("figure.nameLabel")}</span>
            <input
              autoFocus
              maxLength={80}
              onChange={(event) => setName(event.currentTarget.value)}
              onFocus={(event) => event.currentTarget.select()}
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
              {t("collection.saveStageName")}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
