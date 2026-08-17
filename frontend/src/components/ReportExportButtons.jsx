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

const ReportExportButtons = ({
  report,
  title,
}) => {
  const [
    pump,
    setPump,
  ] = useState({
    pumpName:
      "My Petrol Pump",

    ownerName:
      "Pump Owner",

    companyName: "",

    dealerCode: "",

    address: "",

    city: "",

    state: "",

    pincode: "",
  });

  /* =====================================
     LOAD SETTINGS
  ===================================== */

  useEffect(() => {
    const loadSettings =
      async () => {
        try {
          const data =
            await getPumpSettings();

          const settings =
            data.settings || {};

          setPump({
            pumpName:
              settings.pumpName ||
              "My Petrol Pump",

            ownerName:
              settings.ownerName ||
              "Pump Owner",

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
          console.error(
            "REPORT PUMP SETTINGS ERROR:",
            error
          );
        }
      };

    loadSettings();
  }, []);

  /* =====================================
     COMMON DATA
  ===================================== */

  const exportData = {
    report,

    title,

    ...pump,
  };

  if (!report) {
    return null;
  }

  return (
    <div className="report-export-buttons">

      {/* PDF */}

      <button
        type="button"
        className="report-export-btn"
        onClick={() =>
          exportReportPDF(
            exportData
          )
        }
      >
        <FileText
          size={16}
        />

        PDF
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
      >
        <FileSpreadsheet
          size={16}
        />

        Excel
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
      >
        <FileDown
          size={16}
        />

        CSV
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
      >
        <Printer
          size={16}
        />

        Print
      </button>

    </div>
  );
};

export default ReportExportButtons;