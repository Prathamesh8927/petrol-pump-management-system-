import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const Breadcrumbs = ({ items = [] }) => {
  return (
    <nav className="breadcrumbs">
      <Link
        to="/dashboard"
        className="breadcrumb-home"
      >
        <Home size={15} />
        <span>Home</span>
      </Link>

      {items.map((item, index) => {
        const isLast =
          index === items.length - 1;

        return (
          <div
            className="breadcrumb-item"
            key={`${item.label}-${index}`}
          >
            <ChevronRight
              size={15}
              className="breadcrumb-separator"
            />

            {item.path && !isLast ? (
              <Link to={item.path}>
                {item.label}
              </Link>
            ) : (
              <span className="breadcrumb-current">
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;