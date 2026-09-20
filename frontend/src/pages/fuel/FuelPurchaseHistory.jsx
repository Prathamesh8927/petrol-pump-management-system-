import {
  useEffect,
  useState,
} from "react";

import {
  NavLink,
} from "react-router-dom";

import toast from "react-hot-toast";

import logo from "../../assets/logo.png";

import {
  Plus,
  RefreshCw,
  Fuel,
  Building2,
  CalendarDays,
  Receipt,
  ChevronDown,
  ChevronUp,
  FileDown,
  X,
} from "lucide-react";

import {
  jsPDF,
} from "jspdf";

import autoTable from "jspdf-autotable";

import {
  getFuelPurchases,
} from "../../services/fuelService";

import api from "../../services/api";

/* =====================================================
   PROFESSIONAL PDF COLOR SYSTEM
===================================================== */

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

/* =====================================================
   BASIC HELPERS
===================================================== */

const safeString = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
};

/* =====================================================
   DATE HELPERS
===================================================== */

const getPurchaseDate = (
  purchase
) => {
  return (
    purchase?.purchaseDate ||
    purchase?.date ||
    purchase?.transactionDate ||
    purchase?.entryDate ||
    purchase?.createdAt ||
    null
  );
};

const getDateOnly = (
  value
) => {
  if (!value) {
    return null;
  }

  const date =
    typeof value === "string" &&
    !value.includes("T")
      ? new Date(
          `${value}T00:00:00`
        )
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
};

