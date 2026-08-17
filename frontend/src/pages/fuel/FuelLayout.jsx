import { Outlet } from "react-router-dom";

const FuelLayout = () => {
  return (
    <div className="page-container">

      <div className="module-content">
        <Outlet />
      </div>

    </div>
  );
};

export default FuelLayout;