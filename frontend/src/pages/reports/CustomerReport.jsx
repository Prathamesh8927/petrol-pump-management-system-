import {
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  FileDown,
} from "lucide-react";

import {
  jsPDF,
} from "jspdf";

import autoTable from "jspdf-autotable";

import {
  getCustomReport,
} from "../../services/reportService";

import api from "../../services/api";

import shivshambhoLogo from "../../assets/logo.png";


const COLORS = {
  mainHeader: "#0F3D56",
  sectionBar: "#EAF2F6",
  text: "#111827",
  border: "#CBD5E1",
  white: "#FFFFFF",
  muted: "#64748B",
};


/* =========================================================
   CUSTOM REPORT
========================================================= */

const CustomReport = () => {

  const today =
    new Date().toLocaleDateString(
      "en-CA"
    );

  const [
    from,
    setFrom,
  ] = useState(today);

  const [
    to,
    setTo,
  ] = useState(today);

  const [
    report,
    setReport,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    pumpSettings,
    setPumpSettings,
  ] = useState(null);


  /* =========================================================
     MONEY FORMAT
  ========================================================= */

  const money = (
    value
  ) =>
    Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2,
      }
    );


  /* =========================================================
     NUMBER FORMAT
  ========================================================= */

  const number = (
    value
  ) =>
    Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2,
      }
    );


  /* =========================================================
     DATE FORMAT
  ========================================================= */

  const formatDate = (
    value
  ) => {

    if (!value) {
      return "-";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value);
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  };


  /* =========================================================
     PUMP HELPERS
  ========================================================= */

  const getPumpName = (
    pump = {}
  ) =>
    pump?.pumpName ||
    pump?.name ||
    pump?.petrolPumpName ||
    "Petrol Pump";


  const getOwnerName = (
    pump = {}
  ) =>
    pump?.ownerName ||
    pump?.owner ||
    "";


  const getCompanyName = (
    pump = {}
  ) =>
    pump?.companyName ||
    pump?.oilCompanyName ||
    pump?.oilCompany ||
    "";


  const getPumpPhone = (
    pump = {}
  ) =>
    pump?.phone ||
    pump?.mobile ||
    pump?.mobileNumber ||
    "";


  const getPumpGstin = (
    pump = {}
  ) =>
    pump?.gstin ||
    pump?.gstNo ||
    "";


  const getPumpAddress = (
    pump = {}
  ) =>
    pump?.address ||
    "";


  const getPumpCity = (
    pump = {}
  ) =>
    pump?.city ||
    "";


  const getPumpState = (
    pump = {}
  ) =>
    pump?.state ||
    "";


  const getPumpPincode = (
    pump = {}
  ) =>
    pump?.pincode ||
    pump?.pinCode ||
    "";


  /* =========================================================
     LOAD IMAGE
  ========================================================= */

  const loadImageAsDataURL =
    async (
      imageSource
    ) => {

      if (!imageSource) {
        return null;
      }

      if (
        typeof imageSource === "string" &&
        imageSource.startsWith(
          "data:image/"
        )
      ) {
        return imageSource;
      }

      try {

        const response =
          await fetch(
            imageSource,
            {
              method: "GET",
              mode: "cors",
              cache: "no-cache",
            }
          );

        if (!response.ok) {
          throw new Error(
            "Image request failed"
          );
        }

        const blob =
          await response.blob();

        return await new Promise(
          (
            resolve,
            reject
          ) => {

            const reader =
              new FileReader();

            reader.onloadend =
              () =>
                resolve(
                  reader.result
                );

            reader.onerror =
              reject;

            reader.readAsDataURL(
              blob
            );

          }
        );

      } catch (error) {

        console.warn(
          "Image loading failed:",
          error
        );

      }

      return null;
    };


  /* =========================================================
     LOAD PUMP SETTINGS
  ========================================================= */

  const loadPumpSettings =
    async () => {

      try {

        const response =
          await api.get(
            "/settings/pump"
          );

        const settings =
          response?.settings ||
          response?.data?.settings ||
          response?.data ||
          {};

        setPumpSettings(
          settings
        );

        return settings;

      } catch (error) {

        console.error(
          "LOAD PUMP SETTINGS ERROR:",
          error
        );

        return null;
      }
    };


  /* =========================================================
     GENERATE REPORT
  ========================================================= */

  const generateReport =
    async () => {

      if (
        !from ||
        !to
      ) {

        toast.error(
          "Select both dates"
        );

        return;
      }


      if (from > to) {

        toast.error(
          "Start date cannot be after end date"
        );

        return;
      }


      try {

        setLoading(
          true
        );


        const data =
          await getCustomReport(
            from,
            to
          );


        setReport(
          data?.report ||
          null
        );


        toast.success(
          "Report generated successfully"
        );

      } catch (error) {

        console.error(
          "CUSTOM REPORT ERROR:",
          error
        );

        toast.error(
          error?.response
            ?.data
            ?.message ||
            "Unable to generate report"
        );

      } finally {

        setLoading(
          false
        );

      }
    };


  /* =========================================================
     PDF HEADER
  ========================================================= */

  const drawPdfHeader =
    (
      doc,
      pump,
      logoData
    ) => {

      const pageWidth =
        doc.internal.pageSize.getWidth();


      const pumpName =
        getPumpName(
          pump
        );


      const companyName =
        getCompanyName(
          pump
        );


      const phone =
        getPumpPhone(
          pump
        );


      const gstin =
        getPumpGstin(
          pump
        );


      const address = [
        getPumpAddress(
          pump
        ),
        getPumpCity(
          pump
        ),
        getPumpState(
          pump
        ),
        getPumpPincode(
          pump
        ),
      ]
        .filter(Boolean)
        .join(", ");


      /* OUTER BORDER */

      doc.setDrawColor(
        COLORS.border
      );

      doc.setLineWidth(
        0.35
      );

      doc.rect(
        5,
        5,
        pageWidth - 10,
        287
      );


      /* GST */

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(
        7
      );

      doc.setTextColor(
        COLORS.text
      );

      doc.text(
        gstin
          ? `GSTIN-${gstin}`
          : "GSTIN-",
        10,
        12
      );


      /* PHONE */

      if (phone) {

        doc.text(
          `PH ${phone}`,
          pageWidth - 10,
          12,
          {
            align:
              "right",
          }
        );

      }


      /* LOGO */

      if (logoData) {

        try {

          doc.addImage(
            logoData,
            "PNG",
            13,
            19,
            24,
            24,
            undefined,
            "FAST"
          );

        } catch (error) {

          console.warn(
            "Unable to add pump logo:",
            error
          );

        }

      }


      /* PUMP NAME */

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        15
      );

      doc.setTextColor(
        COLORS.text
      );

      doc.text(
        pumpName,
        pageWidth / 2,
        19,
        {
          align:
            "center",
        }
      );


      /* COMPANY */

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(
        7.5
      );

      doc.text(
        companyName
          ? `DEALER - ${companyName.toUpperCase()}`
          : "DEALER",
        pageWidth / 2,
        24,
        {
          align:
            "center",
        }
      );


      /* ADDRESS */

      if (address) {

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(
          6.5
        );

        const addressLines =
          doc.splitTextToSize(
            address,
            105
          );

        doc.text(
          addressLines,
          pageWidth / 2,
          30,
          {
            align:
              "center",
          }
        );

      }


      /* REPORT TITLE */

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        12
      );

      doc.setTextColor(
        COLORS.mainHeader
      );

      doc.text(
        "CUSTOM REPORT",
        pageWidth / 2,
        43,
        {
          align:
            "center",
        }
      );


      /* REPORT PERIOD BOX */

      doc.setFillColor(
        COLORS.sectionBar
      );

      doc.setDrawColor(
        COLORS.border
      );

      doc.rect(
        10,
        48,
        pageWidth - 20,
        19,
        "FD"
      );


      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        6
      );

      doc.setTextColor(
        COLORS.muted
      );

      doc.text(
        "REPORT TYPE",
        15,
        55
      );

      doc.text(
        "REPORT PERIOD",
        75,
        55
      );

      doc.text(
        "GENERATED ON",
        150,
        55
      );


      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(
        7
      );

      doc.setTextColor(
        COLORS.text
      );

      doc.text(
        "Custom Financial & Operational",
        15,
        62
      );

      doc.text(
        `${formatDate(from)} - ${formatDate(to)}`,
        75,
        62
      );

      doc.text(
        formatDate(
          new Date()
        ),
        150,
        62
      );


      return 73;
    };


  /* =========================================================
     PDF FOOTER
  ========================================================= */

  const drawPdfFooter =
    (
      doc,
      pageNumber,
      totalPages,
      logoData
    ) => {

      const pageWidth =
        doc.internal.pageSize.getWidth();

      const pageHeight =
        doc.internal.pageSize.getHeight();

      const footerY =
        pageHeight - 14;


      doc.setDrawColor(
        COLORS.border
      );

      doc.setLineWidth(
        0.3
      );

      doc.line(
        10,
        footerY - 7,
        pageWidth - 10,
        footerY - 7
      );


      if (logoData) {

        try {

          doc.addImage(
            logoData,
            "PNG",
            pageWidth / 2 - 31,
            footerY - 4,
            14,
            14,
            undefined,
            "FAST"
          );

        } catch (error) {

          console.warn(
            "Unable to add footer logo:",
            error
          );

        }

      }


      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        7
      );

      doc.setTextColor(
        COLORS.mainHeader
      );

      doc.text(
        "SHIVSHAMBHO",
        pageWidth / 2 - 18,
        footerY + 2
      );


      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(
        5.5
      );

      doc.setTextColor(
        COLORS.muted
      );

      doc.text(
        "Petrol Pump Management System",
        pageWidth / 2,
        footerY + 6,
        {
          align:
            "center",
        }
      );


      doc.setFontSize(
        5
      );

      doc.text(
        `Page ${pageNumber} of ${totalPages}`,
        pageWidth - 10,
        footerY + 2,
        {
          align:
            "right",
        }
      );

    };


  /* =========================================================
     SECTION TITLE
  ========================================================= */

  const drawSectionTitle = (
    doc,
    title,
    y
  ) => {

    const pageWidth =
      doc.internal
        .pageSize
        .getWidth();


    doc.setFillColor(
      234,
      242,
      246
    );

    doc.setDrawColor(
      203,
      213,
      225
    );


    doc.roundedRect(
      12,
      y,
      pageWidth - 24,
      8,
      1.5,
      1.5,
      "FD"
    );


    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(
      9
    );

    doc.setTextColor(
      15,
      61,
      86
    );


    doc.text(
      title,
      16,
      y + 5.5
    );


    return y + 11;
  };


  /* =========================================================
     SECTION SPACE
  ========================================================= */

  const ensureSectionSpace = (
    doc,
    currentY,
    requiredHeight = 45
  ) => {

    const pageHeight =
      doc.internal
        .pageSize
        .getHeight();

    const bottomLimit =
      pageHeight - 28;


    if (
      currentY +
        requiredHeight >
      bottomLimit
    ) {

      doc.addPage();

      return 15;
    }


    return currentY;
  };


  /* =========================================================
     GENERATE PDF
  ========================================================= */

  const generateCustomPDF =
    async () => {

      if (!report) {

        toast.error(
          "Generate the custom report first"
        );

        return;
      }


      try {

        toast.loading(
          "Preparing custom report PDF...",
          {
            id:
              "custom-report-pdf",
          }
        );


        /* ---------------------------------------------
           GET LATEST PUMP SETTINGS
        --------------------------------------------- */

        let pdfPump =
          pumpSettings;


        try {

          const response =
            await api.get(
              "/settings/pump"
            );


          const settings =
            response?.settings ||
            response?.data?.settings ||
            response?.data ||
            {};


          pdfPump =
            settings;


          setPumpSettings(
            settings
          );

        } catch (error) {

          console.warn(
            "Using cached pump settings:",
            error
          );

        }


        /* ---------------------------------------------
           LOAD PUMP LOGO
        --------------------------------------------- */

        const pumpLogoSource =
          pdfPump?.logoUrl ||
          pdfPump?.logoURL ||
          pdfPump?.companyLogo ||
          pdfPump?.pumpLogo ||
          pdfPump?.logo ||
          null;


        const pumpLogoData =
          await loadImageAsDataURL(
            pumpLogoSource
          );


        /* ---------------------------------------------
           LOAD SHIVSHAMBHO LOGO
        --------------------------------------------- */

        const shivshambhoLogoData =
          await loadImageAsDataURL(
            shivshambhoLogo
          );


        /* ---------------------------------------------
           CREATE PDF
        --------------------------------------------- */

        const doc =
          new jsPDF(
            {
              orientation:
                "portrait",

              unit:
                "mm",

              format:
                "a4",

              compress:
                true,
            }
          );


        const pageWidth =
          doc.internal
            .pageSize
            .getWidth();


        /* ---------------------------------------------
           HEADER
        --------------------------------------------- */

        let currentY =
          drawPdfHeader(
            doc,
            pdfPump || {},
            pumpLogoData
          );


        const summary =
          report?.summary ||
          {};


        /* =================================================
           FINANCIAL SUMMARY
        ================================================= */

        currentY =
          ensureSectionSpace(
            doc,
            currentY,
            42
          );


        currentY =
          drawSectionTitle(
            doc,
            "FINANCIAL SUMMARY",
            currentY
          );


        const totalSales =
          Number(
            summary.totalSales ||
            0
          );


        const totalExpenses =
          Number(
            summary.totalExpenses ||
            0
          );


        const netAmount =
          Number(
            summary.netAmount ??
            (
              totalSales -
              totalExpenses
            )
          );


        const pendingLedger =
          Number(
            summary.pendingLedger ||
            0
          );


        autoTable(
          doc,
          {
            startY:
              currentY,

            body: [

              [
                "Total Sales",
                ` ${money(
                  totalSales
                )}`,

                "Total Expenses",
                ` ${money(
                  totalExpenses
                )}`,
              ],

              [
                "Net Amount",
                ` ${money(
                  netAmount
                )}`,

                "Pending Ledger",
                ` ${money(
                  pendingLedger
                )}`,
              ],

            ],

            theme:
              "grid",

            margin: {
              left: 10,
              right: 10,
              bottom: 22,
            },

            tableWidth:
              pageWidth - 20,

            pageBreak:
              "avoid",

            rowPageBreak:
              "avoid",

            styles: {

              font:
                "helvetica",

              fontSize:
                9,

              cellPadding:
                4,

              lineColor: [
                203,
                213,
                225,
              ],

              lineWidth:
                0.25,

              textColor: [
                45,
                45,
                45,
              ],

            },

            columnStyles: {

              0: {
                fillColor: [
                  234,
                  242,
                  246,
                ],

                fontStyle:
                  "bold",

                textColor: [
                  15,
                  61,
                  86,
                ],

                cellWidth:
                  35,
              },

              1: {
                fontStyle:
                  "bold",

                halign:
                  "center",

                cellWidth:
                  55,
              },

              2: {
                fillColor: [
                  234,
                  242,
                  246,
                ],

                fontStyle:
                  "bold",

                textColor: [
                  15,
                  61,
                  86,
                ],

                cellWidth:
                  35,
              },

              3: {
                fontStyle:
                  "bold",

                halign:
                  "center",

                cellWidth:
                  55,
              },

            },

          }
        );


        currentY =
          doc.lastAutoTable
            .finalY + 8;


        /* =================================================
           SALES DETAILS
        ================================================= */

        currentY =
          ensureSectionSpace(
            doc,
            currentY,
            48
          );


        currentY =
          drawSectionTitle(
            doc,
            "SALES DETAILS",
            currentY
          );


        const petrolSales =
          Number(
            summary.petrolSalesAmount ||
            0
          );


        const dieselSales =
          Number(
            summary.dieselSalesAmount ||
            0
          );


        autoTable(
          doc,
          {

            startY:
              currentY,

            head: [
              [
                "Description",
                "Amount",
              ],
            ],

            body: [

              [
                "Petrol Sales",
                ` ${money(
                  petrolSales
                )}`,
              ],

              [
                "Diesel Sales",
                ` ${money(
                  dieselSales
                )}`,
              ],

              [
                "Total Sales",
                ` ${money(
                  totalSales
                )}`,
              ],

            ],

            theme:
              "grid",

            margin: {
              left: 10,
              right: 10,
              bottom: 22,
            },

            tableWidth:
              pageWidth - 20,

            pageBreak:
              "avoid",

            rowPageBreak:
              "avoid",

            styles: {

              font:
                "helvetica",

              fontSize:
                8,

              cellPadding:
                3,

              lineColor: [
                203,
                213,
                225,
              ],

              lineWidth:
                0.25,

            },

            headStyles: {

              fillColor: [
                15,
                61,
                86,
              ],

              textColor: [
                255,
                255,
                255,
              ],

              fontStyle:
                "bold",

            },

            columnStyles: {

              0: {
                cellWidth:
                  115,
              },

              1: {
                cellWidth:
                  65,

                halign:
                  "center",

                fontStyle:
                  "bold",
              },

            },

          }
        );


        currentY =
          doc.lastAutoTable
            .finalY + 8;


        /* =================================================
           EXPENSE DETAILS
        ================================================= */

        currentY =
          ensureSectionSpace(
            doc,
            currentY,
            55
          );


        currentY =
          drawSectionTitle(
            doc,
            "EXPENSE DETAILS",
            currentY
          );


        const fuelPurchaseCost =
          Number(
            summary.totalFuelPurchaseAmount ||
            0
          );


        const salaryExpenses =
          Number(
            summary.salaryExpenses ||
            0
          );


        const otherExpenses =
          Math.max(
            0,
            totalExpenses -
              salaryExpenses
          );


        autoTable(
          doc,
          {

            startY:
              currentY,

            head: [
              [
                "Description",
                "Amount",
              ],
            ],

            body: [

              [
                "Fuel Purchase Cost",
                ` ${money(
                  fuelPurchaseCost
                )}`,
              ],

              [
                "Salary Expenses",
                ` ${money(
                  salaryExpenses
                )}`,
              ],

              [
                "Other Expenses",
                ` ${money(
                  otherExpenses
                )}`,
              ],

              [
                "Total Expenses",
                ` ${money(
                  totalExpenses
                )}`,
              ],

            ],

            theme:
              "grid",

            margin: {
              left: 10,
              right: 10,
              bottom: 22,
            },

            tableWidth:
              pageWidth - 20,

            pageBreak:
              "avoid",

            rowPageBreak:
              "avoid",

            styles: {

              font:
                "helvetica",

              fontSize:
                8,

              cellPadding:
                3,

              lineColor: [
                203,
                213,
                225,
              ],

              lineWidth:
                0.25,

            },

            headStyles: {

              fillColor: [
                15,
                61,
                86,
              ],

              textColor: [
                255,
                255,
                255,
              ],

              fontStyle:
                "bold",

            },

            columnStyles: {

              0: {
                cellWidth:
                  115,
              },

              1: {
                cellWidth:
                  65,

                halign:
                  "center",

                fontStyle:
                  "bold",
              },

            },

          }
        );


        currentY =
          doc.lastAutoTable
            .finalY + 8;


        /* =================================================
           FUEL SALES
        ================================================= */

        currentY =
          ensureSectionSpace(
            doc,
            currentY,
            48
          );


        currentY =
          drawSectionTitle(
            doc,
            "FUEL SALES",
            currentY
          );


        const petrolLitres =
          Number(
            summary.petrolLitresSold ||
            0
          );


        const dieselLitres =
          Number(
            summary.dieselLitresSold ||
            0
          );


        const totalLitres =
          Number(
            summary.totalLitresSold ??
            (
              petrolLitres +
              dieselLitres
            )
          );


        autoTable(
          doc,
          {

            startY:
              currentY,

            head: [
              [
                "Fuel Type",
                "Quantity",
              ],
            ],

            body: [

              [
                "Petrol",
                `${number(
                  petrolLitres
                )} L`,
              ],

              [
                "Diesel",
                `${number(
                  dieselLitres
                )} L`,
              ],

              [
                "Total Fuel Sold",
                `${number(
                  totalLitres
                )} L`,
              ],

            ],

            theme:
              "grid",

            margin: {
              left: 10,
              right: 10,
              bottom: 22,
            },

            tableWidth:
              pageWidth - 20,

            pageBreak:
              "avoid",

            rowPageBreak:
              "avoid",

            styles: {

              font:
                "helvetica",

              fontSize:
                8,

              cellPadding:
                3,

              lineColor: [
                203,
                213,
                225,
              ],

              lineWidth:
                0.25,

            },

            headStyles: {

              fillColor: [
                15,
                61,
                86,
              ],

              textColor: [
                255,
                255,
                255,
              ],

              fontStyle:
                "bold",

            },

            columnStyles: {

              0: {
                cellWidth:
                  115,
              },

              1: {
                cellWidth:
                  65,

                halign:
                  "center",

                fontStyle:
                  "bold",
              },

            },

          }
        );


        currentY =
          doc.lastAutoTable
            .finalY + 8;


        /* =================================================
           STOCK POSITION
        ================================================= */

        currentY =
          ensureSectionSpace(
            doc,
            currentY,
            48
          );


        currentY =
          drawSectionTitle(
            doc,
            "CURRENT STOCK POSITION",
            currentY
          );


        const currentPetrolStock =
          Number(
            summary.currentPetrolStock ||
            0
          );


        const currentDieselStock =
          Number(
            summary.currentDieselStock ||
            0
          );


        autoTable(
          doc,
          {

            startY:
              currentY,

            head: [
              [
                "Fuel Type",
                "Current Stock",
              ],
            ],

            body: [

              [
                "Petrol",
                `${number(
                  currentPetrolStock
                )} L`,
              ],

              [
                "Diesel",
                `${number(
                  currentDieselStock
                )} L`,
              ],

              [
                "Total Fuel Stock",
                `${number(
                  currentPetrolStock +
                  currentDieselStock
                )} L`,
              ],

            ],

            theme:
              "grid",

            margin: {
              left: 10,
              right: 10,
              bottom: 22,
            },

            tableWidth:
              pageWidth - 20,

            pageBreak:
              "avoid",

            rowPageBreak:
              "avoid",

            styles: {

              font:
                "helvetica",

              fontSize:
                8,

              cellPadding:
                3,

              lineColor: [
                203,
                213,
                225,
              ],

              lineWidth:
                0.25,

            },

            headStyles: {

              fillColor: [
                15,
                61,
                86,
              ],

              textColor: [
                255,
                255,
                255,
              ],

              fontStyle:
                "bold",

            },

            columnStyles: {

              0: {
                cellWidth:
                  115,
              },

              1: {
                cellWidth:
                  65,

                halign:
                  "center",

                fontStyle:
                  "bold",
              },

            },

          }
        );


        currentY =
          doc.lastAutoTable
            .finalY + 8;


        /* =================================================
           FINANCIAL POSITION
        ================================================= */

        currentY =
          ensureSectionSpace(
            doc,
            currentY,
            58
          );


        currentY =
          drawSectionTitle(
            doc,
            "CUSTOM FINANCIAL POSITION",
            currentY
          );


        autoTable(
          doc,
          {

            startY:
              currentY,

            head: [
              [
                "Particular",
                "Amount",
              ],
            ],

            body: [

              [
                "Total Sales",
                ` ${money(
                  totalSales
                )}`,
              ],

              [
                "Total Expenses",
                ` ${money(
                  totalExpenses
                )}`,
              ],

              [
                "Net Amount",
                ` ${money(
                  netAmount
                )}`,
              ],

              [
                "Pending Ledger",
                ` ${money(
                  pendingLedger
                )}`,
              ],

            ],

            foot: [
              [
                "NET CUSTOM PERIOD POSITION",
                ` ${money(
                  netAmount
                )}`,
              ],
            ],

            theme:
              "grid",

            margin: {
              left: 10,
              right: 10,
              bottom: 22,
            },

            tableWidth:
              pageWidth - 20,

            pageBreak:
              "avoid",

            rowPageBreak:
              "avoid",

            styles: {

              font:
                "helvetica",

              fontSize:
                8,

              cellPadding:
                3,

              lineColor: [
                203,
                213,
                225,
              ],

              lineWidth:
                0.25,

            },

            headStyles: {

              fillColor: [
                15,
                61,
                86,
              ],

              textColor: [
                255,
                255,
                255,
              ],

              fontStyle:
                "bold",

            },

            footStyles: {

              fillColor: [
                234,
                242,
                246,
              ],

              textColor: [
                15,
                61,
                86,
              ],

              fontStyle:
                "bold",

            },

            columnStyles: {

              0: {
                cellWidth:
                  115,
              },

              1: {
                cellWidth:
                  65,

                halign:
                  "center",

                fontStyle:
                  "bold",
              },

            },

          }
        );


        /* =================================================
           FINAL FOOTER
        ================================================= */

        const totalPages =
          doc.internal
            .getNumberOfPages();


        doc.setPage(
          totalPages
        );


        drawPdfFooter(
          doc,
          totalPages,
          totalPages,
          shivshambhoLogoData
        );


        /* =================================================
           FILE NAME
        ================================================= */

        const safePumpName =
          getPumpName(
            pdfPump || {}
          )
            .replace(
              /[^a-zA-Z0-9-_]+/g,
              "_"
            )
            .replace(
              /^_+|_+$/g,
              ""
            ) ||
          "Petrol_Pump";


        const fileName =
          `${safePumpName}_Custom_Report_${from}_to_${to}.pdf`;


        /* =================================================
           SAVE
        ================================================= */

        doc.save(
          fileName
        );


        toast.success(
          "Custom report PDF exported successfully",
          {
            id:
              "custom-report-pdf",
          }
        );

      } catch (error) {

        console.error(
          "CUSTOM REPORT PDF ERROR:",
          error
        );

        toast.error(
          "Unable to export custom report PDF",
          {
            id:
              "custom-report-pdf",
          }
        );

      }

    };


  /* =========================================================
     RENDER
  ========================================================= */

  const summary =
    report?.summary ||
    {};


  return (

    <div className="page-container">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="page-header">

        <div>

          <h1>
            Custom Report
          </h1>

          <p>
            Generate financial and
            operational reports for
            any selected date range.
          </p>

        </div>


        <div className="report-header-actions">

          <input
            type="date"
            value={
              from
            }
            onChange={(e) =>
              setFrom(
                e.target.value
              )
            }
          />


          <input
            type="date"
            value={
              to
            }
            onChange={(e) =>
              setTo(
                e.target.value
              )
            }
          />


          <button
            type="button"
            className="primary-button"
            disabled={
              loading
            }
            onClick={
              generateReport
            }
          >

            {loading
              ? "Generating..."
              : "Generate"}

          </button>


          {/* =================================================
              ONLY PDF BUTTON
          ================================================= */}

          <button
            type="button"
            className="secondary-button"
            disabled={
              !report ||
              loading
            }
            onClick={
              generateCustomPDF
            }
          >

            <FileDown
              size={17}
            />

            Download PDF

          </button>

        </div>

      </div>


      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading && (

        <div className="content-panel">

          Loading report...

        </div>

      )}


      {/* =====================================================
          REPORT
      ===================================================== */}

      {!loading &&
        report && (

          <>

            {/* =================================================
                SUMMARY CARDS
            ================================================= */}

            <div className="stats-grid">

              <div className="stat-card">

                <h4>
                  Total Sales
                </h4>

                <h2>
                  ₹{" "}
                  {money(
                    summary.totalSales
                  )}
                </h2>

              </div>


              <div className="stat-card">

                <h4>
                  Total Expenses
                </h4>

                <h2>
                  ₹{" "}
                  {money(
                    summary.totalExpenses
                  )}
                </h2>

              </div>


              <div className="stat-card">

                <h4>
                  Net Amount
                </h4>

                <h2>
                  ₹{" "}
                  {money(
                    summary.netAmount
                  )}
                </h2>

              </div>


              <div className="stat-card">

                <h4>
                  Pending Ledger
                </h4>

                <h2>
                  ₹{" "}
                  {money(
                    summary.pendingLedger
                  )}
                </h2>

              </div>

            </div>


            {/* =================================================
                REPORT DETAILS
            ================================================= */}

            <div className="content-panel">

              <div className="content-panel-header">

                <div>

                  <h2>
                    Custom Report Details
                  </h2>

                  <p>

                    Financial and
                    operational summary
                    from{" "}

                    <strong>
                      {formatDate(
                        from
                      )}
                    </strong>

                    {" "}to{" "}

                    <strong>
                      {formatDate(
                        to
                      )}
                    </strong>

                    .

                  </p>

                </div>

              </div>


              <div className="table-container">

                <table>

                  <tbody>

                    <tr>

                      <th>
                        Petrol Sales
                      </th>

                      <td>
                        ₹{" "}
                        {money(
                          summary.petrolSalesAmount
                        )}
                      </td>

                    </tr>


                    <tr>

                      <th>
                        Diesel Sales
                      </th>

                      <td>
                        ₹{" "}
                        {money(
                          summary.dieselSalesAmount
                        )}
                      </td>

                    </tr>


                    <tr>

                      <th>
                        Total Sales
                      </th>

                      <td>
                        ₹{" "}
                        {money(
                          summary.totalSales
                        )}
                      </td>

                    </tr>


                    <tr>

                      <th>
                        Fuel Purchase Cost
                      </th>

                      <td>
                        ₹{" "}
                        {money(
                          summary.totalFuelPurchaseAmount
                        )}
                      </td>

                    </tr>


                    <tr>

                      <th>
                        Salary Expenses
                      </th>

                      <td>
                        ₹{" "}
                        {money(
                          summary.salaryExpenses
                        )}
                      </td>

                    </tr>


                    <tr>

                      <th>
                        Total Expenses
                      </th>

                      <td>
                        ₹{" "}
                        {money(
                          summary.totalExpenses
                        )}
                      </td>

                    </tr>


                    <tr>

                      <th>
                        Net Amount
                      </th>

                      <td>
                        ₹{" "}
                        {money(
                          summary.netAmount
                        )}
                      </td>

                    </tr>


                    <tr>

                      <th>
                        Pending Ledger
                      </th>

                      <td>
                        ₹{" "}
                        {money(
                          summary.pendingLedger
                        )}
                      </td>

                    </tr>


                    <tr>

                      <th>
                        Petrol Sold
                      </th>

                      <td>
                        {number(
                          summary.petrolLitresSold
                        )}{" "}
                        L
                      </td>

                    </tr>


                    <tr>

                      <th>
                        Diesel Sold
                      </th>

                      <td>
                        {number(
                          summary.dieselLitresSold
                        )}{" "}
                        L
                      </td>

                    </tr>


                    <tr>

                      <th>
                        Current Petrol Stock
                      </th>

                      <td>
                        {number(
                          summary.currentPetrolStock
                        )}{" "}
                        L
                      </td>

                    </tr>


                    <tr>

                      <th>
                        Current Diesel Stock
                      </th>

                      <td>
                        {number(
                          summary.currentDieselStock
                        )}{" "}
                        L
                      </td>

                    </tr>

                  </tbody>

                </table>

              </div>

            </div>

          </>

        )}

    </div>

  );

};


export default CustomReport;