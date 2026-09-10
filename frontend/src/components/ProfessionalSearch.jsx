import { useEffect, useRef, useState } from "react";

import {
  Search,
  X,
  UserRound,
  Building2,
} from "lucide-react";

const ProfessionalSearch = ({
  value = "",
  onChange,
  placeholder = "Search...",
  suggestions = [],
  showSuggestions = false,
  onFocus,
  onBlur,
  onSelect,
  onClear,
  type = "default",
  getTitle,
  getSubtitle,
  emptyText = "No matching records found",
  disabled = false,
}) => {
  const [highlightedIndex, setHighlightedIndex] =
    useState(-1);

  const inputRef = useRef(null);

  /* =====================================================
     ICON
  ===================================================== */

  const getIcon = () => {
    if (type === "customer") {
      return UserRound;
    }

    if (type === "supplier") {
      return Building2;
    }

    return Search;
  };

  const ItemIcon = getIcon();

  /* =====================================================
     RESET HIGHLIGHT
  ===================================================== */

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  /* =====================================================
     KEYBOARD NAVIGATION
  ===================================================== */

  const handleKeyDown = (event) => {
    if (disabled) {
      return;
    }

    if (!showSuggestions) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (suggestions.length === 0) {
        return;
      }

      setHighlightedIndex((previous) => {
        if (previous >= suggestions.length - 1) {
          return 0;
        }

        return previous + 1;
      });

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (suggestions.length === 0) {
        return;
      }

      setHighlightedIndex((previous) => {
        if (previous <= 0) {
          return suggestions.length - 1;
        }

        return previous - 1;
      });

      return;
    }

    if (
      event.key === "Enter" &&
      highlightedIndex >= 0 &&
      suggestions[highlightedIndex]
    ) {
      event.preventDefault();

      onSelect?.(
        suggestions[highlightedIndex]
      );

      setHighlightedIndex(-1);

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();

      setHighlightedIndex(-1);

      inputRef.current?.blur();
    }
  };

  /* =====================================================
     SELECT
  ===================================================== */

  const handleSelect = (item) => {
    onSelect?.(item);
    setHighlightedIndex(-1);
  };

  /* =====================================================
     CLEAR
  ===================================================== */

  const handleClear = (event) => {
    event.preventDefault();

    setHighlightedIndex(-1);

    onClear?.();

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  /* =====================================================
     RETURN
  ===================================================== */

  return (
    <div
      className="professional-search"
      style={{
        position: "relative",
        width: "100%",
      }}
    >
      {/* =================================================
          SEARCH BOX
      ================================================= */}

      <div
        className={`professional-search-box ${
          disabled
            ? "professional-search-disabled"
            : ""
        }`}
        style={{
          position: "relative",
          width: "100%",
          display: "flex",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        <Search
          size={18}
          className="professional-search-icon"
          aria-hidden="true"
        />

        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholder}
          onChange={(event) => {
            setHighlightedIndex(-1);

            onChange?.(
              event.target.value
            );
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={showSuggestions}
          aria-autocomplete="list"
        />

        {value && !disabled && (
          <button
            type="button"
            className="professional-search-clear"
            onMouseDown={handleClear}
            title="Clear search"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* =================================================
          DROPDOWN
      ================================================= */}

      {showSuggestions && (
        <div
          className="professional-search-dropdown"
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            width: "100%",
            maxHeight: "320px",
            overflowY: "auto",
            background: "#ffffff",
            border: "1px solid #dbe3ea",
            borderRadius: "10px",
            boxShadow:
              "0 12px 30px rgba(15, 61, 86, 0.14)",
            padding: "6px",
            boxSizing: "border-box",
          }}
        >
          {/* =================================================
              EMPTY
          ================================================= */}

          {suggestions.length === 0 ? (
            <div
              className="professional-search-empty"
              style={{
                minHeight: "90px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                padding: "16px",
                color: "#64748b",
                textAlign: "center",
                fontSize: "13px",
              }}
            >
              <Search
                size={24}
                strokeWidth={1.7}
              />

              <span>
                {emptyText}
              </span>
            </div>
          ) : (
            <>
              {/* =================================================
                  HEADER
              ================================================= */}

              {type === "customer" && (
                <div
                  style={{
                    padding: "7px 10px 8px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Existing Customers
                </div>
              )}

              {/* =================================================
                  OPTIONS
              ================================================= */}

              {suggestions.map(
                (item, index) => {
                  const title = getTitle
                    ? getTitle(item)
                    : String(item);

                  const subtitle =
                    getSubtitle
                      ? getSubtitle(item)
                      : "";

                  const isHighlighted =
                    index ===
                    highlightedIndex;

                  return (
                    <button
                      key={
                        item?._id ||
                        item?.id ||
                        `${title}-${index}`
                      }
                      type="button"
                      role="option"
                      aria-selected={
                        isHighlighted
                      }
                      onMouseEnter={() =>
                        setHighlightedIndex(
                          index
                        )
                      }
                      onMouseDown={(event) => {
                        event.preventDefault();

                        handleSelect(item);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "11px",
                        padding: "10px",
                        border: "none",
                        borderRadius: "8px",
                        background: isHighlighted
                          ? "#f1f5f9"
                          : "#ffffff",
                        cursor: "pointer",
                        textAlign: "left",
                        transition:
                          "background 120ms ease",
                        boxSizing: "border-box",
                      }}
                    >
                      {/* ICON */}

                      <div
                        style={{
                          flexShrink: 0,
                          width: "34px",
                          height: "34px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "8px",
                          background: "#eaf2f6",
                          color: "#0f3d56",
                        }}
                      >
                        <ItemIcon
                          size={17}
                          strokeWidth={2}
                        />
                      </div>

                      {/* TEXT */}

                      <div
                        style={{
                          minWidth: 0,
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: "3px",
                        }}
                      >
                        <strong
                          style={{
                            color: "#111827",
                            fontSize: "14px",
                            fontWeight: 700,
                            lineHeight: "18px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {title}
                        </strong>

                        {subtitle && (
                          <span
                            style={{
                              color: "#64748b",
                              fontSize: "12px",
                              lineHeight: "16px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {subtitle}
                          </span>
                        )}
                      </div>

                      {/* KEYBOARD HINT */}

                      {isHighlighted && (
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#64748b",
                          }}
                        >
                          Enter
                        </span>
                      )}
                    </button>
                  );
                }
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfessionalSearch;