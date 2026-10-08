import {
  useEffect,
  useState,
} from "react";

import {
  FileText,
  FileSpreadsheet,
  FileDown,
  Printer,
} from "lucide-react";

import {
  getPumpSettings,
} from "../services/settingsService";

import {
  exportReportPDF,
  exportReportExcel,
  exportReportCSV,
  printReport,
} from "../utils/reportExport";

const DEFAULT_PUMP = {
  pumpName: "My Petrol Pump",
  ownerName: "Pump Owner",
  companyName: "",
  dealerCode: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

const ReportExportButtons = ({
  report,
  title,
}) => {
  const [
    pump,
    setPump,
  ] = useState(DEFAULT_PUMP);

  /* =====================================
     LOAD SETTINGS
  ===================================== */

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const data =
          await getPumpSettings();

        if (!isMounted) {
          return;
        }

        const settings =
          data?.settings ||
          data?.pump ||
          data ||
          {};

        setPump({
          pumpName:
            settings.pumpName ||
            DEFAULT_PUMP.pumpName,

          ownerName:
            settings.ownerName ||
            DEFAULT_PUMP.ownerName,

          companyName:
            settings.companyName ||
            "",

          dealerCode:
            settings.dealerCode ||
            "",

          address:
            settings.address ||
            "",

          city:
            settings.city ||
            "",

          state:
            settings.state ||
            "",

          pincode:
            settings.pincode ||
            "",
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(
            "REPORT PUMP SETTINGS ERROR:",
            error.response?.data
              ?.message ||
              error.message ||
              error
          );
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  /* =====================================
     COMMON DATA
  ===================================== */

  if (!report) {
    return null;
  }

  const exportData = {
    report,
    title,
    ...pump,
  };

  /* =====================================
     UI
  ===================================== */

  return (
    <div
      className="report-export-buttons"
      role="group"
      aria-label="Report export options"
    >
      {/* PDF */}

      <button
        type="button"
        className="report-export-btn"
        onClick={() =>
          exportReportPDF(
            exportData
          )
        }
        title="Export PDF"
      >
        <FileText
          size={16}
          aria-hidden="true"
        />

        <span>
          PDF
        </span>
      </button>

      {/* EXCEL */}

      <button
        type="button"
        className="report-export-btn"
        onClick={() =>
          exportReportExcel(
            exportData
          )
        }
        title="Export Excel"
      >
        <FileSpreadsheet
          size={16}
          aria-hidden="true"
        />

        <span>
          Excel
        </span>
      </button>

      {/* CSV */}

      <button
        type="button"
        className="report-export-btn"
        onClick={() =>
          exportReportCSV(
            exportData
          )
        }
        title="Export CSV"
      >
        <FileDown
          size={16}
          aria-hidden="true"
        />

        <span>
          CSV
        </span>
      </button>

      {/* PRINT */}

      <button
        type="button"
        className="report-export-btn"
        onClick={() =>
          printReport(
            exportData
          )
        }
        title="Print report"
      >
        <Printer
          size={16}
          aria-hidden="true"
        />

        <span>
          Print
        </span>
      </button>
    </div>
  );
};

export default ReportExportButtons;