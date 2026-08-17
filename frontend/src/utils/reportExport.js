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

const number = (value) =>
  Number(value || 0).toFixed(2);

const cleanFileName = (value) =>
  String(value || "report")
    .replace(
      /[^a-z0-9_-]/gi,
      "_"
    )
    .replace(/_+/g, "_");

/* =====================================================
   DATE FORMAT
===================================================== */

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
    "en-IN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
};

/* =====================================================
   REPORT DATE
===================================================== */

const getReportDate = (
  report
) => {
  if (!report) {
    return "-";
  }

  if (
    report.from &&
    report.to &&
    report.from === report.to
  ) {
    return formatDate(
      report.from
    );
  }

  if (
    report.from &&
    report.to
  ) {
    return `${formatDate(
      report.from
    )} - ${formatDate(
      report.to
    )}`;
  }

  return "-";
};

/* =====================================================
   SUMMARY
===================================================== */

const getSummaryRows = (
  report
) => {
  const summary =
    report?.summary || {};

  return [
    [
      "Total Sales",
      `Rs. ${money(
        summary.totalSales
      )}`,
    ],

    [
      "Total Expenses",
      `Rs. ${money(
        summary.totalExpenses
      )}`,
    ],

    [
      "Net Amount",
      `Rs. ${money(
        summary.netAmount
      )}`,
    ],

    [
      "Petrol Sold",
      `${number(
        summary.petrolLitresSold
      )} L`,
    ],

    [
      "Diesel Sold",
      `${number(
        summary.dieselLitresSold
      )} L`,
    ],

    [
      "Petrol Sales Amount",
      `Rs. ${money(
        summary.petrolSalesAmount
      )}`,
    ],

    [
      "Diesel Sales Amount",
      `Rs. ${money(
        summary.dieselSalesAmount
      )}`,
    ],

    [
      "Cash Collection",
      `Rs. ${money(
        summary.cashSales
      )}`,
    ],

    [
      "UPI Collection",
      `Rs. ${money(
        summary.upiSales
      )}`,
    ],

    [
      "Card Collection",
      `Rs. ${money(
        summary.cardSales
      )}`,
    ],

    [
      "Credit Sales",
      `Rs. ${money(
        summary.creditSales
      )}`,
    ],

    [
      "Total Fuel Purchased",
      `${number(
        summary.totalFuelPurchased
      )} L`,
    ],

    [
      "Fuel Purchase Cost",
      `Rs. ${money(
        summary.totalFuelPurchaseAmount
      )}`,
    ],

    [
      "Salary Expenses",
      `Rs. ${money(
        summary.salaryExpenses
      )}`,
    ],

    [
      "Pending Ledger",
      `Rs. ${money(
        summary.pendingLedger
      )}`,
    ],

    [
      "Current Petrol Stock",
      `${number(
        summary.currentPetrolStock
      )} L`,
    ],

    [
      "Current Diesel Stock",
      `${number(
        summary.currentDieselStock
      )} L`,
    ],
  ];
};

/* =====================================================
   CHECK REPORT DATE
===================================================== */

const validateReport = (
  report
) => {
  if (!report) {
    alert(
      "Please generate the report first."
    );

    return false;
  }

  if (
    !report.from ||
    !report.to
  ) {
    alert(
      "Report date is required before export."
    );

    return false;
  }

  return true;
};

/* =====================================================
   PDF HEADER
===================================================== */

