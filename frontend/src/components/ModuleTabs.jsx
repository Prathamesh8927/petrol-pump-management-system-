import { NavLink } from "react-router-dom";

const ModuleTabs = ({ tabs }) => {
  return (
    <div className="module-tabs">
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
    </div>
  );
};

export default ModuleTabs;