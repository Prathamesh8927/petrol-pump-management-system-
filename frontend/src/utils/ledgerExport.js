import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/* =====================================================
   HELPERS
===================================================== */

const money = (value) =>
  Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date =
    new Date(`${value}T00:00:00`);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN"
  );
};

const cleanFileName = (value) =>
  String(value || "ledger")
    .replace(
      /[^a-z0-9_-]/gi,
      "_"
    )
    .replace(/_+/g, "_");

/* =====================================================
   PDF
===================================================== */

export const exportLedgerPDF = ({
  customer,
  pump,
}) => {
  if (!customer) {
    return;
  }

  const doc =
    new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

  const pageWidth =
    doc.internal.pageSize.getWidth();

  let y = 15;

  /* HEADER */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(18);

  doc.text(
    String(
      pump.pumpName ||
        "My Petrol Pump"
    ).toUpperCase(),
    pageWidth / 2,
    y,
    {
      align: "center",
    }
  );

  y += 7;

  if (pump.companyName) {
    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(10);

    doc.text(
      pump.companyName,
      pageWidth / 2,
      y,
      {
        align: "center",
      }
    );

    y += 5;
  }

  const location =
    [
      pump.address,
      pump.city,
      pump.state,
      pump.pincode,
    ]
      .filter(Boolean)
      .join(", ");

  if (location) {
    doc.setFontSize(9);

    doc.text(
      location,
      pageWidth / 2,
      y,
      {
        align: "center",
      }
    );

    y += 5;
  }

  if (pump.dealerCode) {
    doc.text(
      `Dealer Code: ${pump.dealerCode}`,
      pageWidth / 2,
      y,
      {
        align: "center",
      }
    );

    y += 6;
  }

  doc.line(
    14,
    y,
    pageWidth - 14,
    y
  );

  y += 9;

  /* TITLE */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(14);

  doc.text(
    "CUSTOMER LEDGER",
    pageWidth / 2,
    y,
    {
      align: "center",
    }
  );

  y += 9;

  /* CUSTOMER INFO */

  doc.setFontSize(10);

  doc.text(
    `Customer: ${customer.name || "-"}`,
    14,
    y
  );

  doc.text(
    `Date: ${formatDate(
      customer.purchaseDate
    )}`,
    pageWidth - 14,
    y,
    {
      align: "right",
    }
  );

  y += 6;

  if (customer.phone) {
    doc.text(
      `Mobile: ${customer.phone}`,
      14,
      y
    );

    y += 5;
  }

  if (
    customer.vehicleNumber
  ) {
    doc.text(
      `Vehicle No.: ${customer.vehicleNumber}`,
      14,
      y
    );

    y += 5;
  }

  /* DETAILS TABLE */

  autoTable(doc, {
    startY: y + 4,

    head: [
      [
        "Fuel Type",
        "Purchase Date",
        "Total Amount",
        "Paid Amount",
        "Pending Amount",
        "Payment",
      ],
    ],

    body: [
      [
        customer.fuelType ===
        "petrol"
          ? "Petrol"
          : "Diesel",

        formatDate(
          customer.purchaseDate
        ),

        `Rs. ${money(
          customer.totalAmount
        )}`,

        `Rs. ${money(
          customer.paidAmount
        )}`,

        `Rs. ${money(
          customer.currentBalance
        )}`,

        Number(
          customer.currentBalance ||
            0
        ) <= 0
          ? "Paid"
          : Number(
              customer.paidAmount ||
                0
            ) > 0
          ? "Partially Paid"
          : "Pending",
      ],
    ],

    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
  });

  let footerY =
    doc.lastAutoTable
      ?.finalY + 25;

  if (
    customer.note
  ) {
    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.text(
      "Remarks:",
      14,
      footerY
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.text(
      customer.note,
      35,
      footerY
    );

    footerY += 15;
  }

  if (footerY > 245) {
    doc.addPage();
    footerY = 215;
  }

  /* SIGNATORY */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.text(
    `For ${String(
      pump.pumpName ||
        "My Petrol Pump"
    ).toUpperCase()}`,
    pageWidth - 14,
    footerY,
    {
      align: "right",
    }
  );

  footerY += 18;

  doc.text(
    pump.ownerName ||
      "Pump Owner",
    pageWidth - 14,
    footerY,
    {
      align: "right",
    }
  );

  footerY += 5;

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    "(Authorized Signatory)",
    pageWidth - 14,
    footerY,
    {
      align: "right",
    }
  );

  doc.save(
    `${cleanFileName(
      `${pump.pumpName}_${customer.name}_Ledger`
    )}.pdf`
  );
};

/* =====================================================
   EXCEL
===================================================== */

