import Breadcrumbs from "../../components/Breadcrumbs";
import {
  Eye,
  Pencil,
} from "lucide-react";

const Nozzles = () => {
  return (
    <div className="page-container">
      <Breadcrumbs
        items={[
          {
            label: "Nozzles",
          },
          {
            label: "All Nozzles",
          },
        ]}
      />

      <div className="content-panel">
        <div className="content-panel-header">
          <h2>Nozzles</h2>

          <button className="panel-action-button">
            Add Nozzle
          </button>
        </div>

        <div className="table-toolbar">
          <div>
            Show{" "}
            <select defaultValue="10">
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>{" "}
            entries
          </div>

          <div className="table-search">
            <label>Search:</label>
            <input type="text" />
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nozzle</th>
                <th>Fuel</th>
                <th>Tank</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>Nozzle 1</td>
                <td>Petrol</td>
                <td>Tank 1</td>
                <td>
                  <span className="status-badge active">
                    Active
                  </span>
                </td>

                <td>
                  <div className="row-actions">
                    <button
                      className="action-edit"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      className="action-view"
                      title="View"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Nozzles;