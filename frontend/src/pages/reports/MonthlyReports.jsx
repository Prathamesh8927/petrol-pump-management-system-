import {
  useEffect,
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
  getMonthlyReport,
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
  petrol: "#2563EB",
  diesel: "#15803D",
};


/* =========================================================
   MONTHLY REPORT
========================================================= */

const MonthlyReport = () => {

  const now =
    new Date();

  const [
    month,
    setMonth,
  ] = useState(
    now.getMonth() + 1
  );

  const [
    year,
    setYear,
  ] = useState(
    now.getFullYear()
  );

  const [
    report,
    setReport,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    pumpSettings,
    setPumpSettings,
  ] = useState(null);


  /* =========================================================
     MONTHS
  ========================================================= */

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];


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


  /* =====================================================
     LOGO HELPERS
  ===================================================== */

  const resolveLogoValue = (
    value
  ) => {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }

    if (
      value &&
      typeof value === "object"
    ) {
      const nested = [
        value.url,
        value.secure_url,
        value.secureUrl,
        value.path,
        value.src,
      ];

      const resolved =
        nested.find(
          (item) =>
            typeof item === "string" &&
            item.trim().length > 0
        );

      return resolved
        ? resolved.trim()
        : null;
    }

    return null;
  };

  /* =====================================================
     OIL PROVIDER LOGO

     Monthly Report must use the petrol pump's oil-provider
     logo in the PDF header. The Shivshambho application
     logo is NOT used as the pump/company logo.
  ===================================================== */

  const OIL_PROVIDER_DOMAINS = {
    "indian oil": "iocl.com",
    "indianoil": "iocl.com",
    "ioc": "iocl.com",
    "bharat petroleum": "bharatpetroleum.in",
    "bpcl": "bharatpetroleum.in",
    "bharatpetroleum": "bharatpetroleum.in",
    "hindustan petroleum": "hindustanpetroleum.com",
    "hpcl": "hindustanpetroleum.com",
    "hindustanpetroleum": "hindustanpetroleum.com",
    "nayara": "nayaraenergy.com",
    "nayara energy": "nayaraenergy.com",
    "reliance": "reliancepetroleum.com",
    "reliance petroleum": "reliancepetroleum.com",
    "shell": "shell.in",
    "jio bp": "jiobp.com",
    "jiobp": "jiobp.com",
    "jio-bp": "jiobp.com",
    "oil india": "oil-india.com",
    "oilindia": "oil-india.com",
    "adani": "adanigas.com",
    "adani total": "adanigas.com",
    "gulf": "gulf.com",
  };

  const normalizeOilProvider = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " " );

  const getOilProviderName = (pump = {}) =>
    pump?.oilCompanyName ||
    pump?.oilCompany ||
    pump?.companyName ||
    pump?.company ||
    pump?.providerName ||
    pump?.provider ||
    pump?.oilProvider ||
    pump?.oilProviderName ||
    "";

  const getOilProviderLogo = (pump = {}) => {
    const providerName = normalizeOilProvider(
      getOilProviderName(pump)
    );

    if (!providerName) {
      return null;
    }

    const domain =
      OIL_PROVIDER_DOMAINS[providerName] ||
      Object.entries(OIL_PROVIDER_DOMAINS).find(
        ([name]) =>
          providerName.includes(name) ||
          name.includes(providerName)
      )?.[1] ||
      null;

    if (!domain) {
      return null;
    }

    /*
     * Use the provider's website icon as the source.
     * loadImageAsDataURL() below converts it to image data
     * and already has the weserv.nl PNG fallback used by
     * FuelPurchaseHistory.jsx.
     */
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
  };

  const getPumpLogo = (pump) => {
    /* Oil-provider logo has priority for Monthly Report. */
    const providerLogo = getOilProviderLogo(pump);

    if (providerLogo) {
      return providerLogo;
    }

    /* Fallback only when no recognized provider is configured. */
    const candidates = [
      pump?.logoUrl,
      pump?.logoURL,
      pump?.companyLogo,
      pump?.pumpLogo,
      pump?.logo,
    ];

    for (const candidate of candidates) {
      const resolved = resolveLogoValue(candidate);

      if (resolved && !resolved.includes("/src/assets/logo.png")) {
        return resolved;
      }
    }

    return null;
  };

  /* =====================================================
     LOAD IMAGE AS DATA URL
  ===================================================== */

  const loadImageAsDataURL =
    async (
      imageSource
    ) => {
      if (!imageSource) {
        return null;
      }

      if (
        typeof imageSource ===
          "string" &&
        imageSource.startsWith(
          "data:image/"
        )
      ) {
        return imageSource;
      }

      const blobToDataURL = (
        blob
      ) =>
        new Promise(
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
              () =>
                reject(
                  new Error(
                    "Failed to convert image"
                  )
                );

            reader.readAsDataURL(
              blob
            );
          }
        );

      const fetchImage = async (
        url
      ) => {
        const response =
          await fetch(
            url,
            {
              method: "GET",
              mode: "cors",
              cache: "no-cache",
            }
          );

        if (!response.ok) {
          throw new Error(
            `Logo request failed: ${response.status}`
          );
        }

        const blob =
          await response.blob();

        if (
          !blob.type.startsWith(
            "image/"
          )
        ) {
          throw new Error(
            `Logo response is not an image: ${blob.type}`
          );
        }

        return blobToDataURL(
          blob
        );
      };

      try {
        return await fetchImage(
          imageSource
        );
      } catch (error) {
        console.warn(
          "Direct logo loading failed:",
          error
        );
      }

      try {
        const proxyUrl =
          `https://images.weserv.nl/?url=${encodeURIComponent(
            imageSource
          )}&w=512&h=512&fit=contain&output=png`;

        return await fetchImage(
          proxyUrl
        );
      } catch (error) {
        console.warn(
          "Logo proxy loading failed:",
          error
        );
      }

      return null;
    };


  /* =========================================================
     PUMP INFORMATION HELPERS
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


  const getPumpEmail = (
    pump = {}
  ) =>
    pump?.email ||
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
     LOAD PUMP PROFILE
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

        const logoUrl =
          getPumpLogo(
            settings
          );

        const normalizedSettings = {

          ...settings,

          pumpName:
            getPumpName(
              settings
            ),

          ownerName:
            getOwnerName(
              settings
            ),

          companyName:
            getCompanyName(
              settings
            ),

          phone:
            getPumpPhone(
              settings
            ),

          email:
            getPumpEmail(
              settings
            ),

          gstin:
            getPumpGstin(
              settings
            ),

          address:
            getPumpAddress(
              settings
            ),

          city:
            getPumpCity(
              settings
            ),

          state:
            getPumpState(
              settings
            ),

          pincode:
            getPumpPincode(
              settings
            ),

          logoUrl:
            logoUrl ||
            null,

          logo:
            settings?.logo ||
            logoUrl ||
            null,
        };

        setPumpSettings(
          normalizedSettings
        );

        return normalizedSettings;

      } catch (
        error
      ) {

        console.error(
          "LOAD PUMP SETTINGS ERROR:",
          error
        );

        setPumpSettings(
          null
        );

        return null;
      }
    };


  /* =========================================================
     LOAD REPORT
  ========================================================= */

  const loadReport =
    async () => {

      try {

        setLoading(
          true
        );

        const data =
          await getMonthlyReport(
            month,
            year
          );

        setReport(
          data?.report ||
          null
        );

      } catch (
        error
      ) {

        console.error(
          "LOAD MONTHLY REPORT ERROR:",
          error
        );

        toast.error(
          error?.response
            ?.data
            ?.message ||
            "Unable to load monthly report"
        );

      } finally {

        setLoading(
          false
        );

      }
    };


  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(
    () => {

      loadReport();

      loadPumpSettings();

    },
    []
  );


  /* =========================================================
     REPORT HEADER
  ========================================================= */

  const getReportPeriod =
    () => {

      const monthName =
        months[
          Number(
            month
          ) - 1
        ];

      return `${monthName} ${year}`;
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
        getPumpName(pump);

      const companyName =
        getCompanyName(pump);

      const phone =
        getPumpPhone(pump);

      const gstin =
        getPumpGstin(pump);

      const address = [
        getPumpAddress(pump),
        getPumpCity(pump),
        getPumpState(pump),
        getPumpPincode(pump),
      ]
        .filter(Boolean)
        .join(", ");

      /* OUTER BORDER */
      doc.setDrawColor(COLORS.border);
      doc.setLineWidth(0.35);
      doc.rect(5, 5, pageWidth - 10, 287);

      /* GST */
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(COLORS.text);
      doc.text(
        gstin ? `GSTIN-${gstin}` : "GSTIN-",
        10,
        12
      );

      /* PHONE */
      if (phone) {
        doc.text(
          `PH ${phone}`,
          pageWidth - 10,
          12,
          { align: "right" }
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
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(COLORS.text);
      doc.text(
        pumpName,
        pageWidth / 2,
        19,
        { align: "center" }
      );

      /* COMPANY */
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(
        companyName
          ? `DEALER - ${companyName.toUpperCase()}`
          : "DEALER",
        pageWidth / 2,
        24,
        { align: "center" }
      );

      /* ADDRESS */
      if (address) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        const addressLines =
          doc.splitTextToSize(address, 105);
        doc.text(
          addressLines,
          pageWidth / 2,
          30,
          { align: "center" }
        );
      }

      /* REPORT TITLE */
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(COLORS.mainHeader);
      doc.text(
        "MONTHLY REPORT",
        pageWidth / 2,
        43,
        { align: "center" }
      );

      /* REPORT PERIOD BOX */
      doc.setFillColor(COLORS.sectionBar);
      doc.setDrawColor(COLORS.border);
      doc.rect(
        10,
        48,
        pageWidth - 20,
        19,
        "FD"
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(COLORS.muted);
      doc.text("REPORT TYPE", 15, 55);
      doc.text("REPORT PERIOD", 75, 55);
      doc.text("GENERATED ON", 150, 55);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(COLORS.text);
      doc.text("Monthly Financial & Operational", 15, 62);
      doc.text(
        getReportPeriod(),
        75,
        62
      );
      doc.text(
        formatDate(new Date()),
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

      doc.setDrawColor(COLORS.border);
      doc.setLineWidth(0.3);
      doc.line(
        10,
        footerY - 7,
        pageWidth - 10,
        footerY - 7
      );

      /* SHIVSHAMBHO LOGO */
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

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(COLORS.mainHeader);
      doc.text(
        "SHIVSHAMBHO",
        pageWidth / 2 - 18,
        footerY + 2
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(COLORS.muted);
      doc.text(
        "Petrol Pump Management System",
        pageWidth / 2,
        footerY + 6,
        { align: "center" }
      );

      doc.setFontSize(5);
      doc.text(
        `Page ${pageNumber} of ${totalPages}`,
        pageWidth - 10,
        footerY + 2,
        { align: "right" }
      );
    };

  /* =========================================================
     PDF SECTION TITLE
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
     KEEP SECTION + TABLE TOGETHER
  ========================================================= */

  const ensureSectionSpace = (
    doc,
    currentY,
    requiredHeight = 45
  ) => {
    const pageHeight =
      doc.internal.pageSize.getHeight();

    const bottomLimit =
      pageHeight - 28;

    if (currentY + requiredHeight > bottomLimit) {
      doc.addPage();
      return 15;
    }

    return currentY;
  };


  /* =========================================================
     PDF EXPORT
  ========================================================= */

  const generateMonthlyPDF =
    async () => {

      if (!report) {

        toast.error(
          "Monthly report is not loaded"
        );

        return;
      }

      try {

        toast.loading(
          "Preparing monthly report PDF...",
          {
            id:
              "monthly-report-pdf",
          }
        );


        /* ---------------------------------------------
           FETCH LATEST PROFILE
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

          const logoUrl =
            getPumpLogo(
              settings
            );

          pdfPump = {
            ...settings,

            pumpName:
              getPumpName(
                settings
              ),

            ownerName:
              getOwnerName(
                settings
              ),

            companyName:
              getCompanyName(
                settings
              ),

            phone:
              getPumpPhone(
                settings
              ),

            email:
              getPumpEmail(
                settings
              ),

            gstin:
              getPumpGstin(
                settings
              ),

            address:
              getPumpAddress(
                settings
              ),

            city:
              getPumpCity(
                settings
              ),

            state:
              getPumpState(
                settings
              ),

            pincode:
              getPumpPincode(
                settings
              ),

            logoUrl:
              logoUrl ||
              null,

            logo:
              settings?.logo ||
              logoUrl ||
              null,
          };

        } catch (
          profileError
        ) {

          console.warn(
            "USING CACHED PUMP PROFILE:",
            profileError
          );

        }


        /* ---------------------------------------------
           LOAD PUMP LOGO
        --------------------------------------------- */

        const oilProviderName =
          getOilProviderName(
            pdfPump || {}
          );

        const pumpLogoUrl =
          getPumpLogo(
            pdfPump || {}
          );

        console.log(
          "MONTHLY REPORT OIL PROVIDER:",
          oilProviderName
        );
        console.log(
          "MONTHLY REPORT OIL PROVIDER LOGO SOURCE:",
          pumpLogoUrl
        );

        const pumpLogoData =
          await loadImageAsDataURL(
            pumpLogoUrl
          );

        console.log(
          "MONTHLY REPORT OIL PROVIDER LOGO LOADED:",
          Boolean(pumpLogoData)
        );


        /* ---------------------------------------------
           LOAD SHIVSHAMBHO LOGO
        --------------------------------------------- */

        const shivshambhoLogoData =
          await loadImageAsDataURL(
            shivshambhoLogo
          );

        console.log(
          "MONTHLY REPORT FOOTER LOGO SOURCE:",
          shivshambhoLogo
        );
        console.log(
          "MONTHLY REPORT FOOTER LOGO LOADED:",
          Boolean(shivshambhoLogoData)
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

        currentY = ensureSectionSpace(
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
            summary.netAmount ||
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


        const summaryBody = [

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

        ];


        autoTable(
          doc,
          {
            startY:
              currentY,

            body:
              summaryBody,

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

              overflow:
                "linebreak",

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

                cellWidth: 35,
              },

              1: {
                fontStyle:
                  "bold",

                halign:
                  "center",

                cellWidth: 55,
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

                cellWidth: 35,
              },

              3: {
                fontStyle:
                  "bold",

                halign:
                  "center",

                cellWidth: 55,
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


        currentY = ensureSectionSpace(
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


        const salesBody = [

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
              petrolSales +
              dieselSales
            )}`,
          ],

        ];


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

            body:
              salesBody,

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

              overflow:
                "linebreak",

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
                halign:
                  "center",

                cellWidth:
                  65,

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


        currentY = ensureSectionSpace(
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


        const expenseBody = [

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

        ];


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

            body:
              expenseBody,

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

              overflow:
                "linebreak",

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


        currentY = ensureSectionSpace(
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


        const stockBody = [

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

        ];


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

            body:
              stockBody,

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

              overflow:
                "linebreak",

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
           MONTHLY FINANCIAL POSITION
        ================================================= */


        currentY = ensureSectionSpace(
          doc,
          currentY,
          58
        );

        currentY =
          drawSectionTitle(
            doc,
            "MONTHLY FINANCIAL POSITION",
            currentY
          );


        const financialBody = [

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

        ];


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

            body:
              financialBody,

            foot: [
              [
                "NET MONTHLY POSITION",
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

              overflow:
                "linebreak",

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
           FOOTER — FINAL PAGE ONLY
           Never draw footer from didDrawPage.
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
          `${safePumpName}_Monthly_Report_${months[month - 1]}_${year}.pdf`;


        /* =================================================
           SAVE
        ================================================= */

        doc.save(
          fileName
        );


        toast.success(
          "Monthly report PDF exported successfully",
          {
            id:
              "monthly-report-pdf",
          }
        );

      } catch (
        error
      ) {

        console.error(
          "MONTHLY REPORT PDF ERROR:",
          error
        );

        toast.error(
          "Unable to export monthly report PDF",
          {
            id:
              "monthly-report-pdf",
          }
        );

      }

    };


  /* =========================================================
     PDF BUTTON HANDLER
  ========================================================= */

  const handleExportPDF =
    () => {
      generateMonthlyPDF();
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
            Monthly Report
          </h1>

          <p>
            Monthly financial and
            operational summary.
          </p>

        </div>


        <div className="report-header-actions">

          <select
            value={
              month
            }
            onChange={(e) =>
              setMonth(
                Number(
                  e.target.value
                )
              )
            }
          >

            {months.map(
              (
                name,
                index
              ) => (

                <option
                  key={
                    name
                  }
                  value={
                    index + 1
                  }
                >
                  {name}
                </option>

              )
            )}

          </select>


          <input
            type="number"
            value={
              year
            }
            onChange={(e) =>
              setYear(
                Number(
                  e.target.value
                )
              )
            }
          />


          <button
            className="primary-button"
            onClick={
              loadReport
            }
          >
            Generate
          </button>


          <button
            type="button"
            className="secondary-button"
            onClick={
              handleExportPDF
            }
            disabled={
              !report
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

      {loading ? (

        <div className="content-panel">

          Loading report...

        </div>

      ) : (

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
                {" "}
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
                {" "}
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
                {" "}
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
                {" "}
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
                  Monthly Report Details
                </h2>

                <p>
                  Financial and operational
                  summary for{" "}
                  <strong>
                    {
                      months[
                        month - 1
                      ]
                    }{" "}
                    {year}
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
                      {" "}
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
                      {" "}
                      {money(
                        summary.dieselSalesAmount
                      )}
                    </td>

                  </tr>


                  <tr>

                    <th>
                      Fuel Purchase Cost
                    </th>

                    <td>
                      {" "}
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
                      {" "}
                      {money(
                        summary.salaryExpenses
                      )}
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


export default MonthlyReport;