export const exportLedgerExcel = ({
  customer,
  pump,
}) => {
  if (!customer) {
    return;
  }

  const rows = [
    [
      String(
        pump.pumpName ||
          "My Petrol Pump"
      ).toUpperCase(),
    ],

    pump.companyName
      ? [pump.companyName]
      : [],

    [
      "Customer Ledger",
    ],

    [
      "Date",
      formatDate(
        customer.purchaseDate
      ),
    ],

    [],

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

    [
      "Fuel Type",
      customer.fuelType ===
      "petrol"
        ? "Petrol"
        : "Diesel",
    ],

    [
      "Total Amount",
      Number(
        customer.totalAmount ||
          0
      ),
    ],

    [
      "Paid Amount",
      Number(
        customer.paidAmount ||
          0
      ),
    ],

    [
      "Pending Amount",
      Number(
        customer.currentBalance ||
          0
      ),
    ],

    [
      "Payment",
      Number(
        customer.currentBalance ||
          0
      ) <= 0
        ? "Paid"
        : Number(
            customer.paidAmount ||
              0
          ) > 0
        ? "Partially Paid"
        : "Pending",
    ],

    [
      "Remarks",
      customer.note || "",
    ],

    [],

    [
      `For ${String(
        pump.pumpName ||
          "My Petrol Pump"
      ).toUpperCase()}`,
    ],

    [
      "Owner",
      pump.ownerName ||
        "Pump Owner",
    ],

    [
      "Authorized Signatory",
    ],
  ];

  const workbook =
    XLSX.utils.book_new();

  const sheet =
    XLSX.utils.aoa_to_sheet(
      rows
    );

  sheet["!cols"] = [
    {
      wch: 24,
    },

    {
      wch: 28,
    },
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    "Ledger"
  );

  XLSX.writeFile(
    workbook,
    `${cleanFileName(
      `${pump.pumpName}_${customer.name}_Ledger`
    )}.xlsx`
  );
};

/* =====================================================
   CSV
===================================================== */

export const exportLedgerCSV = ({
  customer,
  pump,
}) => {
  if (!customer) {
    return;
  }

  const rows = [
    [
      String(
        pump.pumpName ||
          "My Petrol Pump"
      ).toUpperCase(),
    ],

    [
      "Customer Ledger",
    ],

    [
      "Date",
      formatDate(
        customer.purchaseDate
      ),
    ],

    [],

    [
      "Customer",
      customer.name || "",
    ],

    [
      "Fuel Type",
      customer.fuelType ||
        "",
    ],

    [
      "Total Amount",
      customer.totalAmount ||
        0,
    ],

    [
      "Paid Amount",
      customer.paidAmount ||
        0,
    ],

    [
      "Pending Amount",
      customer.currentBalance ||
        0,
    ],

    [
      "Remarks",
      customer.note || "",
    ],

    [],

    [
      "Owner",
      pump.ownerName ||
        "Pump Owner",
    ],
  ];

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
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;

  link.download =
    `${cleanFileName(
      `${pump.pumpName}_${customer.name}_Ledger`
    )}.csv`;

  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  URL.revokeObjectURL(
    url
  );
};

/* =====================================================
   PRINT
===================================================== */

export const printLedger = ({
  customer,
  pump,
}) => {
  if (!customer) {
    return;
  }

  const payment =
    Number(
      customer.currentBalance ||
        0
    ) <= 0
      ? "Paid"
      : Number(
          customer.paidAmount ||
            0
        ) > 0
      ? "Partially Paid"
      : "Pending";

  const location =
    [
      pump.address,
      pump.city,
      pump.state,
      pump.pincode,
    ]
      .filter(Boolean)
      .join(", ");

  const printWindow =
    window.open(
      "",
      "_blank"
    );

  if (!printWindow) {
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>

    <html>

    <head>

      <title>
        ${customer.name} Ledger
      </title>

      <style>

        @page {
          size: A4;
          margin: 15mm;
        }

        body {
          font-family: Arial, sans-serif;
          color: #222;
          margin: 0;
        }

        .header {
          text-align: center;
          border-bottom: 1px solid #ddd;
          padding-bottom: 16px;
        }

        .header h1 {
          margin: 0;
          font-size: 25px;
        }

        .header p {
          margin: 5px 0 0;
          font-size: 13px;
        }

        .title {
          text-align: center;
          margin: 20px 0;
        }

        .customer {
          display: flex;
          justify-content: space-between;
          margin-bottom: 18px;
          font-size: 13px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          border: 1px solid #ddd;
          padding: 10px;
          font-size: 12px;
          text-align: left;
        }

        th {
          background: #f5f5f5;
        }

        .remarks {
          margin-top: 20px;
        }

        .signature {
          margin-top: 55px;
          text-align: right;
          font-size: 13px;
        }

        .signature-space {
          height: 35px;
        }

      </style>

    </head>

    <body>

      <div class="header">

        <h1>
          ${String(
            pump.pumpName ||
              "My Petrol Pump"
          ).toUpperCase()}
        </h1>

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

        ${
          pump.dealerCode
            ? `<p>Dealer Code: ${pump.dealerCode}</p>`
            : ""
        }

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

          ${
            customer.name ||
            "-"
          }

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
            Date:
          </strong>

          ${formatDate(
            customer.purchaseDate
          )}

        </div>

      </div>

      <table>

        <thead>

          <tr>
            <th>
              Fuel Type
            </th>

            <th>
              Purchase Date
            </th>

            <th>
              Total Amount
            </th>

            <th>
              Paid Amount
            </th>

            <th>
              Pending Amount
            </th>

            <th>
              Payment
            </th>
          </tr>

        </thead>

        <tbody>

          <tr>

            <td>
              ${
                customer.fuelType ===
                "petrol"
                  ? "Petrol"
                  : "Diesel"
              }
            </td>

            <td>
              ${formatDate(
                customer.purchaseDate
              )}
            </td>

            <td>
              ₹ ${money(
                customer.totalAmount
              )}
            </td>

            <td>
              ₹ ${money(
                customer.paidAmount
              )}
            </td>

            <td>
              ₹ ${money(
                customer.currentBalance
              )}
            </td>

            <td>
              ${payment}
            </td>

          </tr>

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
          For ${String(
            pump.pumpName ||
              "My Petrol Pump"
          ).toUpperCase()}
        </strong>

        <div class="signature-space">
        </div>

        <strong>
          ${
            pump.ownerName ||
            "Pump Owner"
          }
        </strong>

        <br />

        (Authorized Signatory)

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