import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* =====================================================
   PROFESSIONAL PDF COLOR SYSTEM
===================================================== */

const COLORS = {
  mainHeader: "#0F3D56",
  sectionBar: "#EAF2F6",
  text: "#111827",
  pending: "#DC2626",
  paid: "#15803D",
  border: "#CBD5E1",
  white: "#FFFFFF",
  muted: "#64748B",
};

/* =====================================================
   BASIC HELPERS
===================================================== */

const safeString = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const formatMoney = (value) => {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (value) => {
  if (!value) return "-";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return safeString(value);
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return safeString(value);
  }
};

/* =====================================================
   BILL NUMBER
===================================================== */

const getNextBillNo = () => {
  try {
    const storedValue = Number(
      localStorage.getItem("mypump_next_bill_no")
    );

    const nextBillNo =
      Number.isInteger(storedValue) && storedValue >= 1
        ? storedValue
        : 1;

    localStorage.setItem(
      "mypump_next_bill_no",
      String(nextBillNo + 1)
    );

    return String(nextBillNo);
  } catch (error) {
    console.warn(
      "Unable to access localStorage for bill number:",
      error
    );

    return "1";
  }
};

/* =====================================================
   CUSTOMER HELPERS
===================================================== */

const getCustomerName = (customer) =>
  safeString(
    customer?.name ||
      customer?.customerName ||
      customer?.fullName ||
      "-"
  );

const getCustomerPhone = (customer) =>
  safeString(
    customer?.phone ||
      customer?.mobile ||
      customer?.mobileNumber ||
      ""
  );

const getCustomerAddress = (customer) =>
  safeString(customer?.address || "");

const getCustomerGstin = (customer) =>
  safeString(
    customer?.gstin ||
      customer?.gstNo ||
      ""
  );

const getVehicleNumber = (customer) =>
  safeString(
    customer?.vehicleNumber ||
      customer?.vehicleNo ||
      ""
  );

/* =====================================================
   TRANSACTION HELPERS
===================================================== */

const getTransactionDate = (entry) =>
  entry?.date ||
  entry?.transactionDate ||
  entry?.createdAt ||
  entry?.purchaseDate ||
  entry?.paymentDate ||
  null;

const getTransactionType = (entry) => {
  const type = safeString(
    entry?.type ||
      entry?.transactionType ||
      ""
  ).toLowerCase();

  if (
    type.includes("payment") ||
    type.includes("paid")
  ) {
    return "Payment";
  }

  return "Purchase";
};

const getFuelType = (entry) =>
  safeString(
    entry?.fuelType ||
      entry?.fuel ||
      entry?.product ||
      entry?.itemName ||
      "-"
  );

const getAmount = (entry) =>
  Number(
    entry?.amount ??
      entry?.totalAmount ??
      entry?.purchaseAmount ??
      entry?.debit ??
      0
  );

const getPaidAmount = (entry) =>
  Number(
    entry?.paid ??
      entry?.paidAmount ??
      entry?.paymentAmount ??
      entry?.credit ??
      0
  );

const getPendingAmount = (entry) => {
  const amount = getAmount(entry);
  const paid = getPaidAmount(entry);

  if (
    entry?.pending !== undefined &&
    entry?.pending !== null
  ) {
    return Number(entry.pending || 0);
  }

  if (
    entry?.pendingAmount !== undefined &&
    entry?.pendingAmount !== null
  ) {
    return Number(entry.pendingAmount || 0);
  }

  return Math.max(amount - paid, 0);
};

const getPaymentMode = (entry) =>
  safeString(
    entry?.paymentMode ||
      entry?.mode ||
      entry?.paymentMethod ||
      "-"
  );

const getRemarks = (entry) =>
  safeString(
    entry?.remarks ||
      entry?.note ||
      entry?.description ||
      "-"
  );

/* =====================================================
   INDIAN CURRENCY WORDS
===================================================== */