const addPDFHeader = (
  doc,
  {
    title,
    pumpName,
    ownerName,
    companyName,
    dealerCode,
    address,
    city,
    state,
    pincode,
    report,
  }
) => {
  const pageWidth =
    doc.internal.pageSize.getWidth();

  let y = 14;

  /* PUMP NAME */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(18);

  doc.text(
    String(
      pumpName ||
        "My Petrol Pump"
    ).toUpperCase(),
    pageWidth / 2,
    y,
    {
      align: "center",
    }
  );

  y += 7;

  /* COMPANY */

  if (companyName) {
    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(10);

    doc.text(
      companyName,
      pageWidth / 2,
      y,
      {
        align: "center",
      }
    );

    y += 5;
  }

  /* ADDRESS */

  const addressLines = [];

  if (address) {
    addressLines.push(
      address
    );
  }

  const location =
    [
      city,
      state,
      pincode,
    ]
      .filter(Boolean)
      .join(", ");

  if (location) {
    addressLines.push(
      location
    );
  }

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(9);

  addressLines.forEach(
    (line) => {
      doc.text(
        line,
        pageWidth / 2,
        y,
        {
          align: "center",
        }
      );

      y += 4.5;
    }
  );

  if (dealerCode) {
    doc.text(
      `Dealer Code: ${dealerCode}`,
      pageWidth / 2,
      y,
      {
        align: "center",
      }
    );

    y += 5;
  }

  y += 2;

  /* LINE */

  doc.setDrawColor(
    210,
    210,
    210
  );

  doc.line(
    14,
    y,
    pageWidth - 14,
    y
  );

  y += 8;

  /* REPORT TITLE */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(14);

  doc.text(
    title ||
      "Business Report",
    pageWidth / 2,
    y,
    {
      align: "center",
    }
  );

  y += 9;

  /* DATE */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(10);

  doc.text(
    `Date / Period: ${getReportDate(
      report
    )}`,
    14,
    y
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    `Generated: ${new Date().toLocaleDateString(
      "en-IN"
    )}`,
    pageWidth - 14,
    y,
    {
      align: "right",
    }
  );

  y += 7;

  return y;
};

/* =====================================================
   PDF FOOTER / SIGNATORY
===================================================== */

