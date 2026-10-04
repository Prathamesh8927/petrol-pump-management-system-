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
   TRANSACTION TYPE

   Supported:
   - Purchase
   - Payment
   - Advance
===================================================== */

const getTransactionType = (entry) => {
  const type = safeString(
    entry?.entryType ||
      entry?.type ||
      entry?.transactionType ||
      ""
  ).toLowerCase();

  if (
    type.includes("advance") ||
    type.includes("advance payment")
  ) {
    return "Advance";
  }

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

/* =====================================================
   FUEL RATE

   Supports:
   - rate
   - fuelRate
   - fuelPrice
   - pricePerLitre
   - pricePerLiter
   - price
   - unitPrice
   - sellingPrice
===================================================== */

const getFuelRate = (entry) =>
  Number(
    entry?.rate ??
      entry?.fuelRate ??
      entry?.fuelPrice ??
      entry?.pricePerLitre ??
      entry?.pricePerLiter ??
      entry?.price ??
      entry?.unitPrice ??
      entry?.sellingPrice ??
      0
  );

/* =====================================================
   QUANTITY

   IMPORTANT:
   Quantity is calculated from:

   Purchase Amount / Fuel Rate

   Example:
   Amount = ₹3000
   Rate   = ₹100/L
   Quantity = 30 L

   Existing quantity fields are used only as a
   fallback when a valid rate is not available.
===================================================== */

const getQuantity = (entry) => {
  const type = getTransactionType(entry);

  if (type !== "Purchase") {
    return 0;
  }

  const amount = Number(
    entry?.amount ??
      entry?.totalAmount ??
      entry?.purchaseAmount ??
      entry?.debit ??
      0
  );

  const rate = getFuelRate(entry);

  if (
    Number.isFinite(amount) &&
    amount > 0 &&
    Number.isFinite(rate) &&
    rate > 0
  ) {
    return amount / rate;
  }

  /* Fallback for old records where rate is unavailable */
  return Number(
    entry?.quantity ??
      entry?.qty ??
      entry?.fuelQuantity ??
      entry?.litres ??
      entry?.liters ??
      0
  );
};

/* =====================================================
   TRANSACTION AMOUNT
===================================================== */

const getAmount = (entry) =>
  Number(
    entry?.amount ??
      entry?.totalAmount ??
      entry?.purchaseAmount ??
      entry?.debit ??
      0
  );

/* =====================================================
   PAID AMOUNT

   For normal purchases:
   paid / paidAmount / credit

   For payment transactions:
   paymentAmount

   Advance amount is handled separately.
===================================================== */

const getPaidAmount = (entry) => {
  const type = getTransactionType(entry);

  if (type === "Advance") {
    return 0;
  }

  if (type === "Payment") {
    return Number(
      entry?.paymentAmount ??
        entry?.paid ??
        entry?.paidAmount ??
        entry?.credit ??
        0
    );
  }

  return Number(
    entry?.paid ??
      entry?.paidAmount ??
      entry?.paymentAmount ??
      entry?.credit ??
      0
  );
};

/* =====================================================
   ADVANCE PAYMENT AMOUNT

   Handles:
   advanceAmount
   advancePayment
   paymentAmount for Advance transaction
   advanceAppliedAmount for purchases
===================================================== */

const getAdvanceAmount = (entry) => {
  const type = getTransactionType(entry);

  if (type === "Advance") {
    return Number(
      entry?.advanceAmount ??
        entry?.advancePayment ??
        entry?.paymentAmount ??
        entry?.amount ??
        0
    );
  }

  return Number(
    entry?.advanceAppliedAmount ??
      entry?.advanceApplied ??
      entry?.appliedAdvance ??
      entry?.advanceUsed ??
      0
  );
};

/* =====================================================
   PENDING AMOUNT

   Important:
   If backend already provides pending/pendingAmount,
   that value is used.

   Otherwise:
   Purchase amount
   - paid amount
   - advance applied amount
===================================================== */

const getPendingAmount = (entry) => {
  if (
    entry?.pending !== undefined &&
    entry?.pending !== null
  ) {
    return Math.max(
      Number(entry.pending || 0),
      0
    );
  }

  if (
    entry?.pendingAmount !== undefined &&
    entry?.pendingAmount !== null
  ) {
    return Math.max(
      Number(entry.pendingAmount || 0),
      0
    );
  }

  const type = getTransactionType(entry);

  if (
    type === "Advance" ||
    type === "Payment"
  ) {
    return 0;
  }

  const amount =
    getAmount(entry);

  const paid =
    getPaidAmount(entry);

  const advance =
    getAdvanceAmount(entry);

  return Math.max(
    amount -
      paid -
      advance,
    0
  );
};

/* =====================================================
   ENTRY STATUS
===================================================== */

const getEntryStatus = (entry) => {
  const type =
    getTransactionType(entry);

  /* ADVANCE PAYMENT */
  if (type === "Advance") {
    return "Advanced";
  }

  /* PAYMENT */
  if (type === "Payment") {
    return "Payment";
  }

  const advance = Math.max(
    Number(
      getAdvanceAmount(entry) || 0
    ),
    0
  );

  const pending = Math.max(
    Number(
      getPendingAmount(entry) || 0
    ),
    0
  );

  /*
     ADVANCE FULLY COVERS PURCHASE
  */
  if (
    advance > 0 &&
    pending <= 0
  ) {
    return "Advanced";
  }

  /*
     ADVANCE  COVERS PURCHASE
  */
  if (
    advance > 0 &&
    pending > 0
  ) {
    return " Advanced";
  }

  /*
     PURCHASE STILL PENDING
  */
  if (pending > 0) {
    return "Pending";
  }

  /*
     BOTH ARE ZERO
     Advance = 0
     Pending = 0
  */
  if (
    advance <= 0 &&
    pending <= 0
  ) {
    return "OK";
  }

  return "OK";
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
   ADVANCE BALANCE HELPERS
===================================================== */

const getAdvanceBalance = (
  summary = {},
  customer = {},
  entries = []
) => {
  const explicitBalance =
    summary?.advanceBalance ??
    customer?.advanceBalance;

  if (
    explicitBalance !== undefined &&
    explicitBalance !== null
  ) {
    return Math.max(
      Number(explicitBalance || 0),
      0
    );
  }

  let totalAdvanceReceived = 0;
  let totalAdvanceApplied = 0;

  entries.forEach((entry) => {
    const type =
      getTransactionType(entry);

    if (type === "Advance") {
      totalAdvanceReceived +=
        Math.max(
          getAdvanceAmount(entry),
          0
        );
    }

    if (type === "Purchase") {
      totalAdvanceApplied +=
        Math.max(
          getAdvanceAmount(entry),
          0
        );
    }
  });

  return Math.max(
    totalAdvanceReceived -
      totalAdvanceApplied,
    0
  );
};

/* =====================================================
   LEDGER STATUS

   IMPORTANT:
   Do NOT use backend status/ledgerStatus directly.

   The first summary table must always calculate
   its status from the actual advance + pending
   values so that Advance /  Advanced
   is displayed correctly.
===================================================== */

const getLedgerStatus = ({
  summary = {},
  customer = {},
  advanceBalance = 0,
  totalPending = 0,
  totalAdvanceApplied = 0,
  totalAdvanceReceived = 0,
}) => {
  const numericAdvanceBalance =
    Math.max(
      Number(advanceBalance || 0),
      0
    );

  const numericPending =
    Math.max(
      Number(totalPending || 0),
      0
    );

  const numericAdvanceApplied =
    Math.max(
      Number(
        totalAdvanceApplied || 0
      ),
      0
    );

  const numericAdvanceReceived =
    Math.max(
      Number(
        totalAdvanceReceived || 0
      ),
      0
    );

  /*
     ADVANCE  USED

     Example:
     Advance Received = ₹30,000
     Advance Applied = ₹10,000
     Pending = ₹5,000

     Status =  Advanced
  */
  if (
    numericAdvanceApplied > 0 &&
    numericPending > 0
  ) {
    return " Advanced";
  }

  /*
     ADVANCE AVAILABLE / FULLY COVERED

     Example:
     Advance Balance = ₹20,000
     Pending = ₹0

     Status = Advanced
  */
  if (
    numericAdvanceBalance > 0 &&
    numericPending <= 0
  ) {
    return "Advanced";
  }

  /*
     ADVANCE WAS USED AND EVERYTHING
     IS FULLY SETTLED

     Example:
     Advance Applied = ₹30,000
     Advance Balance = ₹0
     Pending = ₹0

     Status = Advanced
  */
  if (
    numericAdvanceApplied > 0 &&
    numericPending <= 0
  ) {
    return "Advanced";
  }

  /*
     AMOUNT STILL PENDING
  */
  if (
    numericPending > 0
  ) {
    return "Pending";
  }

  /*
     Advance was received but has been
     completely adjusted.
  */
  if (
    numericAdvanceReceived > 0 &&
    numericAdvanceBalance <= 0 &&
    numericPending <= 0
  ) {
    return "Advanced";
  }

  /*
     No advance and no pending amount.
  */
  if (
    numericAdvanceBalance <= 0 &&
    numericPending <= 0
  ) {
    return "OK";
  }

  return "OK";
};

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
        ? ` ${twoDigits(remainder)}`
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
   LOGO RESOLUTION
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
  indianoil: "iocl.com",
  ioc: "iocl.com",

  "bharat petroleum":
    "bharatpetroleum.in",

  bpcl:
    "bharatpetroleum.in",

  bharatpetroleum:
    "bharatpetroleum.in",

  "hindustan petroleum":
    "hindustanpetroleum.com",

  hpcl:
    "hindustanpetroleum.com",

  hindustanpetroleum:
    "hindustanpetroleum.com",

  nayara:
    "nayaraenergy.com",

  "nayara energy":
    "nayaraenergy.com",

  reliance:
    "reliancepetroleum.com",

  "reliance petroleum":
    "reliancepetroleum.com",

  shell:
    "shell.in",

  "jio bp":
    "jiobp.com",

  jiobp:
    "jiobp.com",

  "jio-bp":
    "jiobp.com",

  "oil india":
    "oil-india.com",

  oilindia:
    "oil-india.com",

  adani:
    "adanigas.com",

  "adani total":
    "adanigas.com",

  gulf:
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
          !blob.type ||
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

    /* =================================================
       NORMALIZE ENTRIES
    ================================================= */

    const ledgerEntries =
      Array.isArray(entries)
        ? entries
        : [];

    /* =================================================
       BILL FROM DATE

       Automatically uses the FIRST / OLDEST
       transaction date from the customer ledger.

       Example:
       First ledger entry = 01/10/2026
       Today = 04/10/2026

       PDF:
       Bill From : 01/10/2026

       The original entries array is NOT mutated.
    ================================================= */

    const sortedLedgerEntries =
      [...ledgerEntries].sort(
        (a, b) => {
          const dateA =
            new Date(
              getTransactionDate(a)
            ).getTime();

          const dateB =
            new Date(
              getTransactionDate(b)
            ).getTime();

          return (
            (Number.isNaN(dateA)
              ? Infinity
              : dateA) -
            (Number.isNaN(dateB)
              ? Infinity
              : dateB)
          );
        }
      );

    const firstLedgerDate =
      sortedLedgerEntries.length > 0
        ? getTransactionDate(
            sortedLedgerEntries[0]
          )
        : null;

    const finalBillFrom =
      firstLedgerDate
        ? formatDate(
            firstLedgerDate
          )
        : safeString(
            billFrom ||
              customer?.billFrom ||
              customer?.billingPeriod ||
              ""
          ) || "-";

    /* =================================================
       TOTAL QUANTITY

       Purchase entries only.

       Quantity for every purchase is calculated as:

       Purchase Amount / Fuel Rate

       Advance and Payment entries
       do not contribute to quantity.
    ================================================= */

    const totalQuantity =
      ledgerEntries
        .filter(
          (entry) =>
            getTransactionType(
              entry
            ) === "Purchase"
        )
        .reduce(
          (sum, entry) =>
            sum +
            Math.max(
              getQuantity(entry),
              0
            ),
          0
        );

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

       Advance-aware calculation
    ================================================= */

    const totalPurchased =
      Number(
        summary?.totalPurchased ??
          customer?.totalPurchased ??
          customer?.totalAmount ??
          ledgerEntries
            .filter(
              (entry) =>
                getTransactionType(
                  entry
                ) === "Purchase"
            )
            .reduce(
              (sum, entry) =>
                sum +
                Math.max(
                  getAmount(entry),
                  0
                ),
              0
            )
      );

    const totalPaid =
      Number(
        summary?.totalPaid ??
          customer?.totalPaid ??
          customer?.paidAmount ??
          ledgerEntries
            .filter(
              (entry) =>
                getTransactionType(
                  entry
                ) !== "Advance"
            )
            .reduce(
              (sum, entry) =>
                sum +
                Math.max(
                  getPaidAmount(
                    entry
                  ),
                  0
                ),
              0
            )
      );

    const advanceBalance =
      getAdvanceBalance(
        summary,
        customer,
        ledgerEntries
      );

    const calculatedPending =
      ledgerEntries
        .filter(
          (entry) =>
            getTransactionType(
              entry
            ) === "Purchase"
        )
        .reduce(
          (sum, entry) =>
            sum +
            Math.max(
              getPendingAmount(
                entry
              ),
              0
            ),
          0
        );

    const totalPending =
      Number(
        summary?.totalPending ??
          customer?.totalPending ??
          customer?.currentBalance ??
          calculatedPending ??
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
          ledgerEntries.filter(
            (entry) =>
              getTransactionType(
                entry
              ) === "Purchase"
          ).length
      );

    /* =================================================
       ADVANCE TOTALS
    ================================================= */

    const totalAdvanceReceived =
      Number(
        summary?.totalAdvanceReceived ??
          summary?.advanceReceived ??
          customer?.totalAdvanceReceived ??
          ledgerEntries
            .filter(
              (entry) =>
                getTransactionType(
                  entry
                ) === "Advance"
            )
            .reduce(
              (sum, entry) =>
                sum +
                Math.max(
                  getAdvanceAmount(
                    entry
                  ),
                  0
                ),
              0
            )
      );

    const totalAdvanceApplied =
      Number(
        summary?.totalAdvanceApplied ??
          summary?.advanceApplied ??
          customer?.totalAdvanceApplied ??
          ledgerEntries
            .filter(
              (entry) =>
                getTransactionType(
                  entry
                ) === "Purchase"
            )
            .reduce(
              (sum, entry) =>
                sum +
                Math.max(
                  getAdvanceAmount(
                    entry
                  ),
                  0
                ),
              0
            )
      );

    /* =================================================
       LEDGER STATUS

       Uses the SAME advance/pending logic as
       transaction status.
    ================================================= */

    const ledgerStatus =
      getLedgerStatus({
        summary,
        customer,
        advanceBalance,
        totalPending,
        totalAdvanceApplied,
        totalAdvanceReceived,
      });

    /* =================================================
       FINAL ADVANCE / NET AMOUNT

       If Advance > Pending:
       Remaining Advance = Advance - Pending
       Net Amount = 0

       If Pending > Advance:
       Net Amount = Pending - Advance
       Remaining Advance = 0
    ================================================= */

    const remainingAdvance =
      Math.max(
        advanceBalance -
          totalPending,
        0
      );

    const netAmount =
      Math.max(
        totalPending -
          advanceBalance,
        0
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
       OWNER NAME
    ================================================= */

    if (ownerName) {
      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(7);

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

    doc.setFontSize(15);

    doc.setTextColor(
      COLORS.text
    );

    doc.text(
      pumpName,
      pageWidth / 2,
      19,
      {
        align: "center",
      }
    );

    /* =================================================
       COMPANY / DEALER
    ================================================= */

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
      24,
      {
        align: "center",
      }
    );

    /* =================================================
       ADDRESS
    ================================================= */

    const addressParts = [
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

      doc.setFontSize(6.5);

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
          align: "center",
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

    doc.setFontSize(12);

    doc.setTextColor(
      COLORS.mainHeader
    );

    doc.text(
      "CUSTOMER LEDGER",
      pageWidth / 2,
      43,
      {
        align: "center",
      }
    );

    /* =================================================
       BUYER / BILL INFORMATION
    ================================================= */

    const infoY = 60;

    const leftX = margin;

    const rightX =
      pageWidth / 2 + 8;

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(7);

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
       RIGHT — BILL NO
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
        customerAddress || "-",
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
      customerGstin || "-",
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

    /* =================================================
       CUSTOMER META
    ================================================= */

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

    /* =================================================
       SUMMARY TABLE
    ================================================= */

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

      head: [
        [
          "TOTAL PURCHASES",
          "TOTAL PAID",
          "ADVANCE BALANCE",
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
            advanceBalance
          )}`,

          `Rs. ${formatMoney(
            totalPending
          )}`,

          String(
            purchaseCount
          ),

          ledgerStatus,
        ],
      ],

      styles: {
        font: "helvetica",

        fontSize: 5.8,

        textColor:
          COLORS.text,

        lineColor:
          COLORS.border,

        lineWidth: 0.3,

        cellPadding: 1.8,

        halign: "center",

        valign: "middle",
      },

      headStyles: {
        fillColor:
          COLORS.mainHeader,

        textColor:
          COLORS.white,

        fontStyle: "bold",

        fontSize: 5.4,

        halign: "center",

        valign: "middle",
      },

      bodyStyles: {
        fillColor:
          COLORS.white,

        fontSize: 5.8,
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
            1
          ) {
            hookData.cell.styles.textColor =
              COLORS.paid;

            hookData.cell.styles.fontStyle =
              "bold";
          }

          if (
            hookData.column.index ===
            2
          ) {
            hookData.cell.styles.textColor =
              advanceBalance > 0
                ? COLORS.paid
                : COLORS.muted;

            hookData.cell.styles.fontStyle =
              "bold";
          }

          if (
            hookData.column.index ===
            3
          ) {
            hookData.cell.styles.textColor =
              totalPending > 0
                ? COLORS.pending
                : COLORS.paid;

            hookData.cell.styles.fontStyle =
              "bold";
          }

          /*
             FIRST TABLE STATUS

             IMPORTANT:
             The status shown here comes from
             getLedgerStatus(), which calculates
             Advance /  Advanced /
             Pending / OK from actual values.

             Backend summary.status is NOT allowed
             to override this result.
          */
          if (
            hookData.column.index ===
            5
          ) {
            const status =
              safeString(
                hookData.cell.raw
              );

            if (
              status ===
                "Advanced" ||
              status ===
                " Advanced" ||
              status ===
                "Paid" ||
              status ===
                "OK"
            ) {
              hookData.cell.styles.textColor =
                COLORS.paid;

              hookData.cell.styles.fontStyle =
                "bold";
            }

            if (
              status ===
              "Pending"
            ) {
              hookData.cell.styles.textColor =
                COLORS.pending;

              hookData.cell.styles.fontStyle =
                "bold";
            }

            if (
              status ===
              "Payment"
            ) {
              hookData.cell.styles.textColor =
                COLORS.paid;

              hookData.cell.styles.fontStyle =
                "bold";
            }
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

    doc.setFontSize(8);

    doc.setTextColor(
      COLORS.text
    );

    doc.text(
      "TRANSACTION HISTORY",
      margin + 3,
      transactionStartY + 5.5
    );

    /* =================================================
       TRANSACTION ROWS

       Quantity is calculated from:

       Purchase Amount / Fuel Rate

       Advance and Payment transactions
       show "-".

       Advance Used column intentionally removed.
    ================================================= */

    const transactionRows =
      ledgerEntries.map(
        (
          entry,
          index
        ) => {
          const type =
            getTransactionType(
              entry
            );

          const amount =
            getAmount(
              entry
            );

          const quantity =
            getQuantity(
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

          const status =
            getEntryStatus(
              entry
            );

          let displayAmount =
            amount;

          if (
            type === "Advance"
          ) {
            displayAmount =
              getAdvanceAmount(
                entry
              );
          }

          return [
            String(
              index + 1
            ),

            formatDate(
              getTransactionDate(
                entry
              )
            ),

            type,

            getFuelType(
              entry
            ),

            type === "Purchase"
              ? `${quantity.toFixed(2)}`
              : "-",

            `Rs. ${formatMoney(
              displayAmount
            )}`,

            `Rs. ${formatMoney(
              paid
            )}`,

            `Rs. ${formatMoney(
              pending
            )}`,

            status,

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
        left: margin,
        right: margin,
      },

      tableWidth:
        contentWidth,

      theme: "grid",

      head: [
        [
          "#",
          "Date",
          "Type",
          "Fuel",
          "Quantity",
          "Amount",
          "Paid",
          "Pending",
          "Status",
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
                "-",
                "Rs. 0.00",
                "Rs. 0.00",
                "Rs. 0.00",
                "-",
                "-",
                "-",
              ],
            ],

      styles: {
        font: "helvetica",

        fontSize: 5.3,

        textColor:
          COLORS.text,

        lineColor:
          COLORS.border,

        lineWidth: 0.25,

        cellPadding: 1.2,

        valign: "middle",

        halign: "center",
      },

      headStyles: {
        fillColor:
          COLORS.mainHeader,

        textColor:
          COLORS.white,

        fontStyle: "bold",

        fontSize: 4.9,

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
          cellWidth: 6,
        },

        1: {
          cellWidth: 16,
        },

        2: {
          cellWidth: 15,
        },

        3: {
          cellWidth: 15,
        },

        4: {
          cellWidth: 13,
        },

        5: {
          cellWidth: 18,
        },

        6: {
          cellWidth: 18,
        },

        7: {
          cellWidth: 18,
        },

        8: {
          cellWidth: 19,
        },

        9: {
          cellWidth: 21,
        },

        10: {
          cellWidth: "auto",
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

          /* PAID */
          if (
            hookData.column.index ===
            6
          ) {
            const numericValue =
              Number(
                String(
                  hookData.cell.raw
                ).replace(
                  /[^0-9.-]/g,
                  ""
                )
              );

            if (
              numericValue > 0
            ) {
              hookData.cell.styles.textColor =
                COLORS.paid;
            }
          }

          /* PENDING */
          if (
            hookData.column.index ===
            7
          ) {
            const numericValue =
              Number(
                String(
                  hookData.cell.raw
                ).replace(
                  /[^0-9.-]/g,
                  ""
                )
              );

            if (
              numericValue > 0
            ) {
              hookData.cell.styles.textColor =
                COLORS.pending;

              hookData.cell.styles.fontStyle =
                "bold";
            }
          }

          /* STATUS */
          if (
            hookData.column.index ===
            8
          ) {
            const status =
              safeString(
                hookData.cell.raw
              );

            if (
              status ===
              "Advanced"
            ) {
              hookData.cell.styles.textColor =
                COLORS.paid;

              hookData.cell.styles.fontStyle =
                "bold";
            }

            if (
              status ===
              " Advanced"
            ) {
              hookData.cell.styles.textColor =
                COLORS.paid;

              hookData.cell.styles.fontStyle =
                "bold";
            }

            if (
              status ===
              "Pending"
            ) {
              hookData.cell.styles.textColor =
                COLORS.pending;

              hookData.cell.styles.fontStyle =
                "bold";
            }

            if (
              status ===
              "Paid"
            ) {
              hookData.cell.styles.textColor =
                COLORS.paid;

              hookData.cell.styles.fontStyle =
                "bold";
            }

            if (
              status ===
              "OK"
            ) {
              hookData.cell.styles.textColor =
                COLORS.paid;

              hookData.cell.styles.fontStyle =
                "bold";
            }
          }
        },
    });

    /* =================================================
       TOTAL QUANTITY

       Displayed BELOW transaction table.

       Calculated from:
       Purchase Amount / Fuel Rate
    ================================================= */

    const totalQuantityY =
      doc.lastAutoTable.finalY + 5;

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(7);

    doc.setTextColor(
      COLORS.text
    );

    doc.text(
      "Total Quantity:",
      margin,
      totalQuantityY
    );

    doc.setTextColor(
      COLORS.mainHeader
    );

    doc.text(
      `${totalQuantity.toFixed(2)} L`,
      margin + 28,
      totalQuantityY
    );

    /* =================================================
       LEDGER SUMMARY
    ================================================= */

    let summaryYPosition =
      totalQuantityY +
      8;

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
          `Rs. ${formatMoney(
            value
          )}`,
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

    /* =================================================
       ADVANCE RECEIVED
    ================================================= */

    drawSummaryLine(
      "Advance Received",
      totalAdvanceReceived,
      COLORS.paid
    );

    /* =================================================
       ADVANCE APPLIED
    ================================================= */

    drawSummaryLine(
      "Advance Applied",
      totalAdvanceApplied,
      COLORS.paid
    );

    /* =================================================
       REMAINING ADVANCE BALANCE
    ================================================= */

    drawSummaryLine(
      "Advance Balance",
      advanceBalance,
      advanceBalance > 0
        ? COLORS.paid
        : COLORS.muted
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

    drawSummaryLine(
      "Previous Balance",
      previousBalance
    );

    drawSummaryLine(
      "Received Amount",
      receivedAmount,
      COLORS.paid
    );

    /* =================================================
       NET AMOUNT

       Net Amount = Pending - Advance Balance

       Minimum value is always 0.
    ================================================= */

    summaryYPosition += 2;

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
      `Rs. ${formatMoney(
        netAmount
      )}`,
      summaryValueX,
      summaryYPosition,
      {
        align: "right",
      }
    );

    /* =================================================
       ADVANCE STATUS BOX

       Remaining Advance = Advance Balance - Pending

       If remaining advance > 0:
       REMAINING ADVANCE — Rs. X

       If no remaining advance and net is pending:
       NO REMAINING ADVANCE

       If everything is adjusted:
       ADVANCE FULLY ADJUSTED
    ================================================= */

    const advanceStatusY =
      summaryYPosition + 6;

    doc.setDrawColor(
      COLORS.border
    );

    doc.setFillColor(
      remainingAdvance > 0
        ? "#ECFDF5"
        : COLORS.sectionBar
    );

    doc.roundedRect(
      summaryLabelX,
      advanceStatusY,
      pageWidth -
        margin -
        summaryLabelX,
      10,
      1.5,
      1.5,
      "FD"
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(6.5);

    doc.setTextColor(
      remainingAdvance > 0
        ? COLORS.paid
        : COLORS.text
    );

    const advanceStatusText =
      remainingAdvance > 0
        ? `REMAINING ADVANCE — Rs. ${formatMoney(
            remainingAdvance
          )}`
        : netAmount > 0
        ? "NO REMAINING ADVANCE"
        : "ADVANCE FULLY ADJUSTED";

    doc.text(
      advanceStatusText,
      summaryLabelX + 3,
      advanceStatusY + 6
    );

    /* =================================================
       AMOUNT IN WORDS
    ================================================= */

    const amountWordsY =
      advanceStatusY + 16;

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

    doc.setFontSize(5.8);

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

    /* =================================================
       FOOTER

       SHIVSHAMBHO LOGO + NAME
    ================================================= */

    const footerCenterX =
      pageWidth / 2;

    const footerLogoSize = 7;

    const footerLogoX =
      footerCenterX - 26;

    const footerLogoY =
      pageHeight - 14.5;

    const footerNameX =
      footerCenterX - 17;

    const footerNameY =
      pageHeight - 9.5;

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

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(7);

    doc.setTextColor(
      COLORS.mainHeader
    );

    doc.text(
      "SHIVSHAMBHO",
      footerNameX,
      footerNameY
    );

    /* =================================================
       BILL INFORMATION
    ================================================= */

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
      pageHeight - 6.5,
      {
        align: "center",
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

      advanceBalance,

      remainingAdvance,

      netAmount,

      totalAdvanceReceived,

      totalAdvanceApplied,

      totalQuantity,

      totalPending,

      status:
        ledgerStatus,
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

/* =====================================================
   DEFAULT EXPORT
===================================================== */

export default exportLedgerPDF;