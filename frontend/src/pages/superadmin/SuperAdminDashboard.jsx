import {
  useEffect,
  useState,
} from "react";

import {
  Building2,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";

import {
  getSuperAdminSummary,
} from "../../services/superAdminService";

const SuperAdminDashboard =
  () => {
    const [
      summary,
      setSummary,
    ] = useState({
      totalClients: 0,
      activeClients: 0,
      inactiveClients: 0,
      expiredClients: 0,
    });

    useEffect(() => {
      const load =
        async () => {
          try {
            const data =
              await getSuperAdminSummary();

            setSummary(
              data?.summary ||
                {}
            );
          } catch (error) {
            console.error(
              "SUPER ADMIN DASHBOARD ERROR:",
              error
            );
          }
        };

      load();
    }, []);

    return (
      <div>

        <div className="page-header">

          <div>
            <h1>
              Super Admin Dashboard
            </h1>

            <p>
              Manage all SHIVSHAMBHO
              petrol pump clients.
            </p>
          </div>

        </div>

        <div className="super-summary-grid">

          <div className="super-summary-card">

            <Building2 />

            <div>
              <span>
                Total Clients
              </span>

              <h2>
                {
                  summary.totalClients ||
                  0
                }
              </h2>
            </div>

          </div>

          <div className="super-summary-card">

            <CheckCircle2 />

            <div>
              <span>
                Active
              </span>

              <h2>
                {
                  summary.activeClients ||
                  0
                }
              </h2>
            </div>

          </div>

          <div className="super-summary-card">

            <XCircle />

            <div>
              <span>
                Inactive
              </span>

              <h2>
                {
                  summary.inactiveClients ||
                  0
                }
              </h2>
            </div>

          </div>

          <div className="super-summary-card">

            <Clock3 />

            <div>
              <span>
                Expired
              </span>

              <h2>
                {
                  summary.expiredClients ||
                  0
                }
              </h2>
            </div>

          </div>

        </div>

      </div>
    );
  };

export default SuperAdminDashboard;