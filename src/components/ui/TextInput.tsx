import { useId, type InputHTMLAttributes } from "react";

export type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextInput({
  error,
  hint,
  id,
  label,
  ...props
}: TextInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="ff-field">
      <label className="ff-field__label" htmlFor={inputId}>{label}</label>
      <input
        {...props}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={["ff-input", props.className].filter(Boolean).join(" ")}
        id={inputId}
      />
      {hint ? <p className="ff-field__hint" id={hintId}>{hint}</p> : null}
      {error ? <p className="ff-field__error" id={errorId} role="alert">{error}</p> : null}
    </div>
  );
}