const addPDFFooter = (
  doc,
  {
    pumpName,
    ownerName,
  }
) => {
  const pageWidth =
    doc.internal.pageSize.getWidth();

  let y =
    doc.lastAutoTable?.finalY
      ? doc.lastAutoTable.finalY +
        18
      : 250;

  /*
    Avoid printing footer
    outside the page.
  */

  if (y > 250) {
    doc.addPage();

    y = 210;
  }

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(10);

  doc.text(
    `For ${String(
      pumpName ||
        "My Petrol Pump"
    ).toUpperCase()}`,
    pageWidth - 14,
    y,
    {
      align: "right",
    }
  );

  y += 18;

  doc.setFontSize(10);

  doc.text(
    ownerName ||
      "Pump Owner",
    pageWidth - 14,
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

  doc.setFontSize(9);

  doc.text(
    "Pump Owner",
    pageWidth - 14,
    y,
    {
      align: "right",
    }
  );

  y += 5;

  doc.text(
    "(Authorized Signatory)",
    pageWidth - 14,
    y,
    {
      align: "right",
    }
  );
};

/* =====================================================
   EXPORT PDF
===================================================== */

export const exportReportPDF =
  ({
    report,

    title =
      "Business Report",

    pumpName =
      "My Petrol Pump",

    ownerName =
      "Pump Owner",

    companyName = "",

    dealerCode = "",

    address = "",

    city = "",

    state = "",

    pincode = "",
  }) => {
    if (
      !validateReport(
        report
      )
    ) {
      return;
    }

    const doc =
      new jsPDF({
        orientation:
          "portrait",

        unit: "mm",

        format: "a4",
      });

    let currentY =
      addPDFHeader(
        doc,
        {
          title,

          pumpName,

          ownerName,

          companyName,

          dealerCode,

          address,

          city,

          state,

          pincode,

          report,
        }
      );

    /* =================================
       SUMMARY
    ================================= */

    autoTable(doc, {
      startY:
        currentY,

      head: [
        [
          "Particular",
          "Value",
        ],
      ],

      body:
        getSummaryRows(
          report
        ),

      styles: {
        fontSize: 9,

        cellPadding: 3,
      },

      headStyles: {
        fontStyle:
          "bold",
      },
    });

    currentY =
      doc.lastAutoTable
        ?.finalY + 10;

    /* =================================
       SALES
    ================================= */

    if (
      report.sales?.length
    ) {
      if (
        currentY > 245
      ) {
        doc.addPage();

        currentY = 18;
      }

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(11);

      doc.text(
        "Sales Details",
        14,
        currentY
      );

      autoTable(doc, {
        startY:
          currentY + 4,

        head: [
          [
            "Date",
            "Fuel",
            "Quantity",
            "Rate",
            "Payment",
            "Amount",
          ],
        ],

        body:
          report.sales.map(
            (sale) => [
              formatDate(
                sale.businessDate
              ),

              String(
                sale.fuelType ||
                  "-"
              ).toUpperCase(),

              `${number(
                sale.litresSold
              )} L`,

              `Rs. ${money(
                sale.pricePerLitre ||
                  sale.rate
              )}`,

              String(
                sale.paymentMethod ||
                  "-"
              ).toUpperCase(),

              `Rs. ${money(
                sale.totalAmount
              )}`,
            ]
          ),

        styles: {
          fontSize: 8,
        },
      });

      currentY =
        doc.lastAutoTable
          ?.finalY + 10;
    }

    /* =================================
       EXPENSES
    ================================= */

    if (
      report.expenses
        ?.length
    ) {
      if (
        currentY > 245
      ) {
        doc.addPage();

        currentY = 18;
      }

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(11);

      doc.text(
        "Expense Details",
        14,
        currentY
      );

      autoTable(doc, {
        startY:
          currentY + 4,

        head: [
          [
            "Date",
            "Particular",
            "Category",
            "Payment",
            "Amount",
          ],
        ],

        body:
          report.expenses.map(
            (expense) => [
              formatDate(
                expense.expenseDate
              ),

              expense.title ||
                expense.description ||
                "-",

              expense.category ||
                "-",

              expense.paymentMethod ||
                "-",

              `Rs. ${money(
                expense.amount
              )}`,
            ]
          ),

        styles: {
          fontSize: 8,
        },
      });

      currentY =
        doc.lastAutoTable
          ?.finalY + 10;
    }

    /* =================================
       FUEL PURCHASES
    ================================= */

    if (
      report
        .fuelPurchases
        ?.length
    ) {
      if (
        currentY > 245
      ) {
        doc.addPage();

        currentY = 18;
      }

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(11);

      doc.text(
        "Fuel Purchase Details",
        14,
        currentY
      );

      autoTable(doc, {
        startY:
          currentY + 4,

        head: [
          [
            "Date",
            "Fuel",
            "Supplier",
            "Quantity",
            "Amount",
          ],
        ],

        body:
          report.fuelPurchases.map(
            (purchase) => [
              formatDate(
                purchase.purchaseDate
              ),

              String(
                purchase.fuelType ||
                  "-"
              ).toUpperCase(),

              purchase.supplierName ||
                purchase.supplier ||
                "-",

              `${number(
                purchase.quantity
              )} L`,

              `Rs. ${money(
                purchase.totalAmount
              )}`,
            ]
          ),

        styles: {
          fontSize: 8,
        },
      });

      currentY =
        doc.lastAutoTable
          ?.finalY + 10;
    }

    /* =================================
       LEDGER
    ================================= */

    if (
      report
        .ledgerEntries
        ?.length
    ) {
      if (
        currentY > 245
      ) {
        doc.addPage();

        currentY = 18;
      }

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(11);

      doc.text(
        "Ledger Details",
        14,
        currentY
      );

      autoTable(doc, {
        startY:
          currentY + 4,

        head: [
          [
            "Date",
            "Customer",
            "Transaction",
            "Fuel",
            "Amount",
          ],
        ],

        body:
          report.ledgerEntries.map(
            (entry) => [
              formatDate(
                entry.entryDate
              ),

              entry.customerId
                ?.name ||
                "-",

              entry.entryType ||
                "-",

              entry.fuelType ||
                "-",

              `Rs. ${money(
                entry.amount
              )}`,
            ]
          ),

        styles: {
          fontSize: 8,
        },
      });
    }

    /* =================================
       OWNER / SIGNATURE
    ================================= */

    addPDFFooter(
      doc,
      {
        pumpName,
        ownerName,
      }
    );

    const fileName =
      cleanFileName(
        `${pumpName}_${title}_${report.from}_${report.to}`
      );

    doc.save(
      `${fileName}.pdf`
    );
  };

/* =====================================================
   EXPORT EXCEL
===================================================== */

export const exportReportExcel =
  ({
    report,

    title =
      "Business Report",

    pumpName =
      "My Petrol Pump",

    ownerName =
      "Pump Owner",

    companyName = "",

    dealerCode = "",

    address = "",

    city = "",

    state = "",

    pincode = "",
  }) => {
    if (
      !validateReport(
        report
      )
    ) {
      return;
    }

    const workbook =
      XLSX.utils.book_new();

    const location =
      [
        address,
        city,
        state,
        pincode,
      ]
        .filter(Boolean)
        .join(", ");

    /* =================================
       SUMMARY SHEET
    ================================= */

    const summaryRows = [
      [
        String(
          pumpName
        ).toUpperCase(),
      ],

      companyName
        ? [companyName]
        : [],

      location
        ? [location]
        : [],

      dealerCode
        ? [
            "Dealer Code",
            dealerCode,
          ]
        : [],

      [],

      [title],

      [
        "Report Date / Period",
        getReportDate(
          report
        ),
      ],

      [
        "Generated Date",
        new Date().toLocaleDateString(
          "en-IN"
        ),
      ],

      [],

      [
        "Particular",
        "Value",
      ],

      ...getSummaryRows(
        report
      ),

      [],

      [],

      [
        `For ${String(
          pumpName
        ).toUpperCase()}`,
      ],

      [
        "Owner Name",
        ownerName,
      ],

      [
        "Designation",
        "Pump Owner",
      ],

      [
        "Signature",
        "Authorized Signatory",
      ],
    ];

    const summarySheet =
      XLSX.utils.aoa_to_sheet(
        summaryRows
      );

    summarySheet[
      "!cols"
    ] = [
      {
        wch: 30,
      },

      {
        wch: 25,
      },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Summary"
    );

    /* =================================
       SALES
    ================================= */

    if (
      report.sales?.length
    ) {
      const rows =
        report.sales.map(
          (
            sale,
            index
          ) => ({
            "Sr. No.":
              index + 1,

            Date:
              formatDate(
                sale.businessDate
              ),

            Fuel:
              sale.fuelType,

            Quantity:
              Number(
                sale.litresSold ||
                  0
              ),

            Rate:
              Number(
                sale.pricePerLitre ||
                  sale.rate ||
                  0
              ),

            "Payment Method":
              sale.paymentMethod ||
              "",

            Amount:
              Number(
                sale.totalAmount ||
                  0
              ),
          })
        );

      XLSX.utils.book_append_sheet(
        workbook,

        XLSX.utils.json_to_sheet(
          rows
        ),

        "Sales"
      );
    }

    /* =================================
       EXPENSES
    ================================= */

    if (
      report.expenses
        ?.length
    ) {
      const rows =
        report.expenses.map(
          (
            expense,
            index
          ) => ({
            "Sr. No.":
              index + 1,

            Date:
              formatDate(
                expense.expenseDate
              ),

            Particular:
              expense.title ||
              expense.description ||
              "",

            Category:
              expense.category ||
              "",

            "Payment Method":
              expense.paymentMethod ||
              "",

            Amount:
              Number(
                expense.amount ||
                  0
              ),
          })
        );

      XLSX.utils.book_append_sheet(
        workbook,

        XLSX.utils.json_to_sheet(
          rows
        ),

        "Expenses"
      );
    }

    /* =================================
       FUEL PURCHASES
    ================================= */

    if (
      report
        .fuelPurchases
        ?.length
    ) {
      const rows =
        report.fuelPurchases.map(
          (
            purchase,
            index
          ) => ({
            "Sr. No.":
              index + 1,

            Date:
              formatDate(
                purchase.purchaseDate
              ),

            Fuel:
              purchase.fuelType,

            Supplier:
              purchase.supplierName ||
              purchase.supplier ||
              "",

            Quantity:
              Number(
                purchase.quantity ||
                  0
              ),

            Amount:
              Number(
                purchase.totalAmount ||
                  0
              ),
          })
        );

      XLSX.utils.book_append_sheet(
        workbook,

        XLSX.utils.json_to_sheet(
          rows
        ),

        "Fuel Purchases"
      );
    }

    /* =================================
       LEDGER
    ================================= */

    if (
      report
        .ledgerEntries
        ?.length
    ) {
      const rows =
        report.ledgerEntries.map(
          (
            entry,
            index
          ) => ({
            "Sr. No.":
              index + 1,

            Date:
              formatDate(
                entry.entryDate
              ),

            Customer:
              entry.customerId
                ?.name ||
              "",

            Transaction:
              entry.entryType ||
              "",

            Fuel:
              entry.fuelType ||
              "",

            Amount:
              Number(
                entry.amount ||
                  0
              ),
          })
        );

      XLSX.utils.book_append_sheet(
        workbook,

        XLSX.utils.json_to_sheet(
          rows
        ),

        "Ledger"
      );
    }

    XLSX.writeFile(
      workbook,

      `${cleanFileName(
        `${pumpName}_${title}_${report.from}_${report.to}`
      )}.xlsx`
    );
  };

/* =====================================================
   EXPORT CSV
===================================================== */

export const exportReportCSV =
  ({
    report,

    title =
      "Business Report",

    pumpName =
      "My Petrol Pump",

    ownerName =
      "Pump Owner",

    companyName = "",

    dealerCode = "",

    address = "",

    city = "",

    state = "",

    pincode = "",
  }) => {
    if (
      !validateReport(
        report
      )
    ) {
      return;
    }

    const location =
      [
        address,
        city,
        state,
        pincode,
      ]
        .filter(Boolean)
        .join(", ");

    const rows = [
      [
        String(
          pumpName
        ).toUpperCase(),
      ],

      companyName
        ? [companyName]
        : [],

      location
        ? [location]
        : [],

      dealerCode
        ? [
            "Dealer Code",
            dealerCode,
          ]
        : [],

      [],

      [title],

      [
        "Report Date / Period",
        getReportDate(
          report
        ),
      ],

      [],

      [
        "Particular",
        "Value",
      ],

      ...getSummaryRows(
        report
      ),

      [],

      [
        `For ${String(
          pumpName
        ).toUpperCase()}`,
      ],

      [
        "Owner Name",
        ownerName,
      ],

      [
        "Authorized Signatory",
      ],
    ];

    const worksheet =
      XLSX.utils.aoa_to_sheet(
        rows
      );

    const csv =
      XLSX.utils.sheet_to_csv(
        worksheet
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
        `${pumpName}_${title}_${report.from}_${report.to}`
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

export const printReport =
  ({
    report,

    title =
      "Business Report",

    pumpName =
      "My Petrol Pump",

    ownerName =
      "Pump Owner",

    companyName = "",

    dealerCode = "",

    address = "",

    city = "",

    state = "",

    pincode = "",
  }) => {
    if (
      !validateReport(
        report
      )
    ) {
      return;
    }

    const summaryRows =
      getSummaryRows(
        report
      )
        .map(
          ([name, value]) => `
          <tr>
            <td>${name}</td>
            <td>${value}</td>
          </tr>
        `
        )
        .join("");

    const location =
      [
        address,
        city,
        state,
        pincode,
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

        <title>${title}</title>

        <style>

          @page {
            size: A4;
            margin: 15mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family:
              Arial,
              sans-serif;
            color: #222;
          }

          .business-header {
            text-align: center;
            padding-bottom: 16px;
            border-bottom:
              1px solid #ddd;
          }

          .business-header h1 {
            margin: 0;
            font-size: 25px;
            font-weight: 700;
          }

          .business-header p {
            margin:
              5px 0 0;
            font-size: 13px;
          }

          .report-title {
            text-align: center;
            margin-top: 20px;
          }

          .report-title h2 {
            margin: 0;
            font-size: 18px;
          }

          .date-row {
            display: flex;
            justify-content:
              space-between;
            margin:
              20px 0 12px;
            font-size: 13px;
            font-weight: 600;
          }

          table {
            width: 100%;
            border-collapse:
              collapse;
            margin-top: 10px;
          }

          th,
          td {
            border:
              1px solid #ddd;
            padding: 9px;
            text-align: left;
            font-size: 12px;
          }

          th {
            background: #f5f5f5;
          }

          .signature {
            margin-top: 50px;
            text-align: right;
            font-size: 13px;
          }

          .signature strong {
            display: block;
            margin-bottom: 40px;
          }

          .signature .owner {
            font-weight: 700;
          }

        </style>

      </head>

      <body>

        <div class="business-header">

          <h1>
            ${String(
              pumpName
            ).toUpperCase()}
          </h1>

          ${
            companyName
              ? `<p>${companyName}</p>`
              : ""
          }

          ${
            location
              ? `<p>${location}</p>`
              : ""
          }

          ${
            dealerCode
              ? `<p>Dealer Code: ${dealerCode}</p>`
              : ""
          }

        </div>

        <div class="report-title">

          <h2>
            ${title}
          </h2>

        </div>

        <div class="date-row">

          <span>
            Date / Period:
            ${getReportDate(
              report
            )}
          </span>

          <span>
            Generated:
            ${new Date().toLocaleDateString(
              "en-IN"
            )}
          </span>

        </div>

        <table>

          <thead>

            <tr>
              <th>
                Particular
              </th>

              <th>
                Value
              </th>
            </tr>

          </thead>

          <tbody>
            ${summaryRows}
          </tbody>

        </table>

        <div class="signature">

          <strong>
            For ${String(
              pumpName
            ).toUpperCase()}
          </strong>

          <div class="owner">
            ${ownerName}
          </div>

          <div>
            Pump Owner
          </div>

          <div>
            (Authorized Signatory)
          </div>

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