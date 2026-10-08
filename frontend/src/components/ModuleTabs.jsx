import { NavLink } from "react-router-dom";

const ModuleTabs = ({ tabs = [] }) => {
  return (
    <nav
      className="module-tabs"
      aria-label="Module navigation"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.end}
          className={({ isActive }) =>
            isActive
              ? "module-tab active"
              : "module-tab"
          }
        >
          {tab.name}
        </NavLink>
      ))}
    </nav>
  );
};

export default ModuleTabs;