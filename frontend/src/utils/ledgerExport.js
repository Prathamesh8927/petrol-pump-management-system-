import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/* =====================================================
   HELPERS
===================================================== */

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) return "-";

  let date;

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    date = new Date(`${value}T00:00:00`);
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN");
};

const cleanFileName = (value) =>
  String(value || "ledger")
    .replace(/[^a-z0-9_-]/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const getPaymentStatus = (pending, paid) => {
  const pendingAmount = Number(pending || 0);
  const paidAmount = Number(paid || 0);

  if (pendingAmount <= 0) {
    return "Paid";
  }

  if (paidAmount > 0) {
    return "Partially Paid";
  }

  return "Pending";
};

const getFuelName = (fuelType) => {
  const value = String(fuelType || "").toLowerCase();

  if (value === "petrol") {
    return "Petrol";
  }

  if (value === "diesel") {
    return "Diesel";
  }

  return "-";
};

const getPumpId = (pump = {}) =>
  pump.pumpId ||
  pump._id ||
  pump.id ||
  pump.dealerCode ||
  "-";

const getEntries = (customer = {}) =>
  Array.isArray(customer.entries)
    ? customer.entries
    : Array.isArray(customer.history)
    ? customer.history
    : [];

/* =====================================================
   PDF
===================================================== */

export const exportLedgerPDF = ({
  customer,
  pump = {},
}) => {
  if (!customer) {
    return;
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

  const pumpName = String(
    pump.pumpName || "My Petrol Pump"
  ).toUpperCase();

  const ownerName =
    pump.ownerName || "Pump Owner";

  const companyName =
    pump.companyName || "";

  const pumpId =
    getPumpId(pump);

  const location = [
    pump.address,
    pump.city,
    pump.state,
    pump.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const entries =
    getEntries(customer);

  /* ===================================================
     CALCULATIONS
  =================================================== */

  let totalPurchased =
    Number(customer.totalAmount || 0);

  let totalPaid =
    Number(customer.paidAmount || 0);

  let totalPending =
    Number(customer.currentBalance || 0);

  if (entries.length > 0) {
    totalPurchased = 0;
    totalPaid = 0;
    totalPending = 0;

    entries.forEach((entry) => {
      const type = String(
        entry.entryType ||
          entry.type ||
          ""
      ).toLowerCase();

      if (type === "purchase") {
        totalPurchased += Number(
          entry.totalAmount || 0
        );

        totalPaid += Number(
          entry.paidAmount || 0
        );

        totalPending += Number(
          entry.pendingAmount || 0
        );
      }
    });

    let totalPayments = 0;

    entries.forEach((entry) => {
      const type = String(
        entry.entryType ||
          entry.type ||
          ""
      ).toLowerCase();

      if (type === "payment") {
        totalPayments += Number(
          entry.paymentAmount ||
            entry.amount ||
            0
        );
      }
    });

    totalPaid += totalPayments;

    totalPending = Math.max(
      totalPurchased - totalPaid,
      0
    );
  }

  const paymentStatus =
    getPaymentStatus(
      totalPending,
      totalPaid
    );

  /* ===================================================
     PAGE HEADER
  =================================================== */

  const drawPageHeader = (
    showTitle = true
  ) => {
    let headerY = 13;

    /* PUMP NAME */

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(17);

    doc.text(
      pumpName,
      pageWidth / 2,
      headerY,
      {
        align: "center",
      }
    );

    headerY += 6;

    /* OWNER NAME */

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(10);

    doc.text(
      `Owner: ${ownerName}`,
      pageWidth / 2,
      headerY,
      {
        align: "center",
      }
    );

    headerY += 5;

    /* COMPANY NAME */

    if (companyName) {
      doc.setFontSize(9);

      doc.text(
        companyName,
        pageWidth / 2,
        headerY,
        {
          align: "center",
        }
      );

      headerY += 4.5;
    }

    /* LOCATION */

    if (location) {
      doc.setFontSize(8);

      doc.text(
        location,
        pageWidth / 2,
        headerY,
        {
          align: "center",
        }
      );

      headerY += 4.5;
    }

    /* PUMP ID */

    doc.setFontSize(8);

    doc.text(
      `Pump ID: ${pumpId}`,
      pageWidth / 2,
      headerY,
      {
        align: "center",
      }
    );

    headerY += 5;

    doc.setDrawColor(
      190,
      190,
      190
    );

    doc.line(
      margin,
      headerY,
      pageWidth - margin,
      headerY
    );

    if (showTitle) {
      headerY += 9;

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(13);

      doc.text(
        "CUSTOMER LEDGER",
        pageWidth / 2,
        headerY,
        {
          align: "center",
        }
      );
    }

    return headerY;
  };

  let y =
    drawPageHeader(true);

  y += 9;

  /* ===================================================
     CUSTOMER INFORMATION
  =================================================== */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(10);

  doc.text(
    `Customer: ${
      customer.name || "-"
    }`,
    margin,
    y
  );

  const firstEntryDate =
    entries.length > 0
      ? entries[0]?.entryDate ||
        entries[0]?.date
      : customer.purchaseDate;

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    `Ledger Date: ${formatDate(
      firstEntryDate
    )}`,
    pageWidth - margin,
    y,
    {
      align: "right",
    }
  );

  y += 6;

  if (customer.phone) {
    doc.text(
      `Mobile: ${customer.phone}`,
      margin,
      y
    );
  }

  if (customer.vehicleNumber) {
    doc.text(
      `Vehicle No.: ${
        customer.vehicleNumber
      }`,
      pageWidth - margin,
      y,
      {
        align: "right",
      }
    );
  }

  y += 8;

  /* ===================================================
     SUMMARY
  =================================================== */

  autoTable(doc, {
    startY: y,

    head: [
      [
        "Total Purchases",
        "Total Paid",
        "Total Pending",
        "Transactions",
        "Status",
      ],
    ],

    body: [
      [
        `Rs. ${money(
          totalPurchased
        )}`,

        `Rs. ${money(
          totalPaid
        )}`,

        `Rs. ${money(
          totalPending
        )}`,

        String(entries.length),

        paymentStatus,
      ],
    ],

    theme: "grid",

    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      halign: "center",
      valign: "middle",
    },

    headStyles: {
      fontSize: 8,
      fontStyle: "bold",
      halign: "center",
    },

    bodyStyles: {
      fontStyle: "bold",
      halign: "center",
    },

    margin: {
      left: margin,
      right: margin,
    },
  });

  y =
    (doc.lastAutoTable?.finalY ||
      y) + 10;

  /* ===================================================
     TRANSACTION HISTORY
  =================================================== */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(11);

  doc.text(
    "TRANSACTION HISTORY",
    margin,
    y
  );

  y += 4;

  if (entries.length > 0) {
    const historyRows =
      entries.map(
        (entry, index) => {
          const type =
            String(
              entry.entryType ||
                entry.type ||
                ""
            ).toLowerCase();

          const isPurchase =
            type === "purchase";

          const isPayment =
            type === "payment";

          const total =
            isPurchase
              ? Number(
                  entry.totalAmount ||
                    0
                )
              : 0;

          const paid =
            isPurchase
              ? Number(
                  entry.paidAmount ||
                    0
                )
              : 0;

          const pending =
            isPurchase
              ? Number(
                  entry.pendingAmount ||
                    0
                )
              : 0;

          const payment =
            isPayment
              ? Number(
                  entry.paymentAmount ||
                    entry.amount ||
                    0
                )
              : 0;

          const date =
            entry.entryDate ||
            entry.date;

          return [
            String(index + 1),

            formatDate(date),

            isPurchase
              ? "Purchase"
              : isPayment
              ? "Payment"
              : "-",

            isPurchase
              ? getFuelName(
                  entry.fuelType
                )
              : "-",

            isPurchase
              ? `Rs. ${money(total)}`
              : "-",

            isPurchase
              ? `Rs. ${money(paid)}`
              : isPayment
              ? `Rs. ${money(payment)}`
              : "-",

            isPurchase
              ? `Rs. ${money(pending)}`
              : "-",

            entry.note || "-",
          ];
        }
      );

    autoTable(doc, {
      startY: y,

      head: [
        [
          "#",
          "Date",
          "Type",
          "Fuel",
          "Total",
          "Paid",
          "Pending",
          "Note",
        ],
      ],

      body: historyRows,

      theme: "grid",

      styles: {
        fontSize: 7.2,
        cellPadding: 2.5,
        overflow: "linebreak",
        valign: "middle",
      },

      headStyles: {
        fontSize: 7.2,
        fontStyle: "bold",
        halign: "center",
      },

      columnStyles: {
        0: {
          cellWidth: 8,
          halign: "center",
        },

        1: {
          cellWidth: 21,
        },

        2: {
          cellWidth: 20,
        },

        3: {
          cellWidth: 18,
        },

        4: {
          cellWidth: 25,
          halign: "right",
        },

        5: {
          cellWidth: 25,
          halign: "right",
        },

        6: {
          cellWidth: 25,
          halign: "right",
        },

        7: {
          cellWidth: "auto",
        },
      },

      margin: {
        left: margin,
        right: margin,
        bottom: 25,
      },

      pageBreak: "auto",

      showHead: "everyPage",

      didDrawPage: () => {
        if (
          doc.internal.getNumberOfPages() >
          1
        ) {
          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(9);

          doc.text(
            `${pumpName} - Customer Ledger`,
            margin,
            9
          );
        }
      },
    });

    y =
      (doc.lastAutoTable?.finalY ||
        y) + 9;
  } else {
    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.text(
      "No transaction history available.",
      margin,
      y + 5
    );

    y += 15;
  }

  /* ===================================================
     FINAL SUMMARY
  =================================================== */

  if (y > pageHeight - 75) {
    doc.addPage();

    y =
      drawPageHeader(false);

    y += 12;
  }

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(11);

  doc.text(
    "LEDGER SUMMARY",
    margin,
    y
  );

  y += 5;

  autoTable(doc, {
    startY: y,

    body: [
      [
        "Total Purchased",
        `Rs. ${money(
          totalPurchased
        )}`,
      ],

      [
        "Total Paid",
        `Rs. ${money(
          totalPaid
        )}`,
      ],

      [
        "Total Pending",
        `Rs. ${money(
          totalPending
        )}`,
      ],

      [
        "Payment Status",
        paymentStatus,
      ],
    ],

    theme: "grid",

    styles: {
      fontSize: 9,
      cellPadding: 3,
    },

    columnStyles: {
      0: {
        fontStyle: "bold",
        cellWidth: 55,
      },

      1: {
        halign: "right",
      },
    },

    margin: {
      left: margin,
      right: margin,
    },
  });

  y =
    (doc.lastAutoTable?.finalY ||
      y) + 9;

  /* ===================================================
     REMARKS
  =================================================== */

  if (customer.note) {
    if (y > pageHeight - 65) {
      doc.addPage();

      y =
        drawPageHeader(false);

      y += 10;
    }

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(9);

    doc.text(
      "Remarks:",
      margin,
      y
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    const remarkLines =
      doc.splitTextToSize(
        String(customer.note),
        pageWidth -
          margin * 2 -
          25
      );

    doc.text(
      remarkLines,
      margin + 25,
      y
    );

    y +=
      Math.max(
        remarkLines.length * 4.5,
        5
      ) + 8;
  }

  /* ===================================================
     SIGNATURE
  =================================================== */

  if (y > pageHeight - 55) {
    doc.addPage();

    y =
      drawPageHeader(false);

    y += 12;
  }

  const signatureX =
    pageWidth - margin;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(9);

  doc.text(
    `For ${pumpName}`,
    signatureX,
    y,
    {
      align: "right",
    }
  );

  y += 18;

  doc.setDrawColor(
    80,
    80,
    80
  );

  doc.line(
    signatureX - 48,
    y,
    signatureX,
    y
  );

  y += 6;

  doc.text(
    ownerName,
    signatureX,
    y,
    {
      align: "right",
    }
  );

  y += 5;

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    "(Authorized Signatory)",
    signatureX,
    y,
    {
      align: "right",
    }
  );

  /* ===================================================
     FOOTER ON ALL PAGES
  =================================================== */

  const totalPages =
    doc.internal.getNumberOfPages();

  for (
    let page = 1;
    page <= totalPages;
    page++
  ) {
    doc.setPage(page);

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(7);

    doc.setTextColor(
      100,
      100,
      100
    );

    doc.text(
      `Pump: ${pumpName}`,
      margin,
      pageHeight - 8
    );

    doc.text(
      `Owner: ${ownerName}`,
      pageWidth / 2,
      pageHeight - 8,
      {
        align: "center",
      }
    );

    doc.text(
      `Page ${page} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      {
        align: "right",
      }
    );
  }

  /* ===================================================
     SAVE
  =================================================== */

  doc.save(
    `${cleanFileName(
      `${pump.pumpName || "Pump"}_${
        customer.name || "Customer"
      }_Ledger`
    )}.pdf`
  );
};

/* =====================================================
   EXCEL
===================================================== */

export const exportLedgerExcel = ({
  customer,
  pump = {},
}) => {
  if (!customer) {
    return;
  }

  const entries =
    getEntries(customer);

  const rows = [
    [
      String(
        pump.pumpName ||
          "My Petrol Pump"
      ).toUpperCase(),
    ],

    [
      "Owner",
      pump.ownerName ||
        "Pump Owner",
    ],

    pump.companyName
      ? [pump.companyName]
      : [],

    [
      "Pump ID",
      getPumpId(pump),
    ],

    [
      "Customer Ledger",
    ],

    [
      "Customer Name",
      customer.name || "",
    ],

    [
      "Mobile Number",
      customer.phone || "",
    ],

    [
      "Vehicle Number",
      customer.vehicleNumber ||
        "",
    ],

    [],

    [
      "Total Purchased",
      Number(
        customer.totalAmount || 0
      ),
    ],

    [
      "Total Paid",
      Number(
        customer.paidAmount || 0
      ),
    ],

    [
      "Total Pending",
      Number(
        customer.currentBalance || 0
      ),
    ],

    [],

    [
      "#",
      "Date",
      "Type",
      "Fuel",
      "Total Amount",
      "Paid Amount",
      "Pending Amount",
      "Payment Amount",
      "Note",
    ],
  ];

  entries.forEach(
    (entry, index) => {
      const type =
        String(
          entry.entryType ||
            entry.type ||
            ""
        ).toLowerCase();

      const isPurchase =
        type === "purchase";

      const isPayment =
        type === "payment";

      rows.push([
        index + 1,

        formatDate(
          entry.entryDate ||
            entry.date
        ),

        isPurchase
          ? "Purchase"
          : isPayment
          ? "Payment"
          : "-",

        isPurchase
          ? getFuelName(
              entry.fuelType
            )
          : "-",

        isPurchase
          ? Number(
              entry.totalAmount || 0
            )
          : 0,

        isPurchase
          ? Number(
              entry.paidAmount || 0
            )
          : 0,

        isPurchase
          ? Number(
              entry.pendingAmount ||
                0
            )
          : 0,

        isPayment
          ? Number(
              entry.paymentAmount ||
                entry.amount ||
                0
            )
          : 0,

        entry.note || "",
      ]);
    }
  );

  rows.push(
    [],
    [
      `For ${String(
        pump.pumpName ||
          "My Petrol Pump"
      ).toUpperCase()}`,
    ],
    [
      "Authority",
      pump.ownerName ||
        "Pump Owner",
    ],
    [
      "Authorized Signatory",
    ]
  );

  const workbook =
    XLSX.utils.book_new();

  const sheet =
    XLSX.utils.aoa_to_sheet(
      rows
    );

  sheet["!cols"] = [
    { wch: 8 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 35 },
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    "Ledger"
  );

  XLSX.writeFile(
    workbook,
    `${cleanFileName(
      `${pump.pumpName || "Pump"}_${
        customer.name || "Customer"
      }_Ledger`
    )}.xlsx`
  );
};

/* =====================================================
   CSV
===================================================== */

export const exportLedgerCSV = ({
  customer,
  pump = {},
}) => {
  if (!customer) {
    return;
  }

  const entries =
    getEntries(customer);

  const rows = [
    [
      String(
        pump.pumpName ||
          "My Petrol Pump"
      ).toUpperCase(),
    ],

    [
      "Owner",
      pump.ownerName ||
        "Pump Owner",
    ],

    [
      "Pump ID",
      getPumpId(pump),
    ],

    [
      "Customer",
      customer.name || "",
    ],

    [
      "Mobile",
      customer.phone || "",
    ],

    [
      "Vehicle Number",
      customer.vehicleNumber ||
        "",
    ],

    [],

    [
      "#",
      "Date",
      "Type",
      "Fuel",
      "Total Amount",
      "Paid Amount",
      "Pending Amount",
      "Payment Amount",
      "Note",
    ],
  ];

  entries.forEach(
    (entry, index) => {
      const type =
        String(
          entry.entryType ||
            entry.type ||
            ""
        ).toLowerCase();

      const isPurchase =
        type === "purchase";

      const isPayment =
        type === "payment";

      rows.push([
        index + 1,

        formatDate(
          entry.entryDate ||
            entry.date
        ),

        isPurchase
          ? "Purchase"
          : isPayment
          ? "Payment"
          : "-",

        isPurchase
          ? getFuelName(
              entry.fuelType
            )
          : "-",

        isPurchase
          ? Number(
              entry.totalAmount || 0
            )
          : 0,

        isPurchase
          ? Number(
              entry.paidAmount || 0
            )
          : 0,

        isPurchase
          ? Number(
              entry.pendingAmount ||
                0
            )
          : 0,

        isPayment
          ? Number(
              entry.paymentAmount ||
                entry.amount ||
                0
            )
          : 0,

        entry.note || "",
      ]);
    }
  );

  rows.push(
    [],
    [
      "Authority",
      pump.ownerName ||
        "Pump Owner",
    ]
  );

  const sheet =
    XLSX.utils.aoa_to_sheet(
      rows
    );

  const csv =
    XLSX.utils.sheet_to_csv(
      sheet
    );

  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    `${cleanFileName(
      `${pump.pumpName || "Pump"}_${
        customer.name || "Customer"
      }_Ledger`
    )}.csv`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

/* =====================================================
   PRINT
===================================================== */

export const printLedger = ({
  customer,
  pump = {},
}) => {
  if (!customer) {
    return;
  }

  const entries =
    getEntries(customer);

  const totalPurchased =
    Number(
      customer.totalAmount || 0
    );

  const totalPaid =
    Number(
      customer.paidAmount || 0
    );

  const totalPending =
    Number(
      customer.currentBalance || 0
    );

  const payment =
    getPaymentStatus(
      totalPending,
      totalPaid
    );

  const location = [
    pump.address,
    pump.city,
    pump.state,
    pump.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const pumpName =
    String(
      pump.pumpName ||
        "My Petrol Pump"
    ).toUpperCase();

  const ownerName =
    pump.ownerName ||
    "Pump Owner";

  const printWindow =
    window.open(
      "",
      "_blank"
    );

  if (!printWindow) {
    return;
  }

  const historyRows =
    entries
      .map((entry, index) => {
        const type =
          String(
            entry.entryType ||
              entry.type ||
              ""
          ).toLowerCase();

        const isPurchase =
          type === "purchase";

        const isPayment =
          type === "payment";

        return `
          <tr>
            <td>${index + 1}</td>

            <td>
              ${formatDate(
                entry.entryDate ||
                  entry.date
              )}
            </td>

            <td>
              ${
                isPurchase
                  ? "Purchase"
                  : isPayment
                  ? "Payment"
                  : "-"
              }
            </td>

            <td>
              ${
                isPurchase
                  ? getFuelName(
                      entry.fuelType
                    )
                  : "-"
              }
            </td>

            <td>
              ${
                isPurchase
                  ? `₹ ${money(
                      entry.totalAmount
                    )}`
                  : "-"
              }
            </td>

            <td>
              ${
                isPurchase
                  ? `₹ ${money(
                      entry.paidAmount
                    )}`
                  : isPayment
                  ? `₹ ${money(
                      entry.paymentAmount ||
                        entry.amount
                    )}`
                  : "-"
              }
            </td>

            <td>
              ${
                isPurchase
                  ? `₹ ${money(
                      entry.pendingAmount
                    )}`
                  : "-"
              }
            </td>

            <td>
              ${entry.note || "-"}
            </td>
          </tr>
        `;
      })
      .join("");

  printWindow.document.write(`
    <!DOCTYPE html>

    <html>

    <head>

      <title>
        ${customer.name || "Customer"} Ledger
      </title>

      <style>

        @page {
          size: A4;
          margin: 12mm;
        }

        body {
          font-family: Arial, sans-serif;
          color: #222;
          margin: 0;
        }

        .header {
          text-align: center;
          border-bottom: 1px solid #ddd;
          padding-bottom: 12px;
        }

        .header h1 {
          margin: 0;
          font-size: 24px;
        }

        .header .owner {
          margin: 5px 0 0;
          font-size: 13px;
          font-weight: bold;
        }

        .header p {
          margin: 4px 0 0;
          font-size: 12px;
        }

        .title {
          text-align: center;
          margin: 18px 0;
        }

        .title h2 {
          margin: 0;
          font-size: 18px;
        }

        .customer {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
          font-size: 12px;
          line-height: 1.8;
        }

        .summary {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 18px;
        }

        .summary-box {
          border: 1px solid #ddd;
          padding: 9px;
          text-align: center;
        }

        .summary-box strong {
          display: block;
          font-size: 11px;
          margin-bottom: 4px;
        }

        .summary-box span {
          font-size: 13px;
          font-weight: bold;
        }

        .section-title {
          font-size: 14px;
          font-weight: bold;
          margin: 15px 0 8px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          border: 1px solid #ddd;
          padding: 7px;
          font-size: 10px;
          text-align: left;
        }

        th {
          background: #f5f5f5;
          font-weight: bold;
        }

        .remarks {
          margin-top: 18px;
          font-size: 12px;
        }

        .signature {
          margin-top: 55px;
          text-align: right;
          font-size: 12px;
        }

        .signature-line {
          display: inline-block;
          width: 160px;
          border-top: 1px solid #333;
          margin-top: 40px;
          padding-top: 6px;
        }

        .page-footer {
          margin-top: 25px;
          font-size: 9px;
          color: #777;
          display: flex;
          justify-content: space-between;
        }

        @media print {
          tr {
            page-break-inside: avoid;
          }

          thead {
            display: table-header-group;
          }
        }

      </style>

    </head>

    <body>

      <div class="header">

        <h1>
          ${pumpName}
        </h1>

        <p class="owner">
          Owner: ${ownerName}
        </p>

        ${
          pump.companyName
            ? `<p>${pump.companyName}</p>`
            : ""
        }

        ${
          location
            ? `<p>${location}</p>`
            : ""
        }

        <p>
          Pump ID: ${getPumpId(pump)}
        </p>

      </div>

      <div class="title">

        <h2>
          CUSTOMER LEDGER
        </h2>

      </div>

      <div class="customer">

        <div>

          <strong>
            Customer:
          </strong>

          ${customer.name || "-"}

          <br />

          ${
            customer.phone
              ? `
                <strong>
                  Mobile:
                </strong>
                ${customer.phone}
                <br />
              `
              : ""
          }

          ${
            customer.vehicleNumber
              ? `
                <strong>
                  Vehicle:
                </strong>
                ${customer.vehicleNumber}
              `
              : ""
          }

        </div>

        <div>

          <strong>
            Status:
          </strong>

          ${payment}

        </div>

      </div>

      <div class="summary">

        <div class="summary-box">

          <strong>
            Total Purchased
          </strong>

          <span>
            ₹ ${money(totalPurchased)}
          </span>

        </div>

        <div class="summary-box">

          <strong>
            Total Paid
          </strong>

          <span>
            ₹ ${money(totalPaid)}
          </span>

        </div>

        <div class="summary-box">

          <strong>
            Total Pending
          </strong>

          <span>
            ₹ ${money(totalPending)}
          </span>

        </div>

        <div class="summary-box">

          <strong>
            Transactions
          </strong>

          <span>
            ${entries.length}
          </span>

        </div>

      </div>

      <div class="section-title">
        TRANSACTION HISTORY
      </div>

      <table>

        <thead>

          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Type</th>
            <th>Fuel</th>
            <th>Total</th>
            <th>Paid / Payment</th>
            <th>Pending</th>
            <th>Note</th>
          </tr>

        </thead>

        <tbody>

          ${
            historyRows ||
            `
              <tr>
                <td colspan="8">
                  No transaction history available.
                </td>
              </tr>
            `
          }

        </tbody>

      </table>

      ${
        customer.note
          ? `
            <div class="remarks">
              <strong>
                Remarks:
              </strong>

              ${customer.note}
            </div>
          `
          : ""
      }

      <div class="signature">

        <strong>
          For ${pumpName}
        </strong>

        <br />

        <span class="signature-line">

          <strong>
            ${ownerName}
          </strong>

          <br />

          (Authorized Signatory)

        </span>

      </div>

      <div class="page-footer">

        <span>
          Pump: ${pumpName}
        </span>

        <span>
          Owner: ${ownerName}
        </span>

        <span>
          Customer Ledger
        </span>

      </div>

    </body>

    </html>
  `);

  printWindow.document.close();

  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 300);
};