const numberToWordsIndian = (number) => {
  const value = Math.floor(Number(number || 0));

  if (value === 0) return "Zero";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const twoDigits = (num) => {
    if (num < 20) {
      return ones[num];
    }

    return `${tens[Math.floor(num / 10)]}${
      num % 10 ? ` ${ones[num % 10]}` : ""
    }`;
  };

  const threeDigits = (num) => {
    if (num < 100) {
      return twoDigits(num);
    }

    const hundred = Math.floor(num / 100);
    const remainder = num % 100;

    return `${ones[hundred]} Hundred${
      remainder ? ` ${twoDigits(remainder)}` : ""
    }`;
  };

  let remaining = value;
  const parts = [];

  const crore = Math.floor(
    remaining / 10000000
  );

  if (crore) {
    parts.push(
      `${threeDigits(crore)} Crore`
    );
    remaining %= 10000000;
  }

  const lakh = Math.floor(
    remaining / 100000
  );

  if (lakh) {
    parts.push(
      `${twoDigits(lakh)} Lakh`
    );
    remaining %= 100000;
  }

  const thousand = Math.floor(
    remaining / 1000
  );

  if (thousand) {
    parts.push(
      `${twoDigits(thousand)} Thousand`
    );
    remaining %= 1000;
  }

  if (remaining) {
    parts.push(
      threeDigits(remaining)
    );
  }

  return parts.join(" ");
};

const amountInWords = (amount) => {
  const numericAmount = Number(amount || 0);

  const rupees = Math.floor(numericAmount);

  const paise = Math.round(
    (numericAmount - rupees) * 100
  );

  let result = `Rupees ${numberToWordsIndian(
    rupees
  )}`;

  if (paise > 0) {
    result += ` and ${numberToWordsIndian(
      paise
    )} Paise`;
  }

  return `${result} Only.`;
};

/* =====================================================
   PUMP HELPERS
===================================================== */

const getPumpName = (pump) =>
  safeString(
    pump?.pumpName ||
      pump?.name ||
      "Petrol Pump"
  );

const getOwnerName = (pump) =>
  safeString(
    pump?.ownerName ||
      pump?.owner ||
      ""
  );

const getCompanyName = (pump) =>
  safeString(
    pump?.companyName ||
      pump?.oilCompanyName ||
      pump?.oilCompany ||
      ""
  );

const getPumpPhone = (pump) =>
  safeString(
    pump?.phone ||
      pump?.mobile ||
      pump?.mobileNumber ||
      ""
  );

const getPumpEmail = (pump) =>
  safeString(pump?.email || "");

const getPumpGstin = (pump) =>
  safeString(
    pump?.gstin ||
      pump?.gstNo ||
      ""
  );

const getPumpAddress = (pump) =>
  safeString(pump?.address || "");

const getPumpCity = (pump) =>
  safeString(pump?.city || "");

const getPumpState = (pump) =>
  safeString(pump?.state || "");

const getPumpPincode = (pump) =>
  safeString(
    pump?.pincode ||
      pump?.pinCode ||
      ""
  );

/* =====================================================
   ONLINE COMPANY LOGO RESOLVER
===================================================== */

const COMPANY_DOMAINS = {
  "indian oil": "iocl.com",
  "indian oil corporation": "iocl.com",
  "indian oil corporation ltd": "iocl.com",
  "indian oil corporation limited": "iocl.com",
  iocl: "iocl.com",

  "bharat petroleum": "bharatpetroleum.in",
  "bharat petroleum corporation":
    "bharatpetroleum.in",
  "bharat petroleum corporation ltd":
    "bharatpetroleum.in",
  "bharat petroleum corporation limited":
    "bharatpetroleum.in",
  bpcl: "bharatpetroleum.in",

  "hindustan petroleum":
    "hindustanpetroleum.com",
  "hindustan petroleum corporation":
    "hindustanpetroleum.com",
  "hindustan petroleum corporation ltd":
    "hindustanpetroleum.com",
  "hindustan petroleum corporation limited":
    "hindustanpetroleum.com",
  hpcl: "hindustanpetroleum.com",

  nayara: "nayaraenergy.com",
  "nayara energy": "nayaraenergy.com",

  reliance: "ril.com",
  "reliance industries": "ril.com",
  "reliance industries limited": "ril.com",

  shell: "shell.com",
  "shell india": "shell.com",

  "oil india": "oil-india.com",
  "oil india limited": "oil-india.com",
  "oil india ltd": "oil-india.com",

  "jio bp": "jiobp.com",
  "jio-bp": "jiobp.com",

  adani: "adani.com",
  "adani total gas": "adani.com",

  gulf: "gulf.com",
  "gulf oil": "gulfoilltd.com",
};

