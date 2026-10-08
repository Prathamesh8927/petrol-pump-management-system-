import {
  Link,
} from "react-router-dom";

import {
  ChevronRight,
  Home,
} from "lucide-react";

const Breadcrumbs = ({
  items = [],
}) => {
  const validItems = Array.isArray(
    items
  )
    ? items.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          item.label
      )
    : [];

  return (
    <nav
      className="breadcrumbs"
      aria-label="Breadcrumb"
    >
      <Link
        to="/dashboard"
        className="breadcrumb-home"
        aria-label="Home"
      >
        <Home
          size={15}
          aria-hidden="true"
        />

        <span>
          Home
        </span>
      </Link>

      {validItems.map(
        (item, index) => {
          const isLast =
            index ===
            validItems.length - 1;

          const label = String(
            item.label
          );

          return (
            <div
              className="breadcrumb-item"
              key={`${label}-${index}`}
            >
              <ChevronRight
                size={15}
                className="breadcrumb-separator"
                aria-hidden="true"
              />

              {item.path &&
              !isLast ? (
                <Link
                  to={item.path}
                >
                  {label}
                </Link>
              ) : (
                <span
                  className="breadcrumb-current"
                  aria-current={
                    isLast
                      ? "page"
                      : undefined
                  }
                >
                  {label}
                </span>
              )}
            </div>
          );
        }
      )}
    </nav>
  );
};

export default Breadcrumbs;