const formatDate = (
  value
) => {
  if (!value) {
    return "-";
  }

  const date =
    typeof value === "string" &&
    !value.includes("T")
      ? new Date(
          `${value}T00:00:00`
        )
      : new Date(value);

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
   PURCHASE HELPERS
===================================================== */

const getSupplierName = (
  purchase
) => {
  return safeString(
    purchase?.supplierName ||
      purchase?.supplier ||
      purchase?.vendorName ||
      "-"
  );
};

const getFuelType = (
  purchase
) => {
  return safeString(
    purchase?.fuelType ||
      purchase?.fuel ||
      purchase?.fuelName ||
      "-"
  );
};

const getQuantity = (
  purchase
) => {
  return Number(
    purchase?.quantity ??
      purchase?.qty ??
      purchase?.litres ??
      purchase?.liters ??
      0
  );
};

const getPurchasePrice = (
  purchase
) => {
  return Number(
    purchase?.purchasePrice ??
      purchase?.pricePerLiter ??
      purchase?.rate ??
      purchase?.ratePerLiter ??
      purchase?.price ??
      0
  );
};

const getTotalAmount = (
  purchase
) => {
  const directTotal =
    purchase?.totalAmount ??
    purchase?.total ??
    purchase?.amount ??
    purchase?.purchaseAmount;

  if (
    directTotal !==
      undefined &&
    directTotal !== null
  ) {
    return Number(
      directTotal || 0
    );
  }

  return (
    getQuantity(
      purchase
    ) *
    getPurchasePrice(
      purchase
    )
  );
};

const getInvoiceNumber = (
  purchase
) => {
  return (
    purchase?.invoiceNumber ||
    purchase?.invoiceNo ||
    purchase?.billNumber ||
    purchase?.billNo ||
    "-"
  );
};

const getCreatedBy = (
  purchase
) => {
  return (
    purchase?.createdBy?.name ||
    purchase?.createdBy?.username ||
    purchase?.addedBy?.name ||
    purchase?.addedBy?.username ||
    purchase?.user?.name ||
    purchase?.user?.username ||
    "-"
  );
};

const getPurchaseId = (
  purchase,
  index = 0
) => {
  return (
    purchase?._id ||
    purchase?.id ||
    purchase?.purchaseId ||
    `purchase-${index}`
  );
};

/* =====================================================
   PUMP HELPERS
===================================================== */

const getPumpName = (
  pump
) => {
  return safeString(
    pump?.pumpName ||
      pump?.name ||
      pump?.petrolPumpName ||
      "Petrol Pump"
  );
};

const getOwnerName = (
  pump
) => {
  return safeString(
    pump?.ownerName ||
      pump?.owner ||
      ""
  );
};

const getCompanyName = (
  pump
) => {
  return safeString(
    pump?.companyName ||
      pump?.oilCompanyName ||
      pump?.oilCompany ||
      ""
  );
};

const getPumpPhone = (
  pump
) => {
  return safeString(
    pump?.phone ||
      pump?.mobile ||
      pump?.mobileNumber ||
      ""
  );
};

const getPumpEmail = (
  pump
) => {
  return safeString(
    pump?.email ||
      ""
  );
};

const getPumpGstin = (
  pump
) => {
  return safeString(
    pump?.gstin ||
      pump?.gstNo ||
      ""
  );
};

const getPumpAddress = (
  pump
) => {
  return safeString(
    pump?.address ||
      ""
  );
};

const getPumpCity = (
  pump
) => {
  return safeString(
    pump?.city ||
      ""
  );
};

const getPumpState = (
  pump
) => {
  return safeString(
    pump?.state ||
      ""
  );
};

const getPumpPincode = (
  pump
) => {
  return safeString(
    pump?.pincode ||
      pump?.pinCode ||
      ""
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

const getPumpLogo = (
  pump
) => {
  const candidates = [
    pump?.logoUrl,
    pump?.logoURL,
    pump?.companyLogo,
    pump?.pumpLogo,
    pump?.logo,
  ];

  for (
    const candidate of candidates
  ) {
    const resolved =
      resolveLogoValue(
        candidate
      );

    if (resolved) {
      return resolved;
    }
  }

  return null;
};

const COMPANY_DOMAINS = {
  "indian oil": "iocl.com",
  "indian oil corporation": "iocl.com",
  iocl: "iocl.com",
  "bharat petroleum": "bharatpetroleum.in",
  "bharat petroleum corporation": "bharatpetroleum.in",
  bpcl: "bharatpetroleum.in",
  "hindustan petroleum": "hindustanpetroleum.com",
  "hindustan petroleum corporation": "hindustanpetroleum.com",
  hpcl: "hindustanpetroleum.com",
  nayara: "nayaraenergy.com",
  "nayara energy": "nayaraenergy.com",
  reliance: "ril.com",
  "reliance industries": "ril.com",
  shell: "shell.com",
  "shell india": "shell.com",
  "oil india": "oil-india.com",
  "oil india limited": "oil-india.com",
  "jio bp": "jiobp.com",
  "jio-bp": "jiobp.com",
  adani: "adani.com",
  "adani total gas": "adani.com",
  gulf: "gulf.com",
  "gulf oil": "gulfoilltd.com",
};

const normalizeCompanyName = (
  companyName
) =>
  safeString(companyName)
    .toLowerCase()
    .replace(/[.,()]/g, "")
    .replace(/\blimited\b/g, "")
    .replace(/\bltd\b/g, "")
    .replace(/\bcorporation\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const getOnlineCompanyLogo = (
  companyName
) => {
  const normalized =
    normalizeCompanyName(
      companyName
    );

  if (!normalized) {
    return null;
  }

  let domain =
    COMPANY_DOMAINS[
      normalized
    ];

  if (!domain) {
    const matched =
      Object.keys(
        COMPANY_DOMAINS
      ).find(
        (key) =>
          normalized.includes(
            key
          ) ||
          key.includes(
            normalized
          )
      );

    if (matched) {
      domain =
        COMPANY_DOMAINS[
          matched
        ];
    }
  }

  if (!domain) {
    return null;
  }

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain
  )}&sz=256`;
};

const getClientLogo = (
  pump,
  explicitLogoUrl = null
) => {
  const explicit =
    resolveLogoValue(
      explicitLogoUrl
    );

  if (explicit) {
    return explicit;
  }

  const candidates = [
    pump?.logoUrl,
    pump?.logoURL,
    pump?.companyLogo,
    pump?.pumpLogo,
    pump?.logo,
  ];

  for (
    const candidate of candidates
  ) {
    const resolved =
      resolveLogoValue(
        candidate
      );

    if (resolved) {
      return resolved;
    }
  }

  return getOnlineCompanyLogo(
    getCompanyName(pump)
  );
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

/* =====================================================
   COMPONENT
===================================================== */

const FuelPurchaseHistory =
  () => {
    const [
      purchases,
      setPurchases,
    ] = useState([]);

    const [
      loading,
      setLoading,
    ] = useState(true);

    const [
      pump,
      setPump,
    ] = useState({});

    const [
      openSupplierRowId,
      setOpenSupplierRowId,
    ] = useState(null);

    /* =================================================
       PDF STATE
    ================================================= */

    const [
      showPdfOptions,
      setShowPdfOptions,
    ] = useState(false);

    const [
      pdfLoading,
      setPdfLoading,
    ] = useState(false);

    const [
      customFromDate,
      setCustomFromDate,
    ] = useState("");

    const [
      customToDate,
      setCustomToDate,
    ] = useState("");

    /* =================================================
       LOAD PURCHASES
    ================================================= */

    const loadPurchases =
      async () => {
        try {
          setLoading(true);

          const data =
            await getFuelPurchases();

          setPurchases(
            Array.isArray(
              data?.purchases
            )
              ? data.purchases
              : []
          );
        } catch (error) {
          console.error(
            "LOAD PURCHASE HISTORY ERROR:",
            error
          );

          toast.error(
            error?.response?.data
              ?.message ||
              "Unable to load fuel purchase history"
          );

          setPurchases([]);
        } finally {
          setLoading(false);
        }
      };

    /* =================================================
       LOAD PUMP SETTINGS

       Uses the same /settings/pump endpoint
       used by the existing project.
    ================================================= */

    const loadPump =
      async () => {
        try {
          /*
           * IMPORTANT:
           * Use the project's configured Axios API client here
           * instead of window.fetch().
           *
           * The previous fetch("/settings/pump") call could hit the
           * React/Vite/Render frontend and return index.html.
           * That caused: Unexpected token '<', "<!doctype ..."
           *
           * api.js already owns the production API base URL and
           * authentication configuration.
           */
          const response =
            await api.get(
              "/settings/pump"
            );

          const data =
            response?.data ||
            {};

          const settings =
            data?.pump ||
            data?.settings ||
            data?.data ||
            data ||
            {};

          setPump(
            settings
          );
        } catch (error) {
          console.warn(
            "LOAD PUMP SETTINGS ERROR:",
            error
          );

          setPump({});
        }
      };

    /* =================================================
       PAGE LOAD
    ================================================= */

    useEffect(() => {
      loadPurchases();
      loadPump();
    }, []);

    /* =================================================
       SUPPLIER HISTORY
    ================================================= */

    const getSupplierHistory =
      (
        supplierName
      ) => {
        const normalizedSupplier =
          String(
            supplierName || ""
          )
            .trim()
            .toLowerCase();

        return purchases
          .filter(
            (purchase) =>
              getSupplierName(
                purchase
              ).toLowerCase() ===
              normalizedSupplier
          )
          .sort(
            (a, b) => {
              const dateA =
                new Date(
                  getPurchaseDate(
                    a
                  ) || 0
                ).getTime();

              const dateB =
                new Date(
                  getPurchaseDate(
                    b
                  ) || 0
                ).getTime();

              return (
                dateB - dateA
              );
            }
          );
      };

    /* =================================================
       FORMATTERS
    ================================================= */

    const formatCurrency =
      (
        amount
      ) => {
        return new Intl.NumberFormat(
          "en-IN",
          {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
          }
        ).format(
          Number(
            amount || 0
          )
        );
      };

    const formatNumber =
      (
        value
      ) => {
        return Number(
          value || 0
        ).toLocaleString(
          "en-IN",
          {
            maximumFractionDigits: 2,
          }
        );
      };

    const formatPdfMoney =
      (
        value
      ) => {
        return `Rs. ${Number(
          value || 0
        ).toLocaleString(
          "en-IN",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )}`;
      };

    /* =================================================
       DATE RANGE
    ================================================= */

    const getTodayString =
      () => {
        const today =
          new Date();

        return [
          today.getFullYear(),
          String(
            today.getMonth() + 1
          ).padStart(2, "0"),
          String(
            today.getDate()
          ).padStart(2, "0"),
        ].join("-");
      };

    const getThisMonthRange =
      () => {
        const today =
          new Date();

        return {
          from: new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          ),

          to: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          ),
        };
      };

    const getThisYearRange =
      () => {
        const today =
          new Date();

        return {
          from: new Date(
            today.getFullYear(),
            0,
            1
          ),

          to: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          ),
        };
      };

    const filterPurchasesByDate =
      (
        fromDate,
        toDate
      ) => {
        const from =
          getDateOnly(
            fromDate
          );

        const to =
          getDateOnly(
            toDate
          );

        if (
          !from ||
          !to
        ) {
          return [];
        }

        to.setHours(
          23,
          59,
          59,
          999
        );

        return purchases.filter(
          (
            purchase
          ) => {
            const purchaseDate =
              getDateOnly(
                getPurchaseDate(
                  purchase
                )
              );

            if (
              !purchaseDate
            ) {
              return false;
            }

            return (
              purchaseDate >=
                from &&
              purchaseDate <=
                to
            );
          }
        );
      };

    /* =================================================
       SUMMARY
    ================================================= */

    const petrolPurchased =
      purchases
        .filter(
          (purchase) =>
            getFuelType(
              purchase
            )
              .toLowerCase()
              .includes(
                "petrol"
              )
        )
        .reduce(
          (
            total,
            purchase
          ) =>
            total +
            getQuantity(
              purchase
            ),
          0
        );

    const dieselPurchased =
      purchases
        .filter(
          (purchase) =>
            getFuelType(
              purchase
            )
              .toLowerCase()
              .includes(
                "diesel"
              )
        )
        .reduce(
          (
            total,
            purchase
          ) =>
            total +
            getQuantity(
              purchase
            ),
          0
        );

    const totalPurchaseAmount =
      purchases.reduce(
        (
          total,
          purchase
        ) =>
          total +
          getTotalAmount(
            purchase
          ),
        0
      );

    /* =================================================
       PDF HEADER
    ================================================= */

    const drawPdfHeader =
      (
        doc,
        fromDate,
        toDate,
        reportTitle,
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
          } catch (
            error
          ) {
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
          "FUEL PURCHASE REPORT",
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
          reportTitle,
          15,
          62
        );

        doc.text(
          `${formatDate(
            fromDate
          )} - ${formatDate(
            toDate
          )}`,
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

    /* =================================================
       PDF SUMMARY
    ================================================= */

    const drawPdfSummary =
      (
        doc,
        y,
        petrolQuantity,
        dieselQuantity,
        totalQuantity,
        totalAmount,
        transactionCount
      ) => {
        const pageWidth =
          doc.internal.pageSize.getWidth();

        doc.setFillColor(
          COLORS.sectionBar
        );

        doc.setDrawColor(
          COLORS.border
        );

        doc.rect(
          10,
          y,
          pageWidth - 20,
          8,
          "FD"
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(
          8
        );

        doc.setTextColor(
          COLORS.text
        );

        doc.text(
          "PURCHASE SUMMARY",
          13,
          y + 5.5
        );

        y += 10;

        autoTable(
          doc,
          {
            startY: y,

            margin: {
              left: 10,
              right: 10,
            },

            tableWidth:
              pageWidth - 20,

            theme: "grid",

            head: [[
              "PETROL",
              "DIESEL",
              "TOTAL QUANTITY",
              "TOTAL AMOUNT",
              "TRANSACTIONS",
            ]],

            body: [[
              `${formatNumber(
                petrolQuantity
              )} L`,

              `${formatNumber(
                dieselQuantity
              )} L`,

              `${formatNumber(
                totalQuantity
              )} L`,

              formatPdfMoney(
                totalAmount
              ),

              String(
                transactionCount
              ),
            ]],

            styles: {
              font:
                "helvetica",

              fontSize:
                6.5,

              textColor:
                COLORS.text,

              lineColor:
                COLORS.border,

              lineWidth:
                0.3,

              cellPadding:
                2,

              halign:
                "center",

              valign:
                "middle",
            },

            headStyles: {
              fillColor:
                COLORS.mainHeader,

              textColor:
                COLORS.white,

              fontStyle:
                "bold",

              fontSize:
                6,

              halign:
                "center",
            },

            bodyStyles: {
              fillColor:
                COLORS.white,

              fontSize:
                7,
            },

            didParseCell:
              (
                data
              ) => {
                if (
                  data.section !==
                  "body"
                ) {
                  return;
                }

                if (
                  data.column.index ===
                  0
                ) {
                  data.cell.styles.textColor =
                    COLORS.petrol;

                  data.cell.styles.fontStyle =
                    "bold";
                }

                if (
                  data.column.index ===
                  1
                ) {
                  data.cell.styles.textColor =
                    COLORS.diesel;

                  data.cell.styles.fontStyle =
                    "bold";
                }

                if (
                  data.column.index ===
                  3
                ) {
                  data.cell.styles.fontStyle =
                    "bold";
                }
              },
          }
        );

        return (
          doc.lastAutoTable
            .finalY + 7
        );
      };

    /* =================================================
       PDF FOOTER
    ================================================= */

    const drawPdfFooter = (
  doc,
  pageNumber,
  totalPages,
  shivshambhoLogoData
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

        /* SHIVSHAMBHO ASSET LOGO */

        if (shivshambhoLogoData) {
  try {
    doc.addImage(
      shivshambhoLogoData,
      "PNG",
      pageWidth / 2 - 31,
      footerY - 6,
      14,
      14,
      undefined,
      "FAST"
    );
  } catch (error) {
    console.warn(
      "Unable to add Shivshambho footer logo:",
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
          pageWidth - 8,
          footerY + 2,
          {
            align:
              "right",
          }
        );
      };

    /* =================================================
       GENERATE PDF
    ================================================= */

    const generatePurchasePDF =
      async (
        reportPurchases,
        fromDate,
        toDate,
        reportTitle
      ) => {
        let logoData = null;

const pumpLogo = getPumpLogo(pump);

if (pumpLogo) {
  logoData = await loadImageAsDataURL(pumpLogo);
}

/* Shivshambho application logo for PDF footer */
let shivshambhoLogoData = null;

try {
  shivshambhoLogoData =
    await loadImageAsDataURL(logo);
} catch (error) {
  console.warn(
    "Unable to load Shivshambho asset logo:",
    error
  );
}
        if (
          !reportPurchases.length
        ) {
          toast.error(
            "No purchase records found for the selected period."
          );

          return;
        }

        try {
          setPdfLoading(
            true
          );

          const doc =
            new jsPDF({
              orientation:
                "portrait",
              unit: "mm",
              format: "a4",
            });

          const pageWidth =
            doc.internal.pageSize.getWidth();

          const pageHeight =
            doc.internal.pageSize.getHeight();

          const sortedPurchases =
            [
              ...reportPurchases,
            ].sort(
              (
                a,
                b
              ) => {
                const dateA =
                  new Date(
                    getPurchaseDate(
                      a
                    ) || 0
                  ).getTime();

                const dateB =
                  new Date(
                    getPurchaseDate(
                      b
                    ) || 0
                  ).getTime();

                return (
                  dateA - dateB
                );
              }
            );

          let petrolQuantity =
            0;

          let dieselQuantity =
            0;

          let totalQuantity =
            0;

          let totalAmount =
            0;

          sortedPurchases.forEach(
            (
              purchase
            ) => {
              const fuel =
                getFuelType(
                  purchase
                ).toLowerCase();

              const quantity =
                getQuantity(
                  purchase
                );

              const amount =
                getTotalAmount(
                  purchase
                );

              totalQuantity +=
                quantity;

              totalAmount +=
                amount;

              if (
                fuel.includes(
                  "petrol"
                )
              ) {
                petrolQuantity +=
                  quantity;
              }

              if (
                fuel.includes(
                  "diesel"
                )
              ) {
                dieselQuantity +=
                  quantity;
              }
            }
          );

          /* ===========================================
             PROFILE LOGO FOR HEADER

             Use the same profile-logo resolution logic as
             the Ledger PDF. The header must show the
             petrol pump/company logo from the pump profile,
             not the Shivshambho application logo.
          =========================================== */

          let logoData = null;

          const profileLogo =
            getClientLogo(
              pump,
              null
            );

          if (profileLogo) {
            try {
              logoData =
                await loadImageAsDataURL(
                  profileLogo
                );
            } catch (error) {
              console.warn(
                "Unable to load pump profile logo for PDF header:",
                error
              );

              logoData = null;
            }
          }

          /* ===========================================
             HEADER
          =========================================== */

          let y =
            drawPdfHeader(
              doc,
              fromDate,
              toDate,
              reportTitle,
              logoData
            );

          /* ===========================================
             SUMMARY
          =========================================== */

          y =
            drawPdfSummary(
              doc,
              y,
              petrolQuantity,
              dieselQuantity,
              totalQuantity,
              totalAmount,
              sortedPurchases.length
            );

          /* ===========================================
             TRANSACTION HISTORY SECTION
          =========================================== */

          doc.setFillColor(
            COLORS.sectionBar
          );

          doc.setDrawColor(
            COLORS.border
          );

          doc.rect(
            10,
            y,
            pageWidth - 20,
            8,
            "FD"
          );

          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(
            8
          );

          doc.setTextColor(
            COLORS.text
          );

          doc.text(
            "PURCHASE TRANSACTION HISTORY",
            13,
            y + 5.5
          );

          y += 9;

          /* ===========================================
             TABLE DATA
          =========================================== */

          const transactionRows =
            sortedPurchases.map(
              (
                purchase,
                index
              ) => [
                String(
                  index + 1
                ),

                formatDate(
                  getPurchaseDate(
                    purchase
                  )
                ),

                getFuelType(
                  purchase
                ),

                getSupplierName(
                  purchase
                ),

                `${formatNumber(
                  getQuantity(
                    purchase
                  )
                )} L`,

                formatPdfMoney(
                  getPurchasePrice(
                    purchase
                  )
                ),

                formatPdfMoney(
                  getTotalAmount(
                    purchase
                  )
                ),

                getInvoiceNumber(
                  purchase
                ),
              ]
            );

          autoTable(
            doc,
            {
              startY: y,

              margin: {
                left: 10,
                right: 10,
                bottom: 22,
              },

              tableWidth:
                pageWidth - 20,

              theme:
                "grid",

              head: [[
                "#",
                "Date",
                "Fuel",
                "Supplier",
                "Quantity",
                "Rate/L",
                "Amount",
                "Invoice",
              ]],

              body:
                transactionRows,

              foot: [[
                "",
                "",
                "TOTAL",
                "",
                `${formatNumber(
                  totalQuantity
                )} L`,
                "",
                formatPdfMoney(
                  totalAmount
                ),
                "",
              ]],

              footStyles: {
                fillColor:
                  COLORS.sectionBar,

                textColor:
                  COLORS.mainHeader,

                fontStyle:
                  "bold",

                fontSize:
                  6.5,

                halign:
                  "center",

                valign:
                  "middle",

                cellPadding:
                  2,
              },

              styles: {
                font:
                  "helvetica",

                fontSize:
                  6.2,

                textColor:
                  COLORS.text,

                lineColor:
                  COLORS.border,

                lineWidth:
                  0.25,

                cellPadding:
                  1.8,

                valign:
                  "middle",

                halign:
                  "center",

                overflow:
                  "ellipsize",
              },

              headStyles: {
                fillColor:
                  COLORS.mainHeader,

                textColor:
                  COLORS.white,

                fontStyle:
                  "bold",

                fontSize:
                  5.8,

                halign:
                  "center",

                valign:
                  "middle",

                cellPadding:
                  2.2,
              },

              alternateRowStyles: {
                fillColor:
                  "#F8FAFC",
              },

              columnStyles: {
                0: {
                  cellWidth:
                    8,
                },

                1: {
                  cellWidth:
                    21,
                },

                2: {
                  cellWidth:
                    18,
                },

                3: {
                  cellWidth:
                    43,
                },

                4: {
                  cellWidth:
                    22,
                },

                5: {
                  cellWidth:
                    24,
                },

                6: {
                  cellWidth:
                    27,
                },

                7: {
                  cellWidth:
                    "auto",
                },
              },

              didParseCell:
                (
                  data
                ) => {
                  if (
                    data.section !==
                    "body"
                  ) {
                    return;
                  }

                  /* Petrol */

                  if (
                    data.column.index ===
                      2 &&
                    String(
                      data.cell.raw
                    )
                      .toLowerCase()
                      .includes(
                        "petrol"
                      )
                  ) {
                    data.cell.styles.textColor =
                      COLORS.petrol;

                    data.cell.styles.fontStyle =
                      "bold";
                  }

                  /* Diesel */

                  if (
                    data.column.index ===
                      2 &&
                    String(
                      data.cell.raw
                    )
                      .toLowerCase()
                      .includes(
                        "diesel"
                      )
                  ) {
                    data.cell.styles.textColor =
                      COLORS.diesel;

                    data.cell.styles.fontStyle =
                      "bold";
                  }

                  /* Amount */

                  if (
                    data.column.index ===
                    6
                  ) {
                    data.cell.styles.fontStyle =
                      "bold";
                  }
                },

              didDrawPage:
                () => {
                  const pageNumber =
                    doc.internal.getNumberOfPages();

                  drawPdfFooter(
                    doc,
                    pageNumber,
                    1,
                    shivshambhoLogoData
                  );
                },
            }
          );

          /* ===========================================
             PURCHASE TOTAL
          =========================================== */

          let finalY =
            doc.lastAutoTable
              .finalY + 7;

          if (
            finalY >
            pageHeight - 45
          ) {
            doc.addPage();

            finalY = 18;
          }

          doc.setDrawColor(
            COLORS.mainHeader
          );

          doc.setLineWidth(
            0.5
          );

          doc.line(
            10,
            finalY,
            pageWidth - 10,
            finalY
          );

          finalY += 7;

          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(
            9
          );

          doc.setTextColor(
            COLORS.text
          );

          doc.text(
            "PURCHASE TOTAL",
            10,
            finalY
          );

          doc.setTextColor(
            COLORS.mainHeader
          );

          doc.text(
            formatPdfMoney(
              totalAmount
            ),
            pageWidth - 10,
            finalY,
            {
              align:
                "right",
            }
          );

          finalY += 6;

          doc.setFont(
            "helvetica",
            "normal"
          );

          doc.setFontSize(
            6.5
          );

          doc.setTextColor(
            COLORS.muted
          );

          doc.text(
            `Petrol: ${formatNumber(
              petrolQuantity
            )} L`,
            10,
            finalY
          );

          doc.text(
            `Diesel: ${formatNumber(
              dieselQuantity
            )} L`,
            65,
            finalY
          );

          doc.text(
            `Total Quantity: ${formatNumber(
              totalQuantity
            )} L`,
            120,
            finalY
          );

          doc.text(
            `Transactions: ${sortedPurchases.length}`,
            pageWidth - 10,
            finalY,
            {
              align:
                "right",
            }
          );

          /* ===========================================
             FINAL TOTAL CALCULATION

             The purchase totals above are the final
             calculated values for the selected period.
             No pump profile information is printed at
             the end of the report.
          =========================================== */

          /* ===========================================
             FOOTER - FINAL PASS

             Re-draw footer on every page so the
             correct total page count is shown.
          =========================================== */

          const totalPages =
            doc.internal.getNumberOfPages();

          for (
            let page = 1;
            page <=
            totalPages;
            page++
          ) {
            doc.setPage(
              page
            );

            drawPdfFooter(
              doc,
              page,
              totalPages,
              shivshambhoLogoData
            );
          }

          /* ===========================================
             FILE NAME
          =========================================== */

          const today =
            new Date();

          const fileDate =
            [
              today.getFullYear(),
              String(
                today.getMonth() +
                  1
              ).padStart(
                2,
                "0"
              ),
              String(
                today.getDate()
              ).padStart(
                2,
                "0"
              ),
            ].join("-");

          const safePumpName =
            getPumpName(
              pump
            )
              .replace(
                /[^a-zA-Z0-9]+/g,
                "_"
              )
              .replace(
                /^_+|_+$/g,
                ""
              ) ||
            "Petrol_Pump";

          doc.save(
            `Fuel_Purchase_Report_${safePumpName}_${fileDate}.pdf`
          );

          toast.success(
            "Fuel purchase PDF generated successfully."
          );

          setShowPdfOptions(
            false
          );
        } catch (
          error
        ) {
          console.error(
            "PDF GENERATION ERROR:",
            error
          );

          toast.error(
            error?.message ||
              "Failed to generate fuel purchase PDF"
          );
        } finally {
          setPdfLoading(
            false
          );
        }
      };

    /* =================================================
       PDF BUTTON HANDLERS
    ================================================= */

    const handleThisMonthPDF =
      () => {
        const {
          from,
          to,
        } =
          getThisMonthRange();

        const filtered =
          filterPurchasesByDate(
            from,
            to
          );

        generatePurchasePDF(
          filtered,
          from,
          to,
          "This Month"
        );
      };

    const handleThisYearPDF =
      () => {
        const {
          from,
          to,
        } =
          getThisYearRange();

        const filtered =
          filterPurchasesByDate(
            from,
            to
          );

        generatePurchasePDF(
          filtered,
          from,
          to,
          "This Year"
        );
      };

    const handleCustomPDF =
      () => {
        if (
          !customFromDate ||
          !customToDate
        ) {
          toast.error(
            "Please select both From and To dates."
          );

          return;
        }

        const from =
          new Date(
            `${customFromDate}T00:00:00`
          );

        const to =
          new Date(
            `${customToDate}T23:59:59`
          );

        if (
          Number.isNaN(
            from.getTime()
          ) ||
          Number.isNaN(
            to.getTime()
          )
        ) {
          toast.error(
            "Please select valid dates."
          );

          return;
        }

        if (
          from > to
        ) {
          toast.error(
            "From date cannot be after To date."
          );

          return;
        }

        const today =
          new Date();

        today.setHours(
          23,
          59,
          59,
          999
        );

        if (
          to > today
        ) {
          toast.error(
            "To date cannot be in the future."
          );

          return;
        }

        const filtered =
          filterPurchasesByDate(
            from,
            to
          );

        generatePurchasePDF(
          filtered,
          from,
          to,
          "Custom Date Range"
        );
      };

    /* =================================================
       UI
    ================================================= */

    return (
      <div className="page-container">

        {/* =============================================
            HEADER
        ============================================= */}

        <div className="page-header">

          <div>
            <h1>
              Fuel Purchase History
            </h1>

            <p>
              View petrol and diesel
              purchase records.
            </p>
          </div>

          <div
            style={{
              position:
                "relative",

              display:
                "flex",

              gap:
                "10px",

              flexWrap:
                "wrap",
            }}
          >

            {/* REFRESH */}

            <button
              type="button"
              className="secondary-button"
              onClick={
                loadPurchases
              }
              disabled={
                loading
              }
            >
              <RefreshCw
                size={17}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              {loading
                ? "Loading..."
                : "Refresh"}
            </button>

            {/* ADD PURCHASE */}

            <NavLink
              to="/fuel/purchase"
              className="primary-button"
            >
              <Plus
                size={17}
              />

              Add Purchase
            </NavLink>

            {/* DOWNLOAD PDF */}

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setShowPdfOptions(
                  (
                    previous
                  ) =>
                    !previous
                )
              }
              disabled={
                pdfLoading
              }
              style={{
                display:
                  "inline-flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                gap:
                  "7px",
              }}
            >

              {pdfLoading ? (
                <RefreshCw
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <FileDown
                  size={17}
                />
              )}

              Download PDF

              {showPdfOptions ? (
                <ChevronUp
                  size={15}
                />
              ) : (
                <ChevronDown
                  size={15}
                />
              )}

            </button>

            {/* =========================================
                PDF OPTIONS
            ========================================= */}

            {showPdfOptions && (

              <div
                style={{
                  position:
                    "absolute",

                  top:
                    "calc(100% + 8px)",

                  right:
                    "0",

                  zIndex:
                    1000,

                  width:
                    "320px",

                  maxWidth:
                    "calc(100vw - 32px)",

                  background:
                    "#ffffff",

                  border:
                    `1px solid ${COLORS.border}`,

                  borderRadius:
                    "12px",

                  padding:
                    "16px",

                  boxShadow:
                    "0 15px 35px rgba(0,0,0,0.16)",
                }}
              >

                <div
                  style={{
                    display:
                      "flex",

                    justifyContent:
                      "space-between",

                    alignItems:
                      "flex-start",

                    gap:
                      "10px",

                    marginBottom:
                      "12px",
                  }}
                >

                  <div>

                    <h3
                      style={{
                        margin:
                          "0",

                        fontSize:
                          "15px",

                        fontWeight:
                          "700",

                        color:
                          COLORS.text,
                      }}
                    >
                      Download Purchase
                      Report
                    </h3>

                    <p
                      style={{
                        margin:
                          "4px 0 0",

                        fontSize:
                          "12px",

                        color:
                          COLORS.muted,
                      }}
                    >
                      Select the report
                      period
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowPdfOptions(
                        false
                      )
                    }
                    style={{
                      border:
                        "none",

                      background:
                        "transparent",

                      cursor:
                        "pointer",

                      color:
                        COLORS.muted,

                      padding:
                        "2px",

                      display:
                        "flex",
                    }}
                  >
                    <X
                      size={17}
                    />
                  </button>

                </div>

                {/* THIS MONTH */}

                <button
                  type="button"
                  onClick={
                    handleThisMonthPDF
                  }
                  disabled={
                    pdfLoading
                  }
                  style={{
                    width:
                      "100%",

                    display:
                      "flex",

                    alignItems:
                      "center",

                    gap:
                      "12px",

                    padding:
                      "11px",

                    marginBottom:
                      "8px",

                    textAlign:
                      "left",

                    background:
                      "#ffffff",

                    border:
                      `1px solid ${COLORS.border}`,

                    borderRadius:
                      "9px",

                    cursor:
                      "pointer",
                  }}
                >

                  <span
                    style={{
                      width:
                        "34px",

                      height:
                        "34px",

                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      borderRadius:
                        "8px",

                      background:
                        COLORS.sectionBar,

                      color:
                        COLORS.mainHeader,
                    }}
                  >
                    <CalendarDays
                      size={18}
                    />
                  </span>

                  <span>

                    <strong
                      style={{
                        display:
                          "block",

                        fontSize:
                          "13px",

                        color:
                          COLORS.text,
                      }}
                    >
                      This Month
                    </strong>

                    <small
                      style={{
                        display:
                          "block",

                        marginTop:
                          "2px",

                        fontSize:
                          "11px",

                        color:
                          COLORS.muted,
                      }}
                    >
                      Generate current
                      month purchases
                    </small>

                  </span>

                </button>

                {/* THIS YEAR */}

                <button
                  type="button"
                  onClick={
                    handleThisYearPDF
                  }
                  disabled={
                    pdfLoading
                  }
                  style={{
                    width:
                      "100%",

                    display:
                      "flex",

                    alignItems:
                      "center",

                    gap:
                      "12px",

                    padding:
                      "11px",

                    marginBottom:
                      "12px",

                    textAlign:
                      "left",

                    background:
                      "#ffffff",

                    border:
                      `1px solid ${COLORS.border}`,

                    borderRadius:
                      "9px",

                    cursor:
                      "pointer",
                  }}
                >

                  <span
                    style={{
                      width:
                        "34px",

                      height:
                        "34px",

                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      borderRadius:
                        "8px",

                      background:
                        "#F0FDF4",

                      color:
                        COLORS.diesel,
                    }}
                  >
                    <CalendarDays
                      size={18}
                    />
                  </span>

                  <span>

                    <strong
                      style={{
                        display:
                          "block",

                        fontSize:
                          "13px",

                        color:
                          COLORS.text,
                      }}
                    >
                      This Year
                    </strong>

                    <small
                      style={{
                        display:
                          "block",

                        marginTop:
                          "2px",

                        fontSize:
                          "11px",

                        color:
                          COLORS.muted,
                      }}
                    >
                      Generate current
                      year purchases
                    </small>

                  </span>

                </button>

                {/* CUSTOM */}

                <div
                  style={{
                    borderTop:
                      `1px solid ${COLORS.border}`,

                    paddingTop:
                      "12px",
                  }}
                >

                  <p
                    style={{
                      margin:
                        "0 0 9px",

                      fontSize:
                        "11px",

                      fontWeight:
                        "700",

                      textTransform:
                        "uppercase",

                      letterSpacing:
                        "0.05em",

                      color:
                        COLORS.muted,
                    }}
                  >
                    Custom Date Range
                  </p>

                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "1fr 1fr",

                      gap:
                        "8px",
                    }}
                  >

                    <div>

                      <label
                        style={{
                          display:
                            "block",

                          marginBottom:
                            "5px",

                          fontSize:
                            "11px",

                          fontWeight:
                            "600",

                          color:
                            COLORS.text,
                        }}
                      >
                        From
                      </label>

                      <input
                        type="date"
                        value={
                          customFromDate
                        }
                        max={
                          getTodayString()
                        }
                        onChange={(
                          event
                        ) =>
                          setCustomFromDate(
                            event
                              .target
                              .value
                          )
                        }
                        style={{
                          width:
                            "100%",

                          boxSizing:
                            "border-box",

                          border:
                            `1px solid ${COLORS.border}`,

                          borderRadius:
                            "8px",

                          padding:
                            "8px",

                          fontSize:
                            "12px",
                        }}
                      />

                    </div>

                    <div>

                      <label
                        style={{
                          display:
                            "block",

                          marginBottom:
                            "5px",

                          fontSize:
                            "11px",

                          fontWeight:
                            "600",

                          color:
                            COLORS.text,
                        }}
                      >
                        To
                      </label>

                      <input
                        type="date"
                        value={
                          customToDate
                        }
                        min={
                          customFromDate ||
                          undefined
                        }
                        max={
                          getTodayString()
                        }
                        onChange={(
                          event
                        ) =>
                          setCustomToDate(
                            event
                              .target
                              .value
                          )
                        }
                        style={{
                          width:
                            "100%",

                          boxSizing:
                            "border-box",

                          border:
                            `1px solid ${COLORS.border}`,

                          borderRadius:
                            "8px",

                          padding:
                            "8px",

                          fontSize:
                            "12px",
                        }}
                      />

                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={
                      handleCustomPDF
                    }
                    disabled={
                      pdfLoading ||
                      !customFromDate ||
                      !customToDate
                    }
                    style={{
                      width:
                        "100%",

                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      gap:
                        "7px",

                      marginTop:
                        "10px",

                      padding:
                        "10px",

                      border:
                        "none",

                      borderRadius:
                        "8px",

                      background:
                        COLORS.mainHeader,

                      color:
                        COLORS.white,

                      fontSize:
                        "12px",

                      fontWeight:
                        "700",

                      cursor:
                        "pointer",
                    }}
                  >
                    <FileDown
                      size={16}
                    />

                    Generate Custom PDF
                  </button>

                </div>

              </div>

            )}

          </div>

        </div>

        {/* =============================================
            SUMMARY CARDS
        ============================================= */}

        <div className="stats-grid">

          <div className="stat-card">

            <div className="stat-card-icon">
              <Fuel
                size={22}
              />
            </div>

            <div>
              <h4>
                Petrol Purchased
              </h4>

              <h2>
                {formatNumber(
                  petrolPurchased
                )}{" "}
                L
              </h2>
            </div>

          </div>

          <div className="stat-card">

            <div className="stat-card-icon">
              <Fuel
                size={22}
              />
            </div>

            <div>
              <h4>
                Diesel Purchased
              </h4>

              <h2>
                {formatNumber(
                  dieselPurchased
                )}{" "}
                L
              </h2>
            </div>

          </div>

          <div className="stat-card">

            <div className="stat-card-icon">
              <Receipt
                size={22}
              />
            </div>

            <div>
              <h4>
                Purchase Amount
              </h4>

              <h2>
                {formatCurrency(
                  totalPurchaseAmount
                )}
              </h2>
            </div>

          </div>

          <div className="stat-card">

            <div className="stat-card-icon">
              <CalendarDays
                size={22}
              />
            </div>

            <div>
              <h4>
                Total Purchases
              </h4>

              <h2>
                {purchases.length}
              </h2>
            </div>

          </div>

        </div>

        {/* =============================================
            PURCHASE TABLE
        ============================================= */}

        <div className="content-panel">

          <div className="content-panel-header">

            <div>
              <h2>
                Purchase Records
              </h2>

              <p>
                All fuel purchase
                transactions.
              </p>
            </div>

          </div>

          {loading ? (

            <div
              style={{
                padding:
                  "40px",

                textAlign:
                  "center",
              }}
            >
              <p>
                Loading purchase
                history...
              </p>
            </div>

          ) : purchases.length ===
            0 ? (

            <div
              style={{
                padding:
                  "50px 20px",

                textAlign:
                  "center",
              }}
            >

              <Fuel
                size={40}
              />

              <h3
                style={{
                  marginTop:
                    "15px",
                }}
              >
                No Fuel Purchases
              </h3>

              <p>
                No petrol or diesel
                purchase has been
                recorded yet.
              </p>

              <NavLink
                to="/fuel/purchase"
                className="primary-button"
                style={{
                  marginTop:
                    "15px",

                  display:
                    "inline-flex",
                }}
              >
                <Plus
                  size={17}
                />

                Add First Purchase
              </NavLink>

            </div>

          ) : (

            <div className="table-container">

              <table>

                <thead>

                  <tr>

                    <th>
                      Date
                    </th>

                    <th>
                      Fuel
                    </th>

                    <th>
                      Supplier
                    </th>

                    <th>
                      Quantity
                    </th>

                    <th>
                      Purchase Price
                    </th>

                    <th>
                      Total Amount
                    </th>

                    <th>
                      Invoice
                    </th>

                    <th>
                      Added By
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {purchases.map(
                    (
                      purchase,
                      index
                    ) => {
                      const supplierName =
                        getSupplierName(
                          purchase
                        );

                      const purchaseId =
                        getPurchaseId(
                          purchase,
                          index
                        );

                      const isOpen =
                        openSupplierRowId ===
                        purchaseId;

                      const supplierHistory =
                        isOpen
                          ? getSupplierHistory(
                              supplierName
                            )
                          : [];

                      const fuelType =
                        getFuelType(
                          purchase
                        ).toLowerCase();

                      return (
                        <tr
                          key={
                            purchaseId
                          }
                        >

                          <td>
                            {formatDate(
                              getPurchaseDate(
                                purchase
                              )
                            )}
                          </td>

                          <td>

                            <span
                              className={`fuel-badge ${
                                fuelType.includes(
                                  "petrol"
                                )
                                  ? "petrol"
                                  : "diesel"
                              }`}
                            >
                              {fuelType.includes(
                                "petrol"
                              )
                                ? "Petrol"
                                : "Diesel"}
                            </span>

                          </td>

                          <td
                            style={{
                              position:
                                "relative",
                            }}
                          >

                            <button
                              type="button"
                              onClick={() =>
                                setOpenSupplierRowId(
                                  isOpen
                                    ? null
                                    : purchaseId
                                )
                              }
                              style={{
                                border:
                                  "none",

                                background:
                                  "transparent",

                                padding:
                                  0,

                                margin:
                                  0,

                                cursor:
                                  "pointer",

                                display:
                                  "inline-flex",

                                alignItems:
                                  "center",

                                gap:
                                  "7px",

                                font:
                                  "inherit",

                                color:
                                  "inherit",

                                fontWeight:
                                  "600",
                              }}
                            >

                              <Building2
                                size={15}
                              />

                              <span>
                                {
                                  supplierName
                                }
                              </span>

                              {isOpen ? (
                                <ChevronUp
                                  size={14}
                                />
                              ) : (
                                <ChevronDown
                                  size={14}
                                />
                              )}

                            </button>

                            {isOpen && (

                              <div
                                style={{
                                  position:
                                    "absolute",

                                  top:
                                    "calc(100% + 6px)",

                                  left:
                                    0,

                                  zIndex:
                                    100,

                                  width:
                                    "390px",

                                  maxWidth:
                                    "90vw",

                                  maxHeight:
                                    "320px",

                                  overflowY:
                                    "auto",

                                  background:
                                    "#ffffff",

                                  border:
                                    `1px solid ${COLORS.border}`,

                                  borderRadius:
                                    "10px",

                                  boxShadow:
                                    "0 12px 30px rgba(0,0,0,0.14)",

                                  padding:
                                    "12px",
                                }}
                              >

                                <div
                                  style={{
                                    display:
                                      "flex",

                                    justifyContent:
                                      "space-between",

                                    alignItems:
                                      "center",

                                    gap:
                                      "10px",

                                    paddingBottom:
                                      "10px",

                                    marginBottom:
                                      "8px",

                                    borderBottom:
                                      `1px solid ${COLORS.border}`,
                                  }}
                                >

                                  <div>

                                    <strong
                                      style={{
                                        display:
                                          "block",
                                      }}
                                    >
                                      {
                                        supplierName
                                      }
                                    </strong>

                                    <small
                                      style={{
                                        color:
                                          COLORS.muted,
                                      }}
                                    >
                                      {
                                        supplierHistory.length
                                      }{" "}
                                      purchase
                                      {supplierHistory.length ===
                                      1
                                        ? ""
                                        : "s"}
                                    </small>

                                  </div>

                                  <Building2
                                    size={18}
                                  />

                                </div>

                                {supplierHistory.length >
                                0 ? (

                                  supplierHistory.map(
                                    (
                                      history,
                                      historyIndex
                                    ) => {
                                      const historyFuel =
                                        getFuelType(
                                          history
                                        ).toLowerCase();

                                      return (
                                        <div
                                          key={
                                            history._id ||
                                            historyIndex
                                          }
                                          style={{
                                            padding:
                                              "10px 4px",

                                            borderBottom:
                                              historyIndex ===
                                              supplierHistory.length -
                                                1
                                                ? "none"
                                                : "1px solid #f1f5f9",
                                          }}
                                        >

                                          <div
                                            style={{
                                              display:
                                                "flex",

                                              justifyContent:
                                                "space-between",

                                              alignItems:
                                                "center",

                                              gap:
                                                "12px",

                                              marginBottom:
                                                "6px",
                                            }}
                                          >

                                            <span
                                              className={`fuel-badge ${
                                                historyFuel.includes(
                                                  "petrol"
                                                )
                                                  ? "petrol"
                                                  : "diesel"
                                              }`}
                                            >
                                              {historyFuel.includes(
                                                "petrol"
                                              )
                                                ? "Petrol"
                                                : "Diesel"}
                                            </span>

                                            <strong>
                                              {formatCurrency(
                                                getTotalAmount(
                                                  history
                                                )
                                              )}
                                            </strong>

                                          </div>

                                          <div
                                            style={{
                                              display:
                                                "grid",

                                              gridTemplateColumns:
                                                "1fr 1fr",

                                              gap:
                                                "4px 12px",

                                              fontSize:
                                                "13px",

                                              color:
                                                "#4b5563",
                                            }}
                                          >

                                            <span>
                                              Date:{" "}
                                              <strong>
                                                {formatDate(
                                                  getPurchaseDate(
                                                    history
                                                  )
                                                )}
                                              </strong>
                                            </span>

                                            <span>
                                              Quantity:{" "}
                                              <strong>
                                                {formatNumber(
                                                  getQuantity(
                                                    history
                                                  )
                                                )}{" "}
                                                L
                                              </strong>
                                            </span>

                                            <span>
                                              Rate:{" "}
                                              <strong>
                                                {formatCurrency(
                                                  getPurchasePrice(
                                                    history
                                                  )
                                                )}
                                                /L
                                              </strong>
                                            </span>

                                            <span>
                                              Invoice:{" "}
                                              <strong>
                                                {getInvoiceNumber(
                                                  history
                                                )}
                                              </strong>
                                            </span>

                                          </div>

                                        </div>
                                      );
                                    }
                                  )

                                ) : (

                                  <div
                                    style={{
                                      padding:
                                        "16px",

                                      textAlign:
                                        "center",

                                      color:
                                        COLORS.muted,
                                    }}
                                  >
                                    No purchase
                                    history found.
                                  </div>

                                )}

                              </div>

                            )}

                          </td>

                          <td>
                            <strong>
                              {formatNumber(
                                getQuantity(
                                  purchase
                                )
                              )}{" "}
                              L
                            </strong>
                          </td>

                          <td>
                            {formatCurrency(
                              getPurchasePrice(
                                purchase
                              )
                            )}
                            /L
                          </td>

                          <td>
                            <strong>
                              {formatCurrency(
                                getTotalAmount(
                                  purchase
                                )
                              )}
                            </strong>
                          </td>

                          <td>
                            {getInvoiceNumber(
                              purchase
                            )}
                          </td>

                          <td>
                            {getCreatedBy(
                              purchase
                            )}
                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>
    );
  };

export default FuelPurchaseHistory;