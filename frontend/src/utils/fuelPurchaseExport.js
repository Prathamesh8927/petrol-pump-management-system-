import jsPDF from "jspdf";

/* =====================================================
   FUEL PURCHASE PDF EXPORT
===================================================== */

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date =
    typeof value === "string" &&
    value.includes("T")
      ? new Date(value)
      : new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* =====================================================
   FORMAT NUMBER
===================================================== */

const formatNumber = (value) => {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

/* =====================================================
   FORMAT CURRENCY
   Use INR instead of ₹ because default jsPDF fonts
   may not render the rupee symbol correctly.
===================================================== */

const formatCurrency = (value) => {
  return `INR ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/* =====================================================
   GET SUPPLIER NAME
===================================================== */

const getSupplierName = (purchase = {}) => {
  return String(
    purchase.supplierName ||
      purchase.supplier ||
      "-"
  ).trim();
};

/* =====================================================
   GET CREATED BY
===================================================== */

const getCreatedBy = (purchase = {}) => {
  if (
    typeof purchase.createdBy === "string" &&
    purchase.createdBy.trim()
  ) {
    return purchase.createdBy.trim();
  }

  return (
    purchase.createdBy?.name ||
    purchase.createdBy?.fullName ||
    purchase.createdBy?.username ||
    purchase.createdBy?.email ||
    "-"
  );
};

/* =====================================================
   DRAW HORIZONTAL LINE
===================================================== */

const drawLine = (
  doc,
  y,
  pageWidth
) => {
  doc.setDrawColor(210, 210, 210);

  doc.line(
    20,
    y,
    pageWidth - 20,
    y
  );
};

/* =====================================================
   DRAW FIELD
===================================================== */

const drawField = (
  doc,
  label,
  value,
  x,
  y,
  labelWidth = 45
) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(
    `${label}:`,
    x,
    y
  );

  doc.setFont("helvetica", "normal");

  doc.text(
    String(value ?? "-"),
    x + labelWidth,
    y
  );
};

/* =====================================================
   SAVE FUEL PURCHASE PDF
===================================================== */

export const saveFuelPurchasePDF = (
  purchase = {},
  options = {}
) => {
  try {
    if (!purchase?._id) {
      throw new Error(
        "Invalid fuel purchase record"
      );
    }

    const doc =
      new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

    const pageWidth =
      doc.internal.pageSize.getWidth();

    const pageHeight =
      doc.internal.pageSize.getHeight();

    const fuelName =
      purchase.fuelType === "petrol"
        ? "Petrol"
        : purchase.fuelType === "diesel"
        ? "Diesel"
        : String(
            purchase.fuelType ||
              "Fuel"
          );

    const purchaseDate =
      formatDate(
        purchase.purchaseDate ||
          purchase.date ||
          purchase.createdAt
      );

    const supplierName =
      getSupplierName(
        purchase
      );

    const quantity =
      Number(
        purchase.quantity || 0
      );

    const purchasePrice =
      Number(
        purchase.purchasePrice || 0
      );

    const totalAmount =
      Number(
        purchase.totalAmount || 0
      );

    const invoiceNumber =
      purchase.invoiceNumber ||
      "-";

    const createdBy =
      getCreatedBy(
        purchase
      );

    const generatedDate =
      new Date().toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );

    /* =================================================
       HEADER
    ================================================= */

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(20);

    doc.text(
      options.companyName ||
        "Shivshambho",
      20,
      25
    );

    doc.setFontSize(11);

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.text(
      options.companySubtitle ||
        "Petrol Pump Management System",
      20,
      32
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(16);

    doc.text(
      "FUEL PURCHASE RECORD",
      pageWidth - 20,
      25,
      {
        align: "right",
      }
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.text(
      `Generated: ${generatedDate}`,
      pageWidth - 20,
      32,
      {
        align: "right",
      }
    );

    drawLine(
      doc,
      40,
      pageWidth
    );

    /* =================================================
       PURCHASE INFORMATION
    ================================================= */

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(13);

    doc.text(
      "Purchase Information",
      20,
      52
    );

    drawField(
      doc,
      "Purchase Date",
      purchaseDate,
      20,
      64
    );

    drawField(
      doc,
      "Fuel Type",
      fuelName,
      20,
      75
    );

    drawField(
      doc,
      "Supplier",
      supplierName,
      20,
      86
    );

    drawField(
      doc,
      "Invoice Number",
      invoiceNumber,
      20,
      97
    );

    drawField(
      doc,
      "Added By",
      createdBy,
      20,
      108
    );

    /* =================================================
       FINANCIAL DETAILS BOX
    ================================================= */

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(13);

    doc.text(
      "Purchase Details",
      20,
      128
    );

    const boxTop = 136;
    const boxHeight = 60;

    doc.setDrawColor(
      200,
      200,
      200
    );

    doc.rect(
      20,
      boxTop,
      pageWidth - 40,
      boxHeight
    );

    /* Column positions */

    const column1 = 28;
    const column2 = 105;
    const column3 = 155;

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(9);

    doc.text(
      "Fuel",
      column1,
      148
    );

    doc.text(
      "Quantity",
      column2,
      148
    );

    doc.text(
      "Purchase Rate",
      column3,
      148
    );

    drawLine(
      doc,
      153,
      pageWidth
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(11);

    doc.text(
      fuelName,
      column1,
      166
    );

    doc.text(
      `${formatNumber(
        quantity
      )} L`,
      column2,
      166
    );

    doc.text(
      `${formatCurrency(
        purchasePrice
      )}/L`,
      column3,
      166
    );

    /* =================================================
       TOTAL
    ================================================= */

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(12);

    doc.text(
      "Total Purchase Amount",
      28,
      184
    );

    doc.setFontSize(16);

    doc.text(
      formatCurrency(
        totalAmount
      ),
      pageWidth - 28,
      184,
      {
        align: "right",
      }
    );

    /* =================================================
       RECORD ID
    ================================================= */

    drawLine(
      doc,
      198,
      pageWidth
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.text(
      `Purchase ID: ${purchase._id}`,
      20,
      208
    );

    /* =================================================
       FOOTER
    ================================================= */

    doc.setFontSize(9);

    doc.text(
      "This is a system-generated fuel purchase record.",
      pageWidth / 2,
      pageHeight - 25,
      {
        align: "center",
      }
    );

    doc.text(
      "Shivshambho | Petrol Pump Management System",
      pageWidth / 2,
      pageHeight - 18,
      {
        align: "center",
      }
    );

    /* =================================================
       FILE NAME
    ================================================= */

    const safeSupplier =
      supplierName
        .replace(
          /[^a-zA-Z0-9]+/g,
          "_"
        )
        .replace(
          /^_+|_+$/g,
          ""
        ) ||
      "Supplier";

    const safeFuel =
      fuelName
        .replace(
          /[^a-zA-Z0-9]+/g,
          "_"
        );

    const safeDate =
      String(
        purchaseDate
      )
        .replace(
          /[^a-zA-Z0-9]+/g,
          "_"
        );

    const fileName =
      `Fuel_Purchase_${safeFuel}_${safeSupplier}_${safeDate}.pdf`;

    doc.save(
      fileName
    );

    return true;
  } catch (error) {
    console.error(
      "FUEL PURCHASE PDF ERROR:",
      error
    );

    throw error;
  }
};

export default saveFuelPurchasePDF;