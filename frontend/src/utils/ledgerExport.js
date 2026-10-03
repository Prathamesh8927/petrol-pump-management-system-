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
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

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

const getNextBillNo = () => {
  try {
    const stored = Number(
      localStorage.getItem("mypump_next_bill_no")
    );

    const next =
      Number.isInteger(stored) && stored >= 1
        ? stored
        : 1;

    localStorage.setItem(
      "mypump_next_bill_no",
      String(next + 1)
    );

    return String(next);
  } catch (error) {
    console.warn(
      "Unable to access bill number storage:",
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
  entry?.entryDate ||
  entry?.date ||
  entry?.transactionDate ||
  entry?.createdAt ||
  entry?.purchaseDate ||
  entry?.paymentDate ||
  null;

/* =====================================================
   BILL PERIOD / DATE RANGE
===================================================== */

const getBillPeriod = (
  entries = [],
  fallbackDate = null
) => {
  const validDates = entries
    .map((entry) =>
      getTransactionDate(entry)
    )
    .filter(Boolean)
    .map((value) => {
      const date = new Date(value);

      return Number.isNaN(
        date.getTime()
      )
        ? null
        : date;
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        a.getTime() - b.getTime()
    );

  if (validDates.length === 0) {
    return fallbackDate
      ? formatDate(fallbackDate)
      : "-";
  }

  const firstDate = formatDate(
    validDates[0]
  );

  const lastDate = formatDate(
    validDates[
      validDates.length - 1
    ]
  );

  return firstDate === lastDate
    ? firstDate
    : `${firstDate} - ${lastDate}`;
};

const getTransactionType = (entry) => {
  const type = safeString(
    entry?.entryType ||
      entry?.type ||
      entry?.transactionType ||
      ""
  ).toLowerCase();

  return type.includes("payment") ||
    type.includes("paid")
    ? "Payment"
    : "Purchase";
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
  if (
    entry?.pending !== undefined &&
    entry?.pending !== null
  ) {
    return Number(
      entry.pending || 0
    );
  }

  if (
    entry?.pendingAmount !== undefined &&
    entry?.pendingAmount !== null
  ) {
    return Number(
      entry.pendingAmount || 0
    );
  }

  return Math.max(
    getAmount(entry) -
      getPaidAmount(entry),
    0
  );
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

const numberToWordsIndian = (
  number
) => {
  const value = Math.floor(
    Number(number || 0)
  );

  if (value === 0) {
    return "Zero";
  }

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

    return `${tens[
      Math.floor(num / 10)
    ]}${
      num % 10
        ? ` ${ones[num % 10]}`
        : ""
    }`;
  };

  const threeDigits = (num) => {
    if (num < 100) {
      return twoDigits(num);
    }

    const hundred = Math.floor(
      num / 100
    );

    const remainder = num % 100;

    return `${ones[hundred]} Hundred${
      remainder
        ? ` ${twoDigits(
            remainder
          )}`
        : ""
    }`;
  };

  let remaining = value;
  const parts = [];

  const crore = Math.floor(
    remaining / 10000000
  );

  if (crore) {
    parts.push(
      `${threeDigits(
        crore
      )} Crore`
    );

    remaining %= 10000000;
  }

  const lakh = Math.floor(
    remaining / 100000
  );

  if (lakh) {
    parts.push(
      `${twoDigits(
        lakh
      )} Lakh`
    );

    remaining %= 100000;
  }

  const thousand = Math.floor(
    remaining / 1000
  );

  if (thousand) {
    parts.push(
      `${twoDigits(
        thousand
      )} Thousand`
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

const amountInWords = (
  amount
) => {
  const numeric = Number(
    amount || 0
  );

  const rupees = Math.floor(
    numeric
  );

  const paise = Math.round(
    (numeric - rupees) * 100
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
   SETTINGS / PUMP HELPERS
===================================================== */

/*
 * The Settings object can arrive directly or sometimes
 * be nested depending on the API response.
 *
 * This helper gives the PDF one normalized object.
 */
const normalizePumpSettings = (
  pump = {}
) => {
  if (
    !pump ||
    typeof pump !== "object"
  ) {
    return {};
  }

  const nestedSettings =
    pump?.settings ||
    pump?.pumpSettings ||
    pump?.pump ||
    pump?.data?.settings ||
    {};

  return {
    ...nestedSettings,
    ...pump,
  };
};

const getPumpName = (pump) => {
  const settings =
    normalizePumpSettings(
      pump
    );

  return safeString(
    settings?.pumpName ||
      settings?.petrolPumpName ||
      settings?.pump_name ||
      settings?.name ||
      settings?.businessName ||
      settings?.business_name ||
      "Petrol Pump"
  );
};

const getOwnerName = (pump) => {
  const settings =
    normalizePumpSettings(
      pump
    );

  return safeString(
    settings?.ownerName ||
      settings?.owner ||
      settings?.ownerFullName ||
      settings?.authorizedPerson ||
      settings?.authorizedPersonName ||
      ""
  );
};

const getCompanyName = (pump) => {
  const settings =
    normalizePumpSettings(
      pump
    );

  return safeString(
    settings?.companyName ||
      settings?.company ||
      settings?.oilCompanyName ||
      settings?.oilCompany ||
      settings?.oilCompany_name ||
      settings?.dealerName ||
      settings?.dealer_name ||
      ""
  );
};

const getPumpPhone = (pump) => {
  const settings =
    normalizePumpSettings(
      pump
    );

  return safeString(
    settings?.phone ||
      settings?.mobile ||
      settings?.mobileNumber ||
      settings?.contactNumber ||
      settings?.contactPhone ||
      ""
  );
};

const getPumpEmail = (pump) => {
  const settings =
    normalizePumpSettings(
      pump
    );

  return safeString(
    settings?.email ||
      settings?.emailAddress ||
      ""
  );
};

const getPumpGstin = (pump) => {
  const settings =
    normalizePumpSettings(
      pump
    );

  return safeString(
    settings?.gstin ||
      settings?.GSTIN ||
      settings?.gstNo ||
      settings?.gstNumber ||
      settings?.gstNumber ||
      ""
  );
};

const getPumpAddress = (pump) => {
  const settings =
    normalizePumpSettings(
      pump
    );

  return safeString(
    settings?.address ||
      settings?.addressLine1 ||
      settings?.address1 ||
      ""
  );
};

const getPumpCity = (pump) => {
  const settings =
    normalizePumpSettings(
      pump
    );

  return safeString(
    settings?.city ||
      settings?.town ||
      ""
  );
};

const getPumpState = (pump) => {
  const settings =
    normalizePumpSettings(
      pump
    );

  return safeString(
    settings?.state ||
      settings?.stateName ||
      ""
  );
};

const getPumpDistrict = (pump) => {
  const settings =
    normalizePumpSettings(
      pump
    );

  return safeString(
    settings?.district ||
      settings?.districtName ||
      ""
  );
};

const getPumpPincode = (pump) => {
  const settings =
    normalizePumpSettings(
      pump
    );

  return safeString(
    settings?.pincode ||
      settings?.pinCode ||
      settings?.postalCode ||
      settings?.zipCode ||
      ""
  );
};

const getTermsAndConditions = (
  pump
) => {
  const settings =
    normalizePumpSettings(
      pump
    );

  return safeString(
    settings?.termsAndConditions ||
      settings?.terms ||
      settings?.termsText ||
      ""
  );
};

/* =====================================================
   PROFILE LOGO RESOLUTION
===================================================== */

/*
 * Extract a usable string from any logo format.
 */
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
      value.location,
    ];

    const resolved =
      nested.find(
        (item) =>
          typeof item ===
            "string" &&
          item.trim().length > 0
      );

    return resolved
      ? resolved.trim()
      : null;
  }

  return null;
};

/*
 * Resolve the logo saved in Settings.
 *
 * IMPORTANT:
 * No online company-logo fallback is used.
 *
 * Priority:
 *
 * 1. Explicit logo passed by CustomerLedger
 * 2. logoUrl
 * 3. logoURL
 * 4. companyLogoUrl
 * 5. companyLogo
 * 6. pumpLogoUrl
 * 7. pumpLogo
 * 8. logo
 */
const getClientLogo = (
  pump,
  explicitLogoUrl = null
) => {
  const settings =
    normalizePumpSettings(
      pump
    );

  const candidates = [
    explicitLogoUrl,

    settings?.logoUrl,
    settings?.logoURL,

    settings?.companyLogoUrl,
    settings?.companyLogoURL,

    settings?.companyLogo,

    settings?.pumpLogoUrl,
    settings?.pumpLogoURL,

    settings?.pumpLogo,

    settings?.logo,

    settings?.businessLogo,
    settings?.businessLogoUrl,
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

/* =====================================================
   LOGO URL RESOLVER
===================================================== */

/*
 * Settings may store:
 *
 * 1. https://example.com/logo.png
 * 2. /uploads/logo.png
 * 3. uploads/logo.png
 * 4. data:image/png;base64,...
 *
 * Convert relative backend paths into absolute URLs.
 */
const resolveImageUrl = (
  imageSource
) => {
  const value =
    resolveLogoValue(
      imageSource
    );

  if (!value) {
    return null;
  }

  if (
    value.startsWith(
      "data:image/"
    ) ||
    value.startsWith(
      "blob:"
    )
  ) {
    return value;
  }

  if (
    value.startsWith(
      "http://"
    ) ||
    value.startsWith(
      "https://"
    )
  ) {
    return value;
  }

  const configuredApiUrl =
    safeString(
      import.meta.env
        ?.VITE_API_URL
    );

  if (configuredApiUrl) {
    const apiRoot =
      configuredApiUrl
        .replace(
          /\/+$/,
          ""
        )
        .replace(
          /\/api$/i,
          ""
        );

    const relativePath =
      value.startsWith("/")
        ? value
        : `/${value}`;

    return `${apiRoot}${relativePath}`;
  }

  if (
    typeof window !==
      "undefined"
  ) {
    return new URL(
      value.startsWith("/")
        ? value
        : `/${value}`,
      window.location.origin
    ).href;
  }

  return value;
};

/* =====================================================
   IMAGE LOADER
===================================================== */

const loadImageAsDataURL = async (
  imageSource
) => {
  if (!imageSource) {
    return null;
  }

  const resolvedUrl =
    resolveImageUrl(
      imageSource
    );

  if (!resolvedUrl) {
    return null;
  }

  if (
    typeof resolvedUrl ===
      "string" &&
    resolvedUrl.startsWith(
      "data:image/"
    )
  ) {
    return resolvedUrl;
  }

  const blobToDataURL = (
    blob
  ) =>
    new Promise(
      (resolve, reject) => {
        const reader =
          new FileReader();

        reader.onloadend = () =>
          resolve(
            reader.result
          );

        reader.onerror = () =>
          reject(
            new Error(
              "Failed to convert logo to Data URL"
            )
          );

        reader.readAsDataURL(
          blob
        );
      }
    );

  try {
    const response =
      await fetch(
        resolvedUrl,
        {
          method: "GET",
          mode: "cors",
          cache: "no-cache",
        }
      );

    if (!response.ok) {
      throw new Error(
        `Logo request failed with status ${response.status}`
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

    return await blobToDataURL(
      blob
    );
  } catch (error) {
    console.warn(
      "Unable to load Settings logo:",
      error
    );

    return null;
  }
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

  /*
   * Always derive the customer ledger
   * period from actual transaction history.
   */
  const finalBillFrom =
    getBillPeriod(
      Array.isArray(entries)
        ? entries
        : [],
      finalBillDate
    );

  /*
   * Normalize Settings first.
   */
  const pumpSettings =
    normalizePumpSettings(
      pump
    );

  /* ===================================================
     SETTINGS VALUES
  =================================================== */

  const pumpName =
    getPumpName(
      pumpSettings
    );

  const ownerName =
    getOwnerName(
      pumpSettings
    );

  const companyName =
    getCompanyName(
      pumpSettings
    );

  const pumpPhone =
    getPumpPhone(
      pumpSettings
    );

  const pumpEmail =
    getPumpEmail(
      pumpSettings
    );

  const pumpGstin =
    getPumpGstin(
      pumpSettings
    );

  const pumpAddress =
    getPumpAddress(
      pumpSettings
    );

  const pumpCity =
    getPumpCity(
      pumpSettings
    );

  const pumpState =
    getPumpState(
      pumpSettings
    );

  const pumpDistrict =
    getPumpDistrict(
      pumpSettings
    );

  const pumpPincode =
    getPumpPincode(
      pumpSettings
    );

  const settingsTerms =
    getTermsAndConditions(
      pumpSettings
    );

  /* ===================================================
     CUSTOMER VALUES
  =================================================== */

  const customerName =
    getCustomerName(
      customer
    );

  const customerPhone =
    getCustomerPhone(
      customer
    );

  const customerAddress =
    getCustomerAddress(
      customer
    );

  const customerGstin =
    getCustomerGstin(
      customer
    );

  const vehicleNumber =
    getVehicleNumber(
      customer
    );

  /* ===================================================
     SUMMARY VALUES
  =================================================== */

  const totalPurchased =
    Number(
      summary?.totalPurchased ??
        summary?.totalPurchase ??
        customer?.totalPurchased ??
        customer?.totalPurchases ??
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
          totalPurchased -
            totalPaid,
          0
        )
    );

  const purchaseCount =
    Number(
      summary?.purchaseCount ??
        customer?.purchaseCount ??
        entries.filter(
          (entry) =>
            getTransactionType(
              entry
            ) === "Purchase"
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
    pageWidth -
    margin * 2;

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setTextColor(
    COLORS.text
  );

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
     RESOLVE SETTINGS LOGO
  =================================================== */

  let logoData = null;

  const finalLogo =
    getClientLogo(
      pumpSettings,
      logoUrl
    );

  console.log(
    "[Ledger PDF] Settings:",
    pumpSettings
  );

  console.log(
    "[Ledger PDF] Pump name:",
    pumpName
  );

  console.log(
    "[Ledger PDF] Company:",
    companyName
  );

  console.log(
    "[Ledger PDF] Settings logo:",
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

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(15);

  doc.text(
    pumpName,
    pageWidth / 2,
    18,
    {
      align: "center",
    }
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(7.5);

  if (companyName) {
    doc.text(
      `DEALER - ${companyName.toUpperCase()}`,
      pageWidth / 2,
      22,
      {
        align: "center",
      }
    );
  }

  /* ===================================================
     SETTINGS LOGO — LEFT SIDE
  =================================================== */

  if (logoData) {
    try {
      doc.addImage(
        logoData,
        "PNG",
        15,
        23,
        25,
        25,
        undefined,
        "FAST"
      );
    } catch (error) {
      console.warn(
        "Unable to add Settings logo to PDF:",
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
    pumpDistrict,
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
  =================================================== */

  const infoY = 56;

  const leftX = margin;

  const rightX =
    pageWidth / 2 + 8;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(7);

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

  doc.text(
    doc.splitTextToSize(
      customerAddress ||
        "-",
      75
    ),
    leftX + 15,
    infoY + 5
  );

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
    formatDate(
      finalBillDate
    ),
    rightX + 17,
    infoY + 5
  );

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
    customerGstin ||
      "-",
    leftX + 15,
    infoY + 10
  );

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
    `Ledger Date: ${formatDate(
      new Date()
    )}`,
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

    tableWidth:
      contentWidth,

    theme: "grid",

    head: [[
      "TOTAL PURCHASES",
      "TOTAL PAID",
      "TOTAL PENDING",
      "TRANSACTIONS",
      "STATUS",
    ]],

    body: [[
      `Rs. ${formatMoney(
        totalPurchased
      )}`,

      `Rs. ${formatMoney(
        totalPaid
      )}`,

      `Rs. ${formatMoney(
        totalPending
      )}`,

      String(
        purchaseCount
      ),

      totalPending > 0
        ? "Pending"
        : "Paid",
    ]],

    styles: {
      font: "helvetica",
      fontSize: 6.5,
      textColor:
        COLORS.text,
      lineColor:
        COLORS.border,
      lineWidth: 0.3,
      cellPadding: 2,
      halign: "center",
      valign: "middle",
    },

    headStyles: {
      fillColor:
        COLORS.mainHeader,
      textColor:
        COLORS.white,
      fontStyle:
        "bold",
      fontSize: 6,
      halign: "center",
      valign: "middle",
    },

    bodyStyles: {
      fillColor:
        COLORS.white,
      fontSize: 6.5,
    },

    didParseCell:
      (data) => {
        if (
          data.section !==
          "body"
        ) {
          return;
        }

        if (
          data.column.index ===
          1
        ) {
          data.cell.styles.textColor =
            COLORS.paid;

          data.cell.styles.fontStyle =
            "bold";
        }

        if (
          data.column.index ===
            2 ||
          data.column.index ===
            4
        ) {
          data.cell.styles.textColor =
            totalPending > 0
              ? COLORS.pending
              : COLORS.paid;

          data.cell.styles.fontStyle =
            "bold";
        }
      },
  });

  /* ===================================================
     TRANSACTION HISTORY
  =================================================== */

  const transactionStartY =
    doc.lastAutoTable
      .finalY + 8;

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
    transactionStartY +
      5.5
  );

  const transactionRows =
    entries.map(
      (
        entry,
        index
      ) => [
        String(index + 1),

        formatDate(
          getTransactionDate(
            entry
          )
        ),

        getTransactionType(
          entry
        ),

        getFuelType(entry),

        `Rs. ${formatMoney(
          getAmount(entry)
        )}`,

        `Rs. ${formatMoney(
          getPaidAmount(
            entry
          )
        )}`,

        `Rs. ${formatMoney(
          getPendingAmount(
            entry
          )
        )}`,

        getPaymentMode(
          entry
        ),

        getRemarks(entry),
      ]
    );

  autoTable(doc, {
    startY:
      transactionStartY +
      8,

    margin: {
      left: margin,
      right: margin,
    },

    tableWidth:
      contentWidth,

    theme: "grid",

    head: [[
      "#",
      "Date",
      "Type",
      "Fuel",
      "Amount",
      "Paid",
      "Pending",
      "Payment Mode",
      "Remarks",
    ]],

    body:
      transactionRows.length >
      0
        ? transactionRows
        : [[
            "-",
            "-",
            "-",
            "-",
            "Rs. 0.00",
            "Rs. 0.00",
            "Rs. 0.00",
            "-",
            "-",
          ]],

    styles: {
      font: "helvetica",
      fontSize: 6.2,
      textColor:
        COLORS.text,
      lineColor:
        COLORS.border,
      lineWidth: 0.25,
      cellPadding: 1.5,
      valign: "middle",
      halign: "center",
    },

    headStyles: {
      fillColor:
        COLORS.mainHeader,
      textColor:
        COLORS.white,
      fontStyle:
        "bold",
      fontSize: 5.8,
      halign: "center",
      valign: "middle",
    },

    bodyStyles: {
      fillColor:
        COLORS.white,
      textColor:
        COLORS.text,
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

    didParseCell:
      (data) => {
        if (
          data.section !==
          "body"
        ) {
          return;
        }

        if (
          data.column.index ===
          5
        ) {
          data.cell.styles.textColor =
            COLORS.paid;
        }

        if (
          data.column.index ===
          6
        ) {
          const numeric =
            Number(
              String(
                data.cell.raw
              ).replace(
                /[^0-9.-]/g,
                ""
              )
            );

          if (numeric > 0) {
            data.cell.styles.textColor =
              COLORS.pending;

            data.cell.styles.fontStyle =
              "bold";
          }
        }
      },
  });

  /* ===================================================
     LEDGER SUMMARY
  =================================================== */

  let summaryYPosition =
    doc.lastAutoTable
      .finalY + 8;

  const summaryX =
    pageWidth / 2 + 8;

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

  summaryYPosition +=
    5;

  const drawSummaryLine = (
    label,
    value,
    valueColor =
      COLORS.text
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
      summaryX,
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
      `Rs. ${formatMoney(
        value
      )}`,
      summaryValueX,
      summaryYPosition,
      {
        align: "right",
      }
    );

    summaryYPosition +=
      4;
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

  const netAmount =
    Number(
      summary?.netAmount ??
        totalPending
    );

  summaryYPosition +=
    2;

  doc.setDrawColor(
    COLORS.border
  );

  doc.setLineWidth(
    0.3
  );

  doc.line(
    summaryX,
    summaryYPosition,
    pageWidth - margin,
    summaryYPosition
  );

  summaryYPosition +=
    5;

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
    summaryX,
    summaryYPosition
  );

  doc.setTextColor(
    netAmount > 0
      ? COLORS.pending
      : COLORS.paid
  );

  doc.text(
    `Rs. ${formatMoney(
      netAmount
    )}`,
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
    summaryYPosition +
    9;

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
    amountInWords(
      netAmount
    );

  doc.text(
    doc.splitTextToSize(
      words,
      80
    ),
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
    settingsTerms ||
    "If bill is not paid on presentation, interest will be charged at 12% p.a. and supply will be suspended till bill payment.";

  doc.text(
    doc.splitTextToSize(
      termsText,
      contentWidth - 4
    ),
    margin + 2,
    termsY + 5
  );

  /* ===================================================
     SIGNATURES
  =================================================== */

  const signatureY =
    pageHeight - 14;

  doc.setDrawColor(
    COLORS.text
  );

  doc.setLineWidth(
    0.3
  );

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

  doc.line(
    pageWidth -
      margin -
      45,
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
    signatureY,
    {
      align: "right",
    }
  );

  doc.text(
    "(Authorized Signatory)",
    pageWidth - margin,
    signatureY + 4,
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
    "Generated by MyPump - Petrol Pump Management System",
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
      ) ||
    "Customer";

  const safeBillNo =
    String(
      finalBillNo
    ).replace(
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
    billNo:
      finalBillNo,

    billDate:
      finalBillDate,

    fileName,
  };
};

/* =====================================================
   PRINT / BACKWARD COMPATIBILITY
===================================================== */

export const printLedger =
  async (
    options = {}
  ) =>
    exportLedgerPDF(
      options
    );

export default
  exportLedgerPDF;