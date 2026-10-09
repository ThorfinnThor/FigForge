import { useEffect, useId, useState, type FormEvent } from "react";
import { useI18n } from "../i18n.js";
import { Button } from "./ui/Button.js";

type SaveToCollectionDialogProps = {
  error: boolean;
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  pending: boolean;
  saved: boolean;
};

export function SaveToCollectionDialog({
  error,
  initialName,
  onClose,
  onSave,
  pending,
  saved,
}: SaveToCollectionDialogProps) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);
  const titleId = useId();
  const descriptionId = useId();
  const normalizedName = name.trim();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, pending]);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!normalizedName || pending) return;
    void onSave(normalizedName);
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
        {saved ? (
          <div className="collection-save-dialog__success" role="status">
            <span aria-hidden="true" className="collection-save-dialog__check">✓</span>
            <p className="collection-save-dialog__eyebrow">{t("figure.collection.successEyebrow")}</p>
            <h2 id={titleId}>{t("figure.collection.successTitle")}</h2>
            <p id={descriptionId}>{t("figure.collection.successMessage", { name: normalizedName })}</p>
            <Button className="collection-save-dialog__primary" onClick={onClose} size="lg" variant="primary">
              {t("figure.collection.done")}
            </Button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="collection-save-dialog__eyebrow">{t("figure.collection.dialogEyebrow")}</p>
            <h2 id={titleId}>{t("figure.collection.dialogTitle")}</h2>
            <p id={descriptionId}>{t("figure.collection.dialogDescription")}</p>
            <label className="collection-save-dialog__field">
              <span>{t("figure.collection.nameLabel")}</span>
              <input
                autoFocus
                disabled={pending}
                maxLength={80}
                onChange={(event) => setName(event.currentTarget.value)}
                placeholder={t("figure.collection.namePlaceholder")}
                required
                type="text"
                value={name}
              />
            </label>
            {error ? <p className="collection-save-dialog__error" role="alert">{t("figure.collection.error")}</p> : null}
            <div className="collection-save-dialog__actions">
              <Button disabled={pending} onClick={onClose} size="lg" variant="ghost">
                {t("figure.collection.cancel")}
              </Button>
              <Button disabled={!normalizedName} loading={pending} size="lg" type="submit" variant="primary">
                {t("figure.collection.finish")}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