/* =====================================================
   NORMALIZE COMPANY NAME
===================================================== */

const normalizeCompanyName = (companyName) => {
  return safeString(companyName)
    .toLowerCase()
    .replace(/[.,()]/g, "")
    .replace(/\blimited\b/g, "")
    .replace(/\bltd\b/g, "")
    .replace(/\bcorporation\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

/* =====================================================
   GET ONLINE COMPANY LOGO URL
===================================================== */

const getOnlineCompanyLogo = (companyName) => {
  const normalized =
    normalizeCompanyName(companyName);

  if (!normalized) {
    return null;
  }

  let domain =
    COMPANY_DOMAINS[normalized];

  if (!domain) {
    const matchedKey =
      Object.keys(COMPANY_DOMAINS).find(
        (key) =>
          normalized.includes(key) ||
          key.includes(normalized)
      );

    if (matchedKey) {
      domain =
        COMPANY_DOMAINS[matchedKey];
    }
  }

  if (!domain) {
    console.warn(
      `No online logo mapping found for company: ${companyName}`
    );

    return null;
  }

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain
  )}&sz=256`;
};

/* =====================================================
   GET CLIENT LOGO
===================================================== */

const getClientLogo = (
  pump,
  explicitLogoUrl = null
) => {
  if (explicitLogoUrl) {
    return explicitLogoUrl;
  }

  if (pump?.logoUrl) {
    return pump.logoUrl;
  }

  if (pump?.logo) {
    return pump.logo;
  }

  const companyName =
    getCompanyName(pump);

  return getOnlineCompanyLogo(
    companyName
  );
};

/* =====================================================
   LOAD IMAGE AS DATA URL
===================================================== */

const loadImageAsDataURL = async (
  imageSource
) => {
  if (!imageSource) {
    return null;
  }

  if (
    typeof imageSource === "string" &&
    imageSource.startsWith("data:image/")
  ) {
    return imageSource;
  }

  const blobToDataURL = (blob) => {
    return new Promise(
      (resolve, reject) => {
        const reader =
          new FileReader();

        reader.onloadend = () =>
          resolve(reader.result);

        reader.onerror = () =>
          reject(
            new Error(
              "Failed to convert logo to Data URL"
            )
          );

        reader.readAsDataURL(blob);
      }
    );
  };

  const fetchImage = async (url) => {
    const response =
      await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
      });

    if (!response.ok) {
      throw new Error(
        `Logo request failed with status ${response.status}`
      );
    }

    const blob =
      await response.blob();

    if (
      !blob.type.startsWith("image/")
    ) {
      throw new Error(
        `Logo response is not an image: ${blob.type}`
      );
    }

    return blobToDataURL(blob);
  };

  try {
    return await fetchImage(
      imageSource
    );
  } catch (directError) {
    console.warn(
      "Direct company logo request failed:",
      directError
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
  } catch (proxyError) {
    console.warn(
      "Company logo proxy request failed:",
      proxyError
    );
  }

  return null;
};

/* =====================================================
   EXPORT LEDGER PDF
===================================================== */

export const exportLedgerPDF = async ({
  customer = {},
  pump = {},
  entries =
    customer?.entries || [],
  summary =
    customer?.summary || {},
  billNo = null,
  billDate = null,
  billFrom = null,
  logoUrl = null,
} = {}) => {

  /* ===================================================
     BILL INFORMATION
  =================================================== */

  const suppliedBillNo =
    safeString(
      billNo ||
        customer?.billNo ||
        customer?.invoiceNo ||
        customer?.invoiceNumber ||
        customer?.billNumber ||
        ""
    );

  const finalBillNo =
    suppliedBillNo ||
    getNextBillNo();

  const finalBillDate =
    billDate ||
    customer?.billDate ||
    customer?.invoiceDate ||
    customer?.date ||
    new Date();

  const finalBillFrom =
    safeString(
      billFrom ||
        customer?.billFrom ||
        customer?.billingPeriod ||
        ""
    ) || "-";

  /* ===================================================
     PUMP INFORMATION
  =================================================== */

  const pumpName =
    getPumpName(pump);

  const ownerName =
    getOwnerName(pump);

  const companyName =
    getCompanyName(pump);

  const pumpPhone =
    getPumpPhone(pump);

  const pumpEmail =
    getPumpEmail(pump);

  const pumpGstin =
    getPumpGstin(pump);

  const pumpAddress =
    getPumpAddress(pump);

  const pumpCity =
    getPumpCity(pump);

  const pumpState =
    getPumpState(pump);

  const pumpPincode =
    getPumpPincode(pump);

  /* ===================================================
     CUSTOMER INFORMATION
  =================================================== */

  const customerName =
    getCustomerName(customer);

  const customerPhone =
    getCustomerPhone(customer);

  const customerAddress =
    getCustomerAddress(customer);

  const customerGstin =
    getCustomerGstin(customer);

  const vehicleNumber =
    getVehicleNumber(customer);

  /* ===================================================
     SUMMARY
  =================================================== */

  const totalPurchased =
    Number(
      summary?.totalPurchased ??
        customer?.totalPurchased ??
        customer?.totalAmount ??
        0
    );

  const totalPaid =
    Number(
      summary?.totalPaid ??
        customer?.totalPaid ??
        customer?.paidAmount ??
        0
    );

  const totalPending =
    Number(
      summary?.totalPending ??
        customer?.totalPending ??
        customer?.currentBalance ??
        Math.max(
          totalPurchased - totalPaid,
          0
        )
    );

  const purchaseCount =
    Number(
      summary?.purchaseCount ??
        customer?.purchaseCount ??
        entries.filter(
          (entry) =>
            getTransactionType(entry) ===
            "Purchase"
        ).length
    );

  /* ===================================================
     CREATE PDF
  =================================================== */

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth =
    doc.internal.pageSize.getWidth();

  const pageHeight =
    doc.internal.pageSize.getHeight();

  const margin = 10;

  const contentWidth =
    pageWidth - margin * 2;

  /* ===================================================
     FONT
  =================================================== */

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setTextColor(
    COLORS.text
  );

  /* ===================================================
     OUTER BORDER
  =================================================== */

  doc.setDrawColor(
    COLORS.border
  );

  doc.setLineWidth(0.35);

  doc.rect(
    5,
    5,
    pageWidth - 10,
    pageHeight - 10
  );

  /* ===================================================
     LOAD ONLINE COMPANY LOGO
  =================================================== */

  let logoData = null;

  const finalLogo =
    getClientLogo(
      pump,
      logoUrl
    );

  console.log(
    "Company name:",
    companyName
  );

  console.log(
    "Resolved company logo:",
    finalLogo
  );

  if (finalLogo) {
    logoData =
      await loadImageAsDataURL(
        finalLogo
      );
  }

  /* ===================================================
     TOP HEADER
  =================================================== */

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(7);

  doc.setTextColor(
    COLORS.text
  );

  doc.text(
    pumpGstin
      ? `GSTIN-${pumpGstin}`
      : "GSTIN-",
    margin,
    12
  );

  doc.text(
    "Original Invoice",
    pageWidth / 2,
    12,
    {
      align: "center",
    }
  );

  if (pumpPhone) {
    doc.text(
      `PH ${pumpPhone}`,
      pageWidth - margin,
      12,
      {
        align: "right",
      }
    );
  }

  /* ===================================================
     PUMP NAME
  =================================================== */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(15);

  doc.setTextColor(
    COLORS.text
  );

  doc.text(
    pumpName,
    pageWidth / 2,
    18,
    {
      align: "center",
    }
  );

  /* ===================================================
     OIL COMPANY
  =================================================== */

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(7.5);

  doc.text(
    companyName
      ? `DEALER - ${companyName.toUpperCase()}`
      : "DEALER",
    pageWidth / 2,
    22,
    {
      align: "center",
    }
  );

  /* ===================================================
     COMPANY LOGO — LEFT SIDE
  =================================================== */

  if (logoData) {
    try {
      doc.addImage(
        logoData,
        "PNG",
        17,
        25,
        28,
        28,
        undefined,
        "FAST"
      );
    } catch (error) {
      console.warn(
        "Unable to add company logo to PDF:",
        error
      );
    }
  }

  /* ===================================================
     PUMP ADDRESS
  =================================================== */

  const addressParts = [
    pumpAddress,
    pumpCity,
    pumpState,
    pumpPincode,
  ].filter(Boolean);

  const addressText =
    addressParts.join(", ");

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(7);

  if (addressText) {
    const addressLines =
      doc.splitTextToSize(
        addressText,
        85
      );

    doc.text(
      addressLines,
      pageWidth / 2,
      31,
      {
        align: "center",
      }
    );
  }

  /* ===================================================
     BUYER / BILL INFORMATION
     
     LEFT SIDE:
     Buyer
     Address
     GST No.
     Vehicle

     RIGHT SIDE:
     Bill No.
     Bill Date
     Bill From
  =================================================== */

  const infoY = 60;

  const leftX = margin;

  /*
     Right side starts from the middle area.
     This keeps Bill No., Bill Date and Bill From
     clearly separated from the buyer information.
  */
  const rightX =
    pageWidth / 2 + 8;

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(7);

  /* ===================================================
     LEFT — BUYER
  =================================================== */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.text(
    "Buyer :",
    leftX,
    infoY
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    customerName,
    leftX + 11,
    infoY
  );

  /* ===================================================
     RIGHT — BILL NO.
  =================================================== */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.text(
    "Bill No. :",
    rightX,
    infoY
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    finalBillNo,
    rightX + 16,
    infoY
  );

  /* ===================================================
     LEFT — ADDRESS
  =================================================== */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.text(
    "Address :",
    leftX,
    infoY + 5
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  const customerAddressLines =
    doc.splitTextToSize(
      customerAddress || "-",
      75
    );

  doc.text(
    customerAddressLines,
    leftX + 15,
    infoY + 5
  );

  /* ===================================================
     RIGHT — BILL DATE
  =================================================== */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.text(
    "Bill Date :",
    rightX,
    infoY + 5
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    formatDate(finalBillDate),
    rightX + 17,
    infoY + 5
  );

  /* ===================================================
     LEFT — CUSTOMER GST
  =================================================== */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.text(
    "GST No. :",
    leftX,
    infoY + 10
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    customerGstin || "-",
    leftX + 15,
    infoY + 10
  );

  /* ===================================================
     RIGHT — BILL FROM
  =================================================== */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.text(
    "Bill From :",
    rightX,
    infoY + 10
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    finalBillFrom,
    rightX + 19,
    infoY + 10
  );

  /* ===================================================
     LEFT — VEHICLE
  =================================================== */

  if (vehicleNumber) {
    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.text(
      "Vehicle :",
      leftX,
      infoY + 15
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.text(
      vehicleNumber,
      leftX + 15,
      infoY + 15
    );
  }

  /* ===================================================
     HEADER SEPARATOR
  =================================================== */

  const separatorY =
    infoY + 18;

  doc.setDrawColor(
    COLORS.border
  );

  doc.setLineWidth(0.4);

  doc.line(
    margin,
    separatorY,
    pageWidth - margin,
    separatorY
  );

  /* ===================================================
     CUSTOMER LEDGER TITLE
  =================================================== */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(11);

  doc.setTextColor(
    COLORS.text
  );

  doc.text(
    "CUSTOMER LEDGER",
    pageWidth / 2,
    separatorY + 8,
    {
      align: "center",
    }
  );

  /* ===================================================
     CUSTOMER META
  =================================================== */

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(7);

  doc.text(
    `Customer: ${customerName}`,
    margin,
    separatorY + 14
  );

  if (customerPhone) {
    doc.text(
      `Mobile: ${customerPhone}`,
      margin,
      separatorY + 18
    );
  }

  doc.text(
    `Ledger Date: ${formatDate(new Date())}`,
    pageWidth - margin,
    separatorY + 14,
    {
      align: "right",
    }
  );

  /* ===================================================
     SUMMARY TABLE
  =================================================== */

  const summaryY =
    separatorY + 21;

  autoTable(doc, {
    startY: summaryY,

    margin: {
      left: margin,
      right: margin,
    },

    tableWidth: contentWidth,

    theme: "grid",

    head: [
      [
        "TOTAL PURCHASES",
        "TOTAL PAID",
        "TOTAL PENDING",
        "TRANSACTIONS",
        "STATUS",
      ],
    ],

    body: [
      [
        `Rs. ${formatMoney(
          totalPurchased
        )}`,

        `Rs. ${formatMoney(
          totalPaid
        )}`,

        `Rs. ${formatMoney(
          totalPending
        )}`,

        String(purchaseCount),

        totalPending > 0
          ? "Pending"
          : "Paid",
      ],
    ],

    styles: {
      font: "helvetica",
      fontSize: 6.5,
      textColor: COLORS.text,
      lineColor: COLORS.border,
      lineWidth: 0.3,
      cellPadding: 2,
      halign: "center",
      valign: "middle",
    },

    headStyles: {
      fillColor: COLORS.mainHeader,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 6,
      halign: "center",
      valign: "middle",
    },

    bodyStyles: {
      fillColor: COLORS.white,
      fontSize: 6.5,
    },

    didParseCell: (hookData) => {
      if (
        hookData.section === "body" &&
        hookData.column.index === 2
      ) {
        hookData.cell.styles.textColor =
          totalPending > 0
            ? COLORS.pending
            : COLORS.paid;

        hookData.cell.styles.fontStyle =
          "bold";
      }

      if (
        hookData.section === "body" &&
        hookData.column.index === 1
      ) {
        hookData.cell.styles.textColor =
          COLORS.paid;

        hookData.cell.styles.fontStyle =
          "bold";
      }

      if (
        hookData.section === "body" &&
        hookData.column.index === 4
      ) {
        hookData.cell.styles.textColor =
          totalPending > 0
            ? COLORS.pending
            : COLORS.paid;

        hookData.cell.styles.fontStyle =
          "bold";
      }
    },
  });

  /* ===================================================
     TRANSACTION HISTORY
  =================================================== */

  const transactionStartY =
    doc.lastAutoTable.finalY + 8;

  doc.setFillColor(
    COLORS.sectionBar
  );

  doc.setDrawColor(
    COLORS.border
  );

  doc.rect(
    margin,
    transactionStartY,
    contentWidth,
    8,
    "FD"
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(8);

  doc.setTextColor(
    COLORS.text
  );

  doc.text(
    "TRANSACTION HISTORY",
    margin + 3,
    transactionStartY + 5.5
  );

  /* ===================================================
     TRANSACTION ROWS

     Quantity and Rate intentionally removed.
  =================================================== */

  const transactionRows =
    entries.map(
      (entry, index) => {
        const amount =
          getAmount(entry);

        const paid =
          getPaidAmount(entry);

        const pending =
          getPendingAmount(entry);

        return [
          String(index + 1),

          formatDate(
            getTransactionDate(entry)
          ),

          getTransactionType(entry),

          getFuelType(entry),

          `Rs. ${formatMoney(amount)}`,

          `Rs. ${formatMoney(paid)}`,

          `Rs. ${formatMoney(pending)}`,

          getPaymentMode(entry),

          getRemarks(entry),
        ];
      }
    );

  autoTable(doc, {
    startY:
      transactionStartY + 8,

    margin: {
      left: margin,
      right: margin,
    },

    tableWidth: contentWidth,

    theme: "grid",

    head: [
      [
        "#",
        "Date",
        "Type",
        "Fuel",
        "Amount",
        "Paid",
        "Pending",
        "Payment Mode",
        "Remarks",
      ],
    ],

    body:
      transactionRows.length > 0
        ? transactionRows
        : [
            [
              "-",
              "-",
              "-",
              "-",
              "Rs. 0.00",
              "Rs. 0.00",
              "Rs. 0.00",
              "-",
              "-",
            ],
          ],

    styles: {
      font: "helvetica",
      fontSize: 6.2,
      textColor: COLORS.text,
      lineColor: COLORS.border,
      lineWidth: 0.25,
      cellPadding: 1.5,
      valign: "middle",
      halign: "center",
    },

    headStyles: {
      fillColor: COLORS.mainHeader,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 5.8,
      halign: "center",
      valign: "middle",
    },

    bodyStyles: {
      fillColor: COLORS.white,
      textColor: COLORS.text,
    },

    columnStyles: {
      0: {
        cellWidth: 8,
      },

      1: {
        cellWidth: 21,
      },

      2: {
        cellWidth: 19,
      },

      3: {
        cellWidth: 19,
      },

      4: {
        cellWidth: 25,
      },

      5: {
        cellWidth: 25,
      },

      6: {
        cellWidth: 25,
      },

      7: {
        cellWidth: 27,
      },

      8: {
        cellWidth: "auto",
      },
    },

    didParseCell: (hookData) => {
      if (
        hookData.section !== "body"
      ) {
        return;
      }

      if (
        hookData.column.index === 5
      ) {
        hookData.cell.styles.textColor =
          COLORS.paid;
      }

      if (
        hookData.column.index === 6
      ) {
        const rawValue =
          hookData.cell.raw;

        const numericValue =
          Number(
            String(rawValue).replace(
              /[^0-9.-]/g,
              ""
            )
          );

        if (numericValue > 0) {
          hookData.cell.styles.textColor =
            COLORS.pending;

          hookData.cell.styles.fontStyle =
            "bold";
        }
      }
    },
  });

  /* ===================================================
     LEDGER SUMMARY
  =================================================== */

  let summaryYPosition =
    doc.lastAutoTable.finalY + 8;

  const summaryX =
    pageWidth / 2 + 8;

  const summaryLabelX =
    summaryX;

  const summaryValueX =
    pageWidth - margin;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(7);

  doc.setTextColor(
    COLORS.text
  );

  doc.text(
    "LEDGER SUMMARY",
    summaryX,
    summaryYPosition
  );

  summaryYPosition += 5;

  const drawSummaryLine = (
    label,
    value,
    valueColor = COLORS.text
  ) => {
    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(6.5);

    doc.setTextColor(
      COLORS.text
    );

    doc.text(
      label,
      summaryLabelX,
      summaryYPosition
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setTextColor(
      valueColor
    );

    doc.text(
      `Rs. ${formatMoney(value)}`,
      summaryValueX,
      summaryYPosition,
      {
        align: "right",
      }
    );

    summaryYPosition += 4;
  };

  drawSummaryLine(
    "Total Purchase",
    totalPurchased
  );

  drawSummaryLine(
    "Total Paid",
    totalPaid,
    COLORS.paid
  );

  drawSummaryLine(
    "Total Pending",
    totalPending,
    totalPending > 0
      ? COLORS.pending
      : COLORS.paid
  );

  const previousBalance =
    Number(
      summary?.previousBalance ||
        customer?.previousBalance ||
        0
    );

  const receivedAmount =
    Number(
      summary?.receivedAmount ||
        totalPaid
    );

  const adjustmentAmount =
    Number(
      summary?.adjustmentAmount ||
        0
    );

  drawSummaryLine(
    "Previous Balance",
    previousBalance
  );

  drawSummaryLine(
    "Received Amount",
    receivedAmount,
    COLORS.paid
  );

  drawSummaryLine(
    "Adjustment Amount",
    adjustmentAmount
  );

  /* ===================================================
     NET AMOUNT
  =================================================== */

  const netAmount =
    Number(
      summary?.netAmount ??
        totalPending
    );

  summaryYPosition += 2;

  doc.setDrawColor(
    COLORS.border
  );

  doc.setLineWidth(0.3);

  doc.line(
    summaryLabelX,
    summaryYPosition,
    pageWidth - margin,
    summaryYPosition
  );

  summaryYPosition += 5;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(8);

  doc.setTextColor(
    COLORS.text
  );

  doc.text(
    "NET AMOUNT",
    summaryLabelX,
    summaryYPosition
  );

  doc.setTextColor(
    netAmount > 0
      ? COLORS.pending
      : COLORS.paid
  );

  doc.text(
    `Rs. ${formatMoney(netAmount)}`,
    summaryValueX,
    summaryYPosition,
    {
      align: "right",
    }
  );

  /* ===================================================
     AMOUNT IN WORDS
  =================================================== */

  const amountWordsY =
    summaryYPosition + 9;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(7);

  doc.setTextColor(
    COLORS.text
  );

  doc.text(
    "Amount in Words:",
    margin,
    amountWordsY
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(6.5);

  const words =
    safeString(
      summary?.amountInWords ||
        summary?.netAmountWords ||
        ""
    ) ||
    amountInWords(netAmount);

  const wordsLines =
    doc.splitTextToSize(
      words,
      80
    );

  doc.text(
    wordsLines,
    margin,
    amountWordsY + 4
  );

  /* ===================================================
     TERMS & CONDITIONS
  =================================================== */

  const termsY =
    pageHeight - 31;

  doc.setFillColor(
    COLORS.sectionBar
  );

  doc.setDrawColor(
    COLORS.border
  );

  doc.rect(
    margin,
    termsY - 4,
    contentWidth,
    7,
    "FD"
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(6.5);

  doc.setTextColor(
    COLORS.text
  );

  doc.text(
    "TERMS AND CONDITIONS",
    margin + 2,
    termsY
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(5.7);

  const termsText =
    "If bill is not paid on presentation, interest will be charged at 12% p.a. and supply will be suspended till bill payment.";

  const termsLines =
    doc.splitTextToSize(
      termsText,
      contentWidth - 4
    );

  doc.text(
    termsLines,
    margin + 2,
    termsY + 5
  );

  /* ===================================================
     SIGNATURES
  =================================================== */

  const signatureY =
    pageHeight - 14;

  /* ===================================================
     CUSTOMER SIGNATURE
  =================================================== */

  doc.setDrawColor(
    COLORS.text
  );

  doc.setLineWidth(0.3);

  doc.line(
    margin,
    signatureY - 4,
    margin + 45,
    signatureY - 4
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(5.8);

  doc.setTextColor(
    COLORS.text
  );

  doc.text(
    "Customer Signature",
    margin,
    signatureY
  );

  /* ===================================================
     AUTHORIZED SIGNATORY
  =================================================== */

  doc.line(
    pageWidth - margin - 45,
    signatureY - 4,
    pageWidth - margin,
    signatureY - 4
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(6);

  doc.text(
    `For ${pumpName}`,
    pageWidth - margin,
    signatureY - 7,
    {
      align: "right",
    }
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    ownerName ||
      "Authorized Signatory",
    pageWidth - margin,
    signatureY + 1,
    {
      align: "right",
    }
  );

  doc.text(
    "(Authorized Signatory)",
    pageWidth - margin,
    signatureY + 5,
    {
      align: "right",
    }
  );

  /* ===================================================
     FOOTER
  =================================================== */

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(4.8);

  doc.setTextColor(
    COLORS.muted
  );

  doc.text(
    `Bill No. ${finalBillNo}  |  Bill Date: ${formatDate(
      finalBillDate
    )}`,
    pageWidth / 2,
    pageHeight - 11,
    {
      align: "center",
    }
  );

  doc.text(
    "Generated by Shivshambho ",
    pageWidth / 2,
    pageHeight - 7,
    {
      align: "center",
    }
  );

  /* ===================================================
     SAVE FILE
  =================================================== */

  const safeCustomerName =
    customerName
      .replace(
        /[^a-zA-Z0-9]+/g,
        "_"
      )
      .replace(
        /^_+|_+$/g,
        ""
      ) || "Customer";

  const safeBillNo =
    String(finalBillNo).replace(
      /[^a-zA-Z0-9-_]/g,
      "_"
    );

  const datePart =
    new Date()
      .toISOString()
      .slice(0, 10);

  const fileName =
    `Customer_Ledger_${safeCustomerName}_Bill_${safeBillNo}_${datePart}.pdf`;

  doc.save(fileName);

  return {
    billNo: finalBillNo,
    billDate: finalBillDate,
    fileName,
  };
};

/* =====================================================
   PRINT / BACKWARD COMPATIBILITY
===================================================== */

export const printLedger = async (
  options = {}
) => {
  return exportLedgerPDF(options);
};

export default exportLedgerPDF;