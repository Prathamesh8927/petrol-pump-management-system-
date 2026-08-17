import {
  Search,
  X,
  UserRound,
  Building2,
} from "lucide-react";

const ProfessionalSearch = ({
  value = "",
  onChange,

  placeholder =
    "Search...",

  suggestions = [],

  showSuggestions = false,

  onFocus,

  onBlur,

  onSelect,

  onClear,

  type =
    "default",

  getTitle,

  getSubtitle,

  emptyText =
    "No matching records found",

  disabled = false,
}) => {
  const getIcon = () => {
    if (
      type ===
      "customer"
    ) {
      return UserRound;
    }

    if (
      type ===
      "supplier"
    ) {
      return Building2;
    }

    return Search;
  };

  const ItemIcon =
    getIcon();

  return (
    <div className="professional-search">

      {/* =========================================
          SEARCH BOX
      ========================================= */}

      <div
        className={`professional-search-box ${
          disabled
            ? "professional-search-disabled"
            : ""
        }`}
      >

        <Search
          size={18}
          className="professional-search-icon"
        />

        <input
          type="text"
          value={value}
          disabled={disabled}
          autoComplete="off"
          placeholder={
            placeholder
          }
          onChange={(event) =>
            onChange?.(
              event.target.value
            )
          }
          onFocus={
            onFocus
          }
          onBlur={
            onBlur
          }
        />

        {value &&
          !disabled && (

            <button
              type="button"
              className="professional-search-clear"
              onMouseDown={(
                event
              ) => {
                event.preventDefault();

                onClear?.();
              }}
              title="Clear"
            >
              <X
                size={16}
              />
            </button>

          )}

      </div>

      {/* =========================================
          SUGGESTIONS
      ========================================= */}

      {showSuggestions && (

        <div className="professional-search-dropdown">

          {suggestions.length ===
          0 ? (

            <div className="professional-search-empty">

              <Search
                size={25}
              />

              <span>
                {emptyText}
              </span>

            </div>

          ) : (

            suggestions.map(
              (
                item,
                index
              ) => {

                const title =
                  getTitle
                    ? getTitle(
                        item
                      )
                    : String(
                        item
                      );

                const subtitle =
                  getSubtitle
                    ? getSubtitle(
                        item
                      )
                    : "";

                return (
                  <button
                    key={
                      item?._id ||
                      title ||
                      index
                    }
                    type="button"
                    className="professional-search-option"
                    onMouseDown={(
                      event
                    ) => {
                      event.preventDefault();

                      onSelect?.(
                        item
                      );
                    }}
                  >

                    <div className="professional-search-option-icon">

                      <ItemIcon
                        size={17}
                      />

                    </div>

                    <div className="professional-search-option-content">

                      <strong>
                        {title}
                      </strong>

                      {subtitle && (

                        <span>
                          {subtitle}
                        </span>

                      )}

                    </div>

                  </button>
                );
              }
            )

          )}

        </div>

      )}

    </div>
  );
};

export default ProfessionalSearch;