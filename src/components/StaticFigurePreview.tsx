type StaticFigurePreviewProps = {
  alt: string;
  className?: string;
  src: string;
};

export function StaticFigurePreview({ alt, className = "", src }: StaticFigurePreviewProps) {
  return (
    <div className={`static-figure-preview${className ? ` ${className}` : ""}`}>
      <span className="static-figure-preview__beam" aria-hidden="true" />
      <img
        alt={alt}
        className="static-figure-preview__image"
        decoding="async"
        height="720"
        loading="lazy"
        src={src}
        width="720"
      />
    </div>
  );
}
