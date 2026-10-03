import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../services/api";
import shivshambhoLogo from "../assets/logo.png";

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

const formatMoney = (value) => {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

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

/* =====================================================
   BILL NUMBER
===================================================== */

const getNextBillNo = () => {
  try {
    const storedValue = Number(
      localStorage.getItem("mypump_next_bill_no")
    );

    const nextBillNo =
      Number.isInteger(storedValue) &&
      storedValue >= 1
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
  safeString(
    customer?.address || ""
  );

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
  const amount =
    getAmount(entry);

  const paid =
    getPaidAmount(entry);

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
    amount - paid,
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

const numberToWordsIndian = (number) => {
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

    return `${tens[Math.floor(num / 10)]}${
      num % 10
        ? ` ${ones[num % 10]}`
        : ""
    }`;
  };

  const threeDigits = (num) => {
    if (num < 100) {
      return twoDigits(num);
    }

    const hundred =
      Math.floor(num / 100);

    const remainder =
      num % 100;

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

const amountInWords = (amount) => {
  const numericAmount =
    Number(amount || 0);

  const rupees =
    Math.floor(numericAmount);

  const paise =
    Math.round(
      (numericAmount - rupees) * 100
    );

  let result =
    `Rupees ${numberToWordsIndian(
      rupees
    )}`;

  if (paise > 0) {
    result +=
      ` and ${numberToWordsIndian(
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
      pump?.petrolPumpName ||
      pump?.name ||
      pump?.settings?.pumpName ||
      pump?.settings?.petrolPumpName ||
      pump?.settings?.name ||
      pump?.pump?.pumpName ||
      pump?.pump?.petrolPumpName ||
      pump?.pump?.name ||
      "Petrol Pump"
  );

/*
 * OWNER NAME
 *
 * Priority:
 * 1. ownerName from Settings
 * 2. owner from Settings
 * 3. nested settings ownerName
 * 4. fallback pump ownerName
 * 5. fallback pump owner
 */
const getOwnerName = (pump) =>
  safeString(
    pump?.ownerName ||
      pump?.owner ||
      pump?.ownerFullName ||
      pump?.settings?.ownerName ||
      pump?.settings?.owner ||
      pump?.settings?.ownerFullName ||
      pump?.pump?.ownerName ||
      pump?.pump?.owner ||
      ""
  );

const getCompanyName = (pump) =>
  safeString(
    pump?.companyName ||
      pump?.oilCompanyName ||
      pump?.oilCompany ||
      pump?.company ||
      pump?.providerName ||
      pump?.provider ||
      pump?.oilProvider ||
      pump?.oilProviderName ||
      pump?.settings?.companyName ||
      pump?.settings?.oilCompanyName ||
      pump?.settings?.oilCompany ||
      ""
  );

const getPumpPhone = (pump) =>
  safeString(
    pump?.phone ||
      pump?.mobile ||
      pump?.mobileNumber ||
      pump?.settings?.phone ||
      pump?.settings?.mobile ||
      pump?.settings?.mobileNumber ||
      ""
  );

const getPumpEmail = (pump) =>
  safeString(
    pump?.email ||
      pump?.settings?.email ||
      ""
  );

const getPumpGstin = (pump) =>
  safeString(
    pump?.gstin ||
      pump?.gstNo ||
      pump?.settings?.gstin ||
      pump?.settings?.gstNo ||
      ""
  );

const getPumpAddress = (pump) =>
  safeString(
    pump?.address ||
      pump?.settings?.address ||
      ""
  );

const getPumpCity = (pump) =>
  safeString(
    pump?.city ||
      pump?.settings?.city ||
      ""
  );

const getPumpState = (pump) =>
  safeString(
    pump?.state ||
      pump?.settings?.state ||
      ""
  );

const getPumpPincode = (pump) =>
  safeString(
    pump?.pincode ||
      pump?.pinCode ||
      pump?.settings?.pincode ||
      pump?.settings?.pinCode ||
      ""
  );

/* =====================================================
   LOGO RESOLUTION — SAME LOGIC AS MONTHLY REPORT
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
===================================================== */

const OIL_PROVIDER_DOMAINS = {
  "indian oil": "iocl.com",
  "indianoil": "iocl.com",
  "ioc": "iocl.com",

  "bharat petroleum":
    "bharatpetroleum.in",

  "bpcl":
    "bharatpetroleum.in",

  "bharatpetroleum":
    "bharatpetroleum.in",

  "hindustan petroleum":
    "hindustanpetroleum.com",

  "hpcl":
    "hindustanpetroleum.com",

  "hindustanpetroleum":
    "hindustanpetroleum.com",

  "nayara":
    "nayaraenergy.com",

  "nayara energy":
    "nayaraenergy.com",

  "reliance":
    "reliancepetroleum.com",

  "reliance petroleum":
    "reliancepetroleum.com",

  "shell":
    "shell.in",

  "jio bp":
    "jiobp.com",

  "jiobp":
    "jiobp.com",

  "jio-bp":
    "jiobp.com",

  "oil india":
    "oil-india.com",

  "oilindia":
    "oil-india.com",

  "adani":
    "adanigas.com",

  "adani total":
    "adanigas.com",

  "gulf":
    "gulf.com",
};

const normalizeOilProvider = (
  value
) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      " "
    );

const getOilProviderName = (
  pump = {}
) =>
  pump?.oilCompanyName ||
  pump?.oilCompany ||
  pump?.companyName ||
  pump?.company ||
  pump?.providerName ||
  pump?.provider ||
  pump?.oilProvider ||
  pump?.oilProviderName ||
  pump?.settings?.oilCompanyName ||
  pump?.settings?.oilCompany ||
  pump?.settings?.companyName ||
  "";

const getOilProviderLogo = (
  pump = {}
) => {
  const providerName =
    normalizeOilProvider(
      getOilProviderName(
        pump
      )
    );

  if (!providerName) {
    return null;
  }

  const domain =
    OIL_PROVIDER_DOMAINS[
      providerName
    ] ||
    Object.entries(
      OIL_PROVIDER_DOMAINS
    ).find(
      ([name]) =>
        providerName.includes(
          name
        ) ||
        name.includes(
          providerName
        )
    )?.[1] ||
    null;

  if (!domain) {
    return null;
  }

  return `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
};

const getPumpLogo = (
  pump
) => {
  const providerLogo =
    getOilProviderLogo(
      pump
    );

  if (providerLogo) {
    return providerLogo;
  }

  const candidates = [
    pump?.logoUrl,
    pump?.logoURL,
    pump?.companyLogo,
    pump?.pumpLogo,
    pump?.logo,

    pump?.settings?.logoUrl,
    pump?.settings?.logoURL,
    pump?.settings?.companyLogo,
    pump?.settings?.pumpLogo,
    pump?.settings?.logo,
  ];

  for (
    const candidate of candidates
  ) {
    const resolved =
      resolveLogoValue(
        candidate
      );

    if (
      resolved &&
      !resolved.includes(
        "/src/assets/logo.png"
      )
    ) {
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
      typeof imageSource === "string" &&
      imageSource.startsWith(
        "data:image/"
      )
    ) {
      return imageSource;
    }

    const blobToDataURL =
      (blob) =>
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

    const fetchImage =
      async (
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
   LOAD CURRENT PUMP SETTINGS
===================================================== */

const loadPumpSettings =
  async (
    fallbackPump = {}
  ) => {
    try {
      const response =
        await api.get(
          "/settings/pump"
        );

      const settings =
        response?.settings ||
        response?.data?.settings ||
        response?.data?.pump ||
        response?.pump ||
        response?.data ||
        {};

      return {
        ...fallbackPump,
        ...settings,
      };
    } catch (error) {
      console.warn(
        "Unable to load latest pump settings. Using current pump data:",
        error
      );

      return fallbackPump || {};
    }
  };

/* =====================================================
   EXPORT LEDGER PDF
===================================================== */

export const exportLedgerPDF =
  async ({
    customer = {},
    pump = {},
    entries =
      customer?.entries ||
      [],
    summary =
      customer?.summary ||
      {},
    billNo = null,
    billDate = null,
    billFrom = null,
    logoUrl = null,
  } = {}) => {
    /* =================================================
       BILL INFORMATION
    ================================================= */

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

    /* =================================================
       LOAD LATEST SETTINGS
    ================================================= */

    const settingsPump =
      await loadPumpSettings(
        pump
      );

    /* =================================================
       PUMP INFORMATION
    ================================================= */

    const pumpName =
      getPumpName(
        settingsPump
      );

    const ownerName =
      getOwnerName(
        settingsPump
      );

    const companyName =
      getCompanyName(
        settingsPump
      );

    const pumpPhone =
      getPumpPhone(
        settingsPump
      );

    const pumpEmail =
      getPumpEmail(
        settingsPump
      );

    const pumpGstin =
      getPumpGstin(
        settingsPump
      );

    const pumpAddress =
      getPumpAddress(
        settingsPump
      );

    const pumpCity =
      getPumpCity(
        settingsPump
      );

    const pumpState =
      getPumpState(
        settingsPump
      );

    const pumpPincode =
      getPumpPincode(
        settingsPump
      );

    /* =================================================
       CUSTOMER INFORMATION
    ================================================= */

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

    /* =================================================
       SUMMARY
    ================================================= */

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

    /* =================================================
       CREATE PDF
    ================================================= */

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

    const margin = 10;

    const contentWidth =
      pageWidth -
      margin * 2;

    /* =================================================
       FONT
    ================================================= */

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setTextColor(
      COLORS.text
    );

    /* =================================================
       LOAD PUMP / OIL-PROVIDER LOGO
    ================================================= */

    const pumpLogoUrl =
      getPumpLogo(
        settingsPump
      );

    console.log(
      "Customer Ledger Oil Provider:",
      getOilProviderName(
        settingsPump
      )
    );

    console.log(
      "Customer Ledger Logo Source:",
      pumpLogoUrl
    );

    const logoData =
      await loadImageAsDataURL(
        pumpLogoUrl ||
          resolveLogoValue(
            logoUrl
          )
      );

    console.log(
      "Customer Ledger Logo Loaded:",
      Boolean(logoData)
    );

    /* =================================================
       LOAD SHIVSHAMBHO APPLICATION LOGO
    ================================================= */

    let shivshambhoLogoData =
      null;

    try {
      shivshambhoLogoData =
        await loadImageAsDataURL(
          shivshambhoLogo
        );
    } catch (error) {
      console.warn(
        "Unable to load Shivshambho footer logo:",
        error
      );
    }

    /* =================================================
       PDF HEADER
    ================================================= */

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
      pageHeight - 10
    );

    /* =================================================
       GSTIN
    ================================================= */

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
      10,
      12
    );

    /* =================================================
       OWNER NAME FROM SETTINGS
       DISPLAYED ABOVE PHONE NUMBER
    ================================================= */

    if (ownerName) {
      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        7
      );

      doc.setTextColor(
        COLORS.text
      );

      doc.text(
        ` ${ownerName}`,
        pageWidth - 10,
        10,
        {
          align: "right",
        }
      );
    }

    /* =================================================
       PHONE NUMBER
    ================================================= */

    if (pumpPhone) {
      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(7);

      doc.text(
        `PH ${pumpPhone}`,
        pageWidth - 10,
        14,
        {
          align: "right",
        }
      );
    }

    /* =================================================
       OIL PROVIDER / SETTINGS LOGO
    ================================================= */

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

    /* =================================================
       PUMP NAME
    ================================================= */

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

    /* =================================================
       COMPANY / DEALER
    ================================================= */

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

    /* =================================================
       ADDRESS
    ================================================= */

    const addressParts =
      [
        pumpAddress,
        pumpCity,
        pumpState,
        pumpPincode,
      ].filter(Boolean);

    const addressText =
      addressParts.join(", ");

    if (addressText) {
      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        6.5
      );

      const addressLines =
        doc.splitTextToSize(
          addressText,
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

    /* =================================================
       CUSTOMER LEDGER TITLE
    ================================================= */

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
      "CUSTOMER LEDGER",
      pageWidth / 2,
      43,
      {
        align:
          "center",
      }
    );

    /* =================================================
       BUYER / BILL INFORMATION
    ================================================= */

    const infoY =
      60;

    const leftX =
      margin;

    const rightX =
      pageWidth / 2 +
      8;

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(
      7
    );

    /* =================================================
       LEFT — BUYER
    ================================================= */

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

    /* =================================================
       RIGHT — BILL NO.
    ================================================= */

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

    /* =================================================
       LEFT — ADDRESS
    ================================================= */

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
        customerAddress ||
          "-",
        75
      );

    doc.text(
      customerAddressLines,
      leftX + 15,
      infoY + 5
    );

    /* =================================================
       RIGHT — BILL DATE
    ================================================= */

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

    /* =================================================
       LEFT — CUSTOMER GST
    ================================================= */

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

    /* =================================================
       RIGHT — BILL FROM
    ================================================= */

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

    /* =================================================
       LEFT — VEHICLE
    ================================================= */

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

    /* =================================================
       HEADER SEPARATOR
    ================================================= */

    const separatorY =
      infoY + 18;

    doc.setDrawColor(
      COLORS.border
    );

    doc.setLineWidth(
      0.4
    );

    doc.line(
      margin,
      separatorY,
      pageWidth - margin,
      separatorY
    );

    /* =================================================
       CUSTOMER LEDGER TITLE
    ================================================= */

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(
      11
    );

    doc.setTextColor(
      COLORS.text
    );

    doc.text(
      "CUSTOMER LEDGER",
      pageWidth / 2,
      separatorY + 8,
      {
        align:
          "center",
      }
    );

    /* =================================================
       CUSTOMER META
    ================================================= */

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(
      7
    );

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
        align:
          "right",
      }
    );

    /* =================================================
       SUMMARY TABLE
    ================================================= */

    const summaryY =
      separatorY + 21;

    autoTable(doc, {
      startY:
        summaryY,

      margin: {
        left:
          margin,
        right:
          margin,
      },

      tableWidth:
        contentWidth,

      theme:
        "grid",

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

          String(
            purchaseCount
          ),

          totalPending > 0
            ? "Pending"
            : "Paid",
        ],
      ],

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

        valign:
          "middle",
      },

      bodyStyles: {
        fillColor:
          COLORS.white,

        fontSize:
          6.5,
      },

      didParseCell:
        (hookData) => {
          if (
            hookData.section ===
              "body" &&
            hookData.column.index ===
              2
          ) {
            hookData.cell.styles.textColor =
              totalPending > 0
                ? COLORS.pending
                : COLORS.paid;

            hookData.cell.styles.fontStyle =
              "bold";
          }

          if (
            hookData.section ===
              "body" &&
            hookData.column.index ===
              1
          ) {
            hookData.cell.styles.textColor =
              COLORS.paid;

            hookData.cell.styles.fontStyle =
              "bold";
          }

          if (
            hookData.section ===
              "body" &&
            hookData.column.index ===
              4
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

    /* =================================================
       TRANSACTION HISTORY
    ================================================= */

    const transactionStartY =
      doc.lastAutoTable.finalY +
      8;

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

    doc.setFontSize(
      8
    );

    doc.setTextColor(
      COLORS.text
    );

    doc.text(
      "TRANSACTION HISTORY",
      margin + 3,
      transactionStartY +
        5.5
    );

    /* =================================================
       TRANSACTION ROWS
    ================================================= */

    const transactionRows =
      entries.map(
        (
          entry,
          index
        ) => {
          const amount =
            getAmount(
              entry
            );

          const paid =
            getPaidAmount(
              entry
            );

          const pending =
            getPendingAmount(
              entry
            );

          return [
            String(
              index + 1
            ),

            formatDate(
              getTransactionDate(
                entry
              )
            ),

            getTransactionType(
              entry
            ),

            getFuelType(
              entry
            ),

            `Rs. ${formatMoney(
              amount
            )}`,

            `Rs. ${formatMoney(
              paid
            )}`,

            `Rs. ${formatMoney(
              pending
            )}`,

            getPaymentMode(
              entry
            ),

            getRemarks(
              entry
            ),
          ];
        }
      );

    autoTable(doc, {
      startY:
        transactionStartY +
        8,

      margin: {
        left:
          margin,
        right:
          margin,
      },

      tableWidth:
        contentWidth,

      theme:
        "grid",

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
        transactionRows.length >
        0
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
          1.5,

        valign:
          "middle",

        halign:
          "center",
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
          cellWidth:
            "auto",
        },
      },

      didParseCell:
        (hookData) => {
          if (
            hookData.section !==
            "body"
          ) {
            return;
          }

          if (
            hookData.column.index ===
            5
          ) {
            hookData.cell.styles.textColor =
              COLORS.paid;
          }

          if (
            hookData.column.index ===
            6
          ) {
            const rawValue =
              hookData.cell.raw;

            const numericValue =
              Number(
                String(
                  rawValue
                ).replace(
                  /[^0-9.-]/g,
                  ""
                )
              );

            if (
              numericValue >
              0
            ) {
              hookData.cell.styles.textColor =
                COLORS.pending;

              hookData.cell.styles.fontStyle =
                "bold";
            }
          }
        },
    });

    /* =================================================
       LEDGER SUMMARY
    ================================================= */

    let summaryYPosition =
      doc.lastAutoTable.finalY +
      8;

    const summaryX =
      pageWidth / 2 +
      8;

    const summaryLabelX =
      summaryX;

    const summaryValueX =
      pageWidth -
      margin;

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(
      7
    );

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

    const drawSummaryLine =
      (
        label,
        value,
        valueColor =
          COLORS.text
      ) => {
        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(
          6.5
        );

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
          `Rs. ${formatMoney(
            value
          )}`,
          summaryValueX,
          summaryYPosition,
          {
            align:
              "right",
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

    /* =================================================
       NET AMOUNT
    ================================================= */

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
      summaryLabelX,
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

    doc.setFontSize(
      8
    );

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
      `Rs. ${formatMoney(
        netAmount
      )}`,
      summaryValueX,
      summaryYPosition,
      {
        align:
          "right",
      }
    );

    /* =================================================
       AMOUNT IN WORDS
    ================================================= */

    const amountWordsY =
      summaryYPosition +
      9;

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(
      7
    );

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

    doc.setFontSize(
      6.5
    );

    const words =
      safeString(
        summary?.amountInWords ||
          summary?.netAmountWords ||
          ""
      ) ||
      amountInWords(
        netAmount
      );

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

    /* =================================================
       TERMS & CONDITIONS
    ================================================= */

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

    doc.setFontSize(
      6.5
    );

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

    doc.setFontSize(
      5.7
    );

    const termsText =
      safeString(
        settingsPump?.termsAndConditions ||
          settingsPump?.terms ||
          pump?.termsAndConditions ||
          pump?.terms ||
          "If bill is not paid on presentation, interest will be charged at 12% p.a. and supply will be suspended till bill payment."
      );

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

    /* =================================================
       SIGNATURES
    ================================================= */

    const signatureY =
      pageHeight - 14;

    /* =================================================
       CUSTOMER SIGNATURE
    ================================================= */

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

    doc.setFontSize(
      5.8
    );

    doc.setTextColor(
      COLORS.text
    );

    doc.text(
      "Customer Signature",
      margin,
      signatureY
    );

    /* =================================================
       AUTHORIZED SIGNATORY
    ================================================= */

    doc.line(
      pageWidth -
        margin -
        45,
      signatureY - 4,
      pageWidth -
        margin,
      signatureY - 4
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(
      6
    );

    doc.text(
      `For ${pumpName}`,
      pageWidth - margin,
      signatureY - 7,
      {
        align:
          "right",
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
        align:
          "right",
      }
    );

    doc.text(
      "(Authorized Signatory)",
      pageWidth - margin,
      signatureY + 5,
      {
        align:
          "right",
      }
    );

    /* =================================================
       FOOTER
       
       SHIVSHAMBHO LOGO IS NOW DIRECTLY IN FRONT OF
       THE SHIVSHAMBHO NAME — SIDE BY SIDE.
    ================================================= */

    const footerCenterX =
      pageWidth / 2;

    const footerLogoSize =
      7;

    const footerLogoX =
      footerCenterX - 26;

    const footerLogoY =
      pageHeight - 14.5;

    const footerNameX =
      footerCenterX - 17;

    const footerNameY =
      pageHeight - 9.5;

    /*
     * SHIVSHAMBHO LOGO
     * Positioned immediately to the left of the name.
     */

    if (
      shivshambhoLogoData
    ) {
      try {
        doc.addImage(
          shivshambhoLogoData,
          "PNG",
          footerLogoX,
          footerLogoY,
          footerLogoSize,
          footerLogoSize,
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

    /*
     * SHIVSHAMBHO NAME
     * Logo is directly in front of this text.
     */

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
      footerNameX,
      footerNameY
    );

    /*
     * BILL INFORMATION
     */

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(
      4.8
    );

    doc.setTextColor(
      COLORS.muted
    );

    doc.text(
      `Bill No. ${finalBillNo}  |  Bill Date: ${formatDate(
        finalBillDate
      )}`,
      pageWidth / 2,
      pageHeight - 6.5,
      {
        align:
          "center",
      }
    );

    /* =================================================
       SAVE FILE
    ================================================= */

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

    doc.save(
      fileName
    );

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
  ) => {
    return exportLedgerPDF(
      options
    );
  };

export default exportLedgerPDF;