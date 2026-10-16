import type { ReactNode } from "react";

type FigurePreviewCardProps = {
  alt: string;
  children?: ReactNode;
  className?: string;
  loading?: "eager" | "lazy";
  src?: string | undefined;
};

export function FigurePreviewCard({
  alt,
  children,
  className = "",
  loading = "lazy",
  src,
}: FigurePreviewCardProps) {
  return (
    <div className={`figure-preview-card${className ? ` ${className}` : ""}`}>
      <span className="figure-preview-card__beam" aria-hidden="true" />
      {src ? (
        <img
          alt={alt}
          className="figure-preview-card__image"
          decoding="async"
          height="720"
          loading={loading}
          src={src}
          width="720"
        />
      ) : null}
      {children}
    </div>
  );
}
