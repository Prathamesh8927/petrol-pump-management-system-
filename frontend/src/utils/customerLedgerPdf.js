import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/*
  ============================================================
  CUSTOMER LEDGER PDF GENERATOR
  ============================================================

  This utility only generates the PDF.

  It does NOT modify:
  - Customer data
  - Ledger entries
  - Payments
  - Purchases
  - Existing UI
  ============================================================
*/

const formatMoney = (value) => {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (value = new Date()) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/*
  Convert image URL / imported image into base64.
*/
const imageToBase64 = (imageUrl) => {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve(null);
      return;
    }

    const image = new Image();

    image.crossOrigin = "anonymous";

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");

        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;

        const context = canvas.getContext("2d");

        context.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        );

        resolve(
          canvas.toDataURL("image/png")
        );
      } catch (error) {
        console.error(
          "LOGO CONVERSION ERROR:",
          error
        );

        resolve(null);
      }
    };

    image.onerror = () => {
      resolve(null);
    };

    image.src = imageUrl;
  });
};

/*
  ============================================================
  MAIN FUNCTION
  ============================================================
*/

export const generateCustomerLedgerPDF = async ({
  customer,
  entries = [],
  summary = {},
  pump = {},
  logo = null,
}) => {
  if (!customer) {
    throw new Error(
      "Customer information is required"
    );
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth =
    doc.internal.pageSize.getWidth();

  const pageHeight =
    doc.internal.pageSize.getHeight();

  const margin = 14;

  /*
    ============================================================
    LOGO
    ============================================================
  */

  let logoBase64 = null;

  if (logo) {
    logoBase64 =
      await imageToBase64(logo);
  }

  /*
    ============================================================
    HEADER
    ============================================================
  */

  let headerStartX = margin;

  if (logoBase64) {
    try {
      doc.addImage(
        logoBase64,
        "PNG",
        margin,
        12,
        25,
        25
      );

      headerStartX = margin + 31;
    } catch (error) {
      console.error(
        "PDF LOGO ERROR:",
        error
      );
    }
  }

  const pumpName =
    pump?.pumpName ||
    pump?.name ||
    "Petrol Pump";

  const pumpId =
    pump?.pumpCode ||
    pump?.pumpId ||
    pump?._id ||
    "-";

  const ownerName =
    pump?.ownerName ||
    pump?.authorityName ||
    pump?.authorizedPerson ||
    "-";

  const designation =
    pump?.designation ||
    pump?.authorityDesignation ||
    "Authorized Authority";

  const phone =
    pump?.phone ||
    pump?.mobile ||
    "-";

  const addressParts = [
    pump?.address,
    pump?.city,
    pump?.state,
    pump?.pincode,
  ].filter(Boolean);

  const pumpAddress =
    addressParts.join(", ") || "-";

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(18);

  doc.text(
    String(pumpName),
    headerStartX,
    18
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(9);

  doc.text(
    "Petrol Pump Management",
    headerStartX,
    24
  );

  doc.setFontSize(8);

  doc.text(
    `Pump ID: ${pumpId}`,
    headerStartX,
    29
  );

  /*
    Header line
  */

  doc.setLineWidth(0.5);

  doc.line(
    margin,
    42,
    pageWidth - margin,
    42
  );

  /*
    ============================================================
    TITLE
    ============================================================
  */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(15);

  doc.text(
    "CUSTOMER LEDGER STATEMENT",
    pageWidth / 2,
    52,
    {
      align: "center",
    }
  );

  /*
    ============================================================
    PUMP DETAILS
    ============================================================
  */

  doc.setFontSize(9);

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.text(
    "PUMP DETAILS",
    margin,
    63
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  const pumpDetailsY = 69;

  doc.text(
    `Pump Name: ${pumpName}`,
    margin,
    pumpDetailsY
  );

  doc.text(
    `Pump ID: ${pumpId}`,
    margin + 92,
    pumpDetailsY
  );

  doc.text(
    `Owner / Authority: ${ownerName}`,
    margin,
    pumpDetailsY + 6
  );

  doc.text(
    `Contact: ${phone}`,
    margin + 92,
    pumpDetailsY + 6
  );

  doc.text(
    `Address: ${pumpAddress}`,
    margin,
    pumpDetailsY + 12
  );

  /*
    ============================================================
    CUSTOMER DETAILS
    ============================================================
  */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.text(
    "CUSTOMER DETAILS",
    margin,
    91
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    `Customer Name: ${
      customer?.name || "-"
    }`,
    margin,
    97
  );

  doc.text(
    `Phone: ${
      customer?.phone || "-"
    }`,
    margin + 92,
    97
  );

  doc.text(
    `Vehicle Number: ${
      customer?.vehicleNumber || "-"
    }`,
    margin,
    103
  );

  doc.text(
    `Customer ID: ${
      customer?._id || "-"
    }`,
    margin + 92,
    103
  );

  doc.text(
    `Address: ${
      customer?.address || "-"
    }`,
    margin,
    109
  );

  /*
    ============================================================
    LEDGER SUMMARY
    ============================================================
  */

  const totalPurchased =
    Number(
      summary?.totalPurchased || 0
    );

  const totalPaid =
    Number(
      summary?.totalPaid || 0
    );

  const totalPending =
    Number(
      summary?.totalPending || 0
    );

  const purchaseCount =
    Number(
      summary?.purchaseCount || 0
    );

  const summaryY = 119;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.text(
    "LEDGER SUMMARY",
    margin,
    summaryY
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    `Total Transactions: ${entries.length}`,
    margin,
    summaryY + 7
  );

  doc.text(
    `Total Purchases: ${purchaseCount}`,
    margin + 92,
    summaryY + 7
  );

  doc.text(
    `Total Amount: Rs. ${formatMoney(
      totalPurchased
    )}`,
    margin,
    summaryY + 14
  );

  doc.text(
    `Total Paid: Rs. ${formatMoney(
      totalPaid
    )}`,
    margin + 92,
    summaryY + 14
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.text(
    `Total Pending: Rs. ${formatMoney(
      totalPending
    )}`,
    margin,
    summaryY + 21
  );

  /*
    ============================================================
    TRANSACTION HISTORY
    ============================================================
  */

  const tableRows = entries.map(
    (entry, index) => {
      const isPurchase =
        entry.entryType ===
        "purchase";

      const isPayment =
        entry.entryType ===
        "payment";

      const fuel =
        isPurchase
          ? String(
              entry.fuelType || ""
            ).toLowerCase() ===
            "petrol"
            ? "Petrol"
            : "Diesel"
          : "-";

      const total =
        isPurchase
          ? `Rs. ${formatMoney(
              entry.totalAmount
            )}`
          : "-";

      const paid =
        isPurchase
          ? `Rs. ${formatMoney(
              entry.paidAmount
            )}`
          : "-";

      const pending =
        isPurchase
          ? `Rs. ${formatMoney(
              entry.pendingAmount
            )}`
          : "-";

      const payment =
        isPayment
          ? `Rs. ${formatMoney(
              entry.paymentAmount
            )}`
          : "-";

      return [
        index + 1,
        formatDate(
          entry.entryDate
        ),
        isPurchase
          ? "Purchase"
          : "Payment",
        fuel,
        total,
        paid,
        pending,
        payment,
        entry.note || "-",
      ];
    }
  );

  const tableStartY =
    summaryY + 29;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(10);

  doc.text(
    "TRANSACTION HISTORY",
    margin,
    tableStartY
  );

  autoTable(doc, {
    startY: tableStartY + 4,

    head: [
      [
        "#",
        "Date",
        "Type",
        "Fuel",
        "Total",
        "Paid",
        "Pending",
        "Payment",
        "Note",
      ],
    ],

    body:
      tableRows.length > 0
        ? tableRows
        : [
            [
              "-",
              "-",
              "No transactions",
              "-",
              "-",
              "-",
              "-",
              "-",
              "-",
            ],
          ],

    margin: {
      left: margin,
      right: margin,
    },

    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 2.5,
      overflow: "linebreak",
      valign: "middle",
    },

    headStyles: {
      fontStyle: "bold",
      halign: "center",
    },

    bodyStyles: {
      fontStyle: "normal",
    },

    columnStyles: {
      0: {
        cellWidth: 8,
        halign: "center",
      },

      1: {
        cellWidth: 19,
      },

      2: {
        cellWidth: 19,
      },

      3: {
        cellWidth: 16,
      },

      4: {
        cellWidth: 23,
        halign: "right",
      },

      5: {
        cellWidth: 23,
        halign: "right",
      },

      6: {
        cellWidth: 23,
        halign: "right",
      },

      7: {
        cellWidth: 23,
        halign: "right",
      },

      8: {
        cellWidth: "auto",
      },
    },

    didDrawPage: () => {
      /*
        Footer on every page
      */

      const footerY =
        pageHeight - 10;

      doc.setFontSize(7);

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.text(
        `Pump: ${pumpName} | Pump ID: ${pumpId}`,
        margin,
        footerY
      );

      doc.text(
        `Page ${
          doc.internal.getNumberOfPages()
        }`,
        pageWidth - margin,
        footerY,
        {
          align: "right",
        }
      );
    },
  });

  /*
    ============================================================
    FINAL AUTHORITY SECTION
    ============================================================
  */

  let finalY =
    doc.lastAutoTable?.finalY ||
    tableStartY + 45;

  /*
    If there isn't enough room on the
    current page, create a new page.
  */

  if (
    finalY >
    pageHeight - 75
  ) {
    doc.addPage();

    finalY = 25;
  } else {
    finalY += 12;
  }

  /*
    Summary box
  */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(10);

  doc.text(
    "CURRENT PENDING BALANCE",
    margin,
    finalY
  );

  doc.setFontSize(13);

  doc.text(
    `Rs. ${formatMoney(
      totalPending
    )}`,
    margin,
    finalY + 8
  );

  /*
    Authority section
  */

  const authorityX =
    pageWidth - 75;

  const signatureY =
    finalY + 7;

  doc.setFontSize(9);

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.text(
    "AUTHORITY",
    authorityX,
    finalY,
    {
      align: "center",
    }
  );

  doc.setLineWidth(0.4);

  doc.line(
    authorityX - 32,
    signatureY + 17,
    authorityX + 32,
    signatureY + 17
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8);

  doc.text(
    "Authorized Signature",
    authorityX,
    signatureY + 23,
    {
      align: "center",
    }
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.text(
    `Name: ${ownerName}`,
    authorityX,
    signatureY + 29,
    {
      align: "center",
    }
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    `Designation: ${designation}`,
    authorityX,
    signatureY + 35,
    {
      align: "center",
    }
  );

  /*
    ============================================================
    FINAL FOOTER
    ============================================================
  */

  const generatedY =
    pageHeight - 28;

  doc.setLineWidth(0.3);

  doc.line(
    margin,
    generatedY - 5,
    pageWidth - margin,
    generatedY - 5
  );

  doc.setFontSize(7.5);

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    `Generated on: ${formatDateTime()}`,
    margin,
    generatedY
  );

  doc.text(
    `Pump: ${pumpName} | Pump ID: ${pumpId}`,
    margin,
    generatedY + 5
  );

  doc.text(
    "This is a computer-generated customer ledger statement.",
    pageWidth / 2,
    generatedY + 11,
    {
      align: "center",
    }
  );

  /*
    ============================================================
    FILE NAME
    ============================================================
  */

  const safeCustomerName =
    String(
      customer?.name ||
        "Customer"
    )
      .trim()
      .replace(
        /[^a-zA-Z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  const safePumpName =
    String(
      pumpName ||
        "Petrol-Pump"
    )
      .trim()
      .replace(
        /[^a-zA-Z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  const fileName =
    `${safePumpName}-${safeCustomerName}-Ledger.pdf`;

  /*
    ============================================================
    DOWNLOAD
    ============================================================
  */

  doc.save(fileName);
};

export default generateCustomerLedgerPDF;pageYOffset