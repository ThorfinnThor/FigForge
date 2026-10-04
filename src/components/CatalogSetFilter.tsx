import { useId, useMemo, useState } from "react";
import { loadCatalogSetIndex } from "../catalog/catalog-set-index-data.js";
import {
  findCatalogSets,
  partNumbersForCatalogSet,
  type CatalogSetEntry,
} from "../catalog/catalog-set-filter.js";
import type { CatalogSetIndex } from "../contracts/catalog-set-index.js";
import { useI18n } from "../i18n.js";
import { Button } from "./ui/Button.js";

export type CatalogSetSelection = {
  setNum: string;
  name: string;
  year: number;
  partNumbers: readonly string[];
};

type CatalogSetFilterProps = {
  onChange: (selection: CatalogSetSelection | null) => void;
  selected: CatalogSetSelection | null;
};

type LoadStatus = "idle" | "loading" | "ready" | "error";

const selectionLabel = (set: Pick<CatalogSetSelection, "setNum" | "name">): string =>
  `${set.setNum} · ${set.name}`;

export function CatalogSetFilter({ onChange, selected }: CatalogSetFilterProps) {
  const { t } = useI18n();
  const listboxId = useId();
  const [index, setIndex] = useState<CatalogSetIndex | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle");
  const [query, setQuery] = useState(selected ? selectionLabel(selected) : "");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const suggestions = useMemo(
    () => index && !selected ? findCatalogSets(index, query) : [],
    [index, query, selected],
  );

  const ensureLoaded = (): void => {
    if (loadStatus === "loading" || loadStatus === "ready") return;
    setLoadStatus("loading");
    void loadCatalogSetIndex()
      .then((loadedIndex) => {
        setIndex(loadedIndex);
        setLoadStatus("ready");
      })
      .catch(() => setLoadStatus("error"));
  };

  const chooseSet = (set: CatalogSetEntry): void => {
    if (!index) return;
    const selection = {
      setNum: set.setNum,
      name: set.name,
      year: set.year,
      partNumbers: partNumbersForCatalogSet(index, set),
    } satisfies CatalogSetSelection;
    setQuery(selectionLabel(selection));
    setOpen(false);
    onChange(selection);
  };

  const clear = (): void => {
    setQuery("");
    setOpen(false);
    setHighlightedIndex(0);
    onChange(null);
  };

  const showSuggestions = open && loadStatus === "ready" && !selected;
  const activeSuggestion = suggestions[highlightedIndex];

  return (
    <div className="catalog-set-filter">
      <div className="catalog-set-filter__heading">
        <label htmlFor={`${listboxId}-input`}>{t("catalog.setFilter.label")}</label>
        {selected ? (
          <Button onClick={clear} size="sm" variant="ghost">{t("catalog.setFilter.clear")}</Button>
        ) : null}
      </div>
      <div className="catalog-set-filter__input-wrap">
        <input
          aria-activedescendant={showSuggestions && activeSuggestion
            ? `${listboxId}-${activeSuggestion.setNum}`
            : undefined}
          aria-autocomplete="list"
          aria-controls={showSuggestions ? listboxId : undefined}
          aria-expanded={showSuggestions}
          autoComplete="off"
          className="catalog-set-filter__input"
          id={`${listboxId}-input`}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            setHighlightedIndex(0);
            setOpen(true);
            if (selected) onChange(null);
            ensureLoaded();
          }}
          onFocus={() => {
            ensureLoaded();
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && suggestions.length > 0) {
              event.preventDefault();
              setOpen(true);
              setHighlightedIndex((current) => (current + 1) % suggestions.length);
            } else if (event.key === "ArrowUp" && suggestions.length > 0) {
              event.preventDefault();
              setOpen(true);
              setHighlightedIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
            } else if (event.key === "Enter" && showSuggestions && activeSuggestion) {
              event.preventDefault();
              chooseSet(activeSuggestion);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={t("catalog.setFilter.placeholder")}
          role="combobox"
          type="search"
          value={query}
        />
        <button
          aria-expanded={showSuggestions}
          aria-label={t("catalog.setFilter.toggle")}
          className="catalog-set-filter__toggle"
          onClick={() => {
            ensureLoaded();
            setOpen((current) => !current);
          }}
          onMouseDown={(event) => event.preventDefault()}
          type="button"
        >
          <span aria-hidden="true">▾</span>
        </button>
        {showSuggestions ? (
          <ul className="catalog-set-filter__suggestions" id={listboxId} role="listbox">
            {suggestions.map((set, suggestionIndex) => (
              <li key={set.setNum} role="presentation">
                <button
                  aria-selected={suggestionIndex === highlightedIndex}
                  id={`${listboxId}-${set.setNum}`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    chooseSet(set);
                  }}
                  role="option"
                  type="button"
                >
                  <strong>{set.setNum}</strong>
                  <span>{set.name}</span>
                  <small>{set.year}</small>
                </button>
              </li>
            ))}
            {suggestions.length === 0 ? (
              <li className="catalog-set-filter__empty" role="option" aria-disabled="true">
                {t("catalog.setFilter.noResults")}
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
      <p className="catalog-set-filter__status" role="status">
        {loadStatus === "loading"
          ? t("catalog.setFilter.loading")
          : loadStatus === "error"
            ? t("catalog.setFilter.error")
            : selected
              ? t("catalog.setFilter.selected", {
                count: selected.partNumbers.length,
                set: selectionLabel(selected),
                year: selected.year,
              })
              : t("catalog.setFilter.hint")}
      </p>
    </div>
  );
}
