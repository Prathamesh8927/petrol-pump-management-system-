import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  Plus,
  Trash2,
  IndianRupee,
  Users,
  Wallet,
  X,
  RefreshCw,
} from "lucide-react";

import {
  addExpense,
  getEmployees,
  addEmployee,
  deleteEmployee,
  paySalary,
} from "../../services/expenseService";

const getToday = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const isValidDate = (value) => {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] =
    value.split("-").map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

const isPositiveAmount = (value) => {
  const amount = Number(value);

  return (
    Number.isFinite(amount) &&
    amount > 0
  );
};

const isValidPhone = (value) => {
  if (!value?.trim()) {
    return true;
  }

  return /^[0-9+\-\s()]{7,20}$/.test(
    value.trim()
  );
};

/* =====================================
   SHIFT VALIDATION
===================================== */

const isValidTime = (value) => {
  if (!value) {
    return false;
  }

  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(
    value
  );
};

const formatTime = (value) => {
  if (!isValidTime(value)) {
    return value || "-";
  }

  const [hours, minutes] =
    value.split(":").map(Number);

  const period =
    hours >= 12 ? "PM" : "AM";

  const displayHour =
    hours % 12 || 12;

  return `${String(
    displayHour
  ).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")} ${period}`;
};

const formatMoney = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const AddExpense = () => {
  const today = getToday();

  const mountedRef = useRef(true);
  const loadingEmployeesRef = useRef(false);

  const [activeSection, setActiveSection] =
    useState("expense");

  const [expenseForm, setExpenseForm] =
    useState({
      title: "",
      category: "miscellaneous",
      amount: "",
      paymentMethod: "cash",
      expenseDate: today,
      note: "",
    });

  const [expenseLoading, setExpenseLoading] =
    useState(false);

  const [employees, setEmployees] =
    useState([]);

  const [employeeLoading, setEmployeeLoading] =
    useState(false);

  const [employeesLoading, setEmployeesLoading] =
    useState(false);

  const [
    deletingEmployeeId,
    setDeletingEmployeeId,
  ] = useState(null);

  const [
    payingEmployeeId,
    setPayingEmployeeId,
  ] = useState(null);

  const [
    showEmployeeModal,
    setShowEmployeeModal,
  ] = useState(false);

  const [employeeForm, setEmployeeForm] =
    useState({
      name: "",
      phone: "",
      designation: "",
      salary: "",
      joiningDate: today,

      /* ==========================
         SHIFT
      ========================== */

      shiftName: "",
      shiftStartTime: "",
      shiftEndTime: "",
    });

  const resetExpenseForm = useCallback(() => {
    setExpenseForm({
      title: "",
      category: "miscellaneous",
      amount: "",
      paymentMethod: "cash",
      expenseDate: getToday(),
      note: "",
    });
  }, []);

  const resetEmployeeForm = useCallback(() => {
    setEmployeeForm({
      name: "",
      phone: "",
      designation: "",
      salary: "",
      joiningDate: getToday(),

      shiftName: "",
      shiftStartTime: "",
      shiftEndTime: "",
    });
  }, []);

  const loadEmployees = useCallback(
    async ({ silent = false } = {}) => {
      if (loadingEmployeesRef.current) {
        return;
      }

      loadingEmployeesRef.current = true;

      if (!silent && mountedRef.current) {
        setEmployeesLoading(true);
      }

      try {
        const data = await getEmployees();

        if (!mountedRef.current) {
          return;
        }

        setEmployees(
          Array.isArray(data?.employees)
            ? data.employees
            : []
        );
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        toast.error(
          error.response?.data?.message ||
            "Unable to load employees"
        );
      } finally {
        loadingEmployeesRef.current = false;

        if (mountedRef.current) {
          setEmployeesLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;

    loadEmployees();

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible"
      ) {
        loadEmployees({ silent: true });
      }
    };

    const handleFocus = () => {
      loadEmployees({ silent: true });
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      mountedRef.current = false;

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [loadEmployees]);

  /* =====================================
     EXPENSE
  ===================================== */

  const handleExpenseChange = (event) => {
    const { name, value } = event.target;

    setExpenseForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleExpenseSubmit = async (
    event
  ) => {
    event.preventDefault();

    const title =
      expenseForm.title.trim();

    const note =
      expenseForm.note.trim();

    const amount = Number(
      expenseForm.amount
    );

    if (!title) {
      toast.error(
        "Expense title is required."
      );
      return;
    }

    if (title.length > 150) {
      toast.error(
        "Expense title must be 150 characters or less."
      );
      return;
    }

    if (!isPositiveAmount(amount)) {
      toast.error(
        "Enter a valid expense amount."
      );
      return;
    }

    if (
      !isValidDate(
        expenseForm.expenseDate
      )
    ) {
      toast.error(
        "Enter a valid expense date."
      );
      return;
    }

    if (note.length > 500) {
      toast.error(
        "Note must be 500 characters or less."
      );
      return;
    }

    try {
      setExpenseLoading(true);

      await addExpense({
        ...expenseForm,
        title,
        note,
        amount,
      });

      if (!mountedRef.current) {
        return;
      }

      toast.success(
        "Expense added successfully."
      );

      resetExpenseForm();
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      toast.error(
        error.response?.data?.message ||
          "Unable to add expense."
      );
    } finally {
      if (mountedRef.current) {
        setExpenseLoading(false);
      }
    }
  };

  /* =====================================
     EMPLOYEE
  ===================================== */

  const handleEmployeeChange = (event) => {
    const { name, value } = event.target;

    setEmployeeForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleAddEmployee = async (
    event
  ) => {
    event.preventDefault();

    const name =
      employeeForm.name.trim();

    const phone =
      employeeForm.phone.trim();

    const designation =
      employeeForm.designation.trim();

    const shiftName =
      employeeForm.shiftName.trim();

    const salary = Number(
      employeeForm.salary
    );

    const shiftStartTime =
      employeeForm.shiftStartTime;

    const shiftEndTime =
      employeeForm.shiftEndTime;

    /* ==========================
       BASIC VALIDATION
    ========================== */

    if (!name) {
      toast.error(
        "Employee name is required."
      );
      return;
    }

    if (name.length > 100) {
      toast.error(
        "Employee name must be 100 characters or less."
      );
      return;
    }

    if (!isValidPhone(phone)) {
      toast.error(
        "Enter a valid employee phone number."
      );
      return;
    }

    if (designation.length > 100) {
      toast.error(
        "Designation must be 100 characters or less."
      );
      return;
    }

    if (
      !Number.isFinite(salary) ||
      salary < 0
    ) {
      toast.error(
        "Enter a valid salary."
      );
      return;
    }

    if (
      !isValidDate(
        employeeForm.joiningDate
      )
    ) {
      toast.error(
        "Enter a valid joining date."
      );
      return;
    }

    /* ==========================
       SHIFT VALIDATION
    ========================== */

    if (shiftName.length > 100) {
      toast.error(
        "Shift name must be 100 characters or less."
      );
      return;
    }

    const hasShiftName =
      Boolean(shiftName);

    const hasStartTime =
      Boolean(shiftStartTime);

    const hasEndTime =
      Boolean(shiftEndTime);

    /*
     * Either all shift information
     * should be provided or none.
     */

    if (
      hasShiftName ||
      hasStartTime ||
      hasEndTime
    ) {
      if (!hasShiftName) {
        toast.error(
          "Shift name is required."
        );
        return;
      }

      if (!hasStartTime) {
        toast.error(
          "Shift start time is required."
        );
        return;
      }

      if (!hasEndTime) {
        toast.error(
          "Shift end time is required."
        );
        return;
      }

      if (!isValidTime(shiftStartTime)) {
        toast.error(
          "Enter a valid shift start time."
        );
        return;
      }

      if (!isValidTime(shiftEndTime)) {
        toast.error(
          "Enter a valid shift end time."
        );
        return;
      }
    }

    try {
      setEmployeeLoading(true);

      await addEmployee({
        name,
        phone,
        designation,
        salary,
        joiningDate:
          employeeForm.joiningDate,

        shiftName,
        shiftStartTime,
        shiftEndTime,
      });

      if (!mountedRef.current) {
        return;
      }

      toast.success(
        "Employee added successfully."
      );

      resetEmployeeForm();
      setShowEmployeeModal(false);

      await loadEmployees();
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      toast.error(
        error.response?.data?.message ||
          "Unable to add employee."
      );
    } finally {
      if (mountedRef.current) {
        setEmployeeLoading(false);
      }
    }
  };

  /* =====================================
     DELETE EMPLOYEE
  ===================================== */

  const handleDeleteEmployee = async (
    id
  ) => {
    if (!id || deletingEmployeeId) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this employee? The employee can be recovered during the configured recovery period."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingEmployeeId(id);

      await deleteEmployee(id);

      if (!mountedRef.current) {
        return;
      }

      toast.success(
        "Employee deleted and moved to recovery storage."
      );

      await loadEmployees();
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      toast.error(
        error.response?.data?.message ||
          "Unable to delete employee."
      );
    } finally {
      if (mountedRef.current) {
        setDeletingEmployeeId(null);
      }
    }
  };

  /* =====================================
     PAY SALARY
  ===================================== */

  const handlePaySalary = async (
    employee
  ) => {
    if (
      !employee?._id ||
      payingEmployeeId
    ) {
      return;
    }

    const amount = Number(
      employee.salary
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      toast.error(
        "Employee salary is not valid."
      );
      return;
    }

    const confirmed = window.confirm(
      `Pay ${formatMoney(
        amount
      )} salary to ${employee.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setPayingEmployeeId(
        employee._id
      );

      await paySalary(
        employee._id,
        {
          paymentDate: getToday(),
          paymentMethod: "cash",
          amount,
        }
      );

      if (!mountedRef.current) {
        return;
      }

      toast.success(
        `Salary paid to ${employee.name}.`
      );
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      toast.error(
        error.response?.data?.message ||
          "Unable to pay salary."
      );
    } finally {
      if (mountedRef.current) {
        setPayingEmployeeId(null);
      }
    }
  };

  const closeEmployeeModal = () => {
    if (employeeLoading) {
      return;
    }

    resetEmployeeForm();
    setShowEmployeeModal(false);
  };

  return (
    <div className="page-container">
      {/* =====================================
          PAGE HEADER
      ===================================== */}

      <div className="page-header">
        <div>
          <h1>Expenses</h1>

          <p>
            Manage pump expenses and
            employees.
          </p>
        </div>
      </div>

      {/* =====================================
          SECTION SWITCH
      ===================================== */}

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          className={
            activeSection === "expense"
              ? "primary-button"
              : "secondary-button"
          }
          onClick={() =>
            setActiveSection("expense")
          }
        >
          <Wallet size={17} />
          Add Expense
        </button>

        <button
          type="button"
          className={
            activeSection === "employees"
              ? "primary-button"
              : "secondary-button"
          }
          onClick={() =>
            setActiveSection("employees")
          }
        >
          <Users size={17} />
          Employees
        </button>
      </div>

      {/* =====================================
          EXPENSE SECTION
      ===================================== */}

      {activeSection === "expense" && (
        <div className="content-panel">
          <div className="content-panel-header">
            <h2>Add New Expense</h2>
          </div>

          <div className="content-panel-body">
            <form
              className="clean-form"
              onSubmit={
                handleExpenseSubmit
              }
              noValidate
            >
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expense-title">
                    Expense Title
                  </label>

                  <input
                    id="expense-title"
                    type="text"
                    name="title"
                    value={
                      expenseForm.title
                    }
                    onChange={
                      handleExpenseChange
                    }
                    placeholder="Example: Electricity Bill"
                    maxLength={150}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="expense-category">
                    Category
                  </label>

                  <select
                    id="expense-category"
                    name="category"
                    value={
                      expenseForm.category
                    }
                    onChange={
                      handleExpenseChange
                    }
                    required
                  >
                    <option value="salary">
                      Salary
                    </option>

                    <option value="electricity">
                      Electricity
                    </option>

                    <option value="maintenance">
                      Maintenance
                    </option>

                    <option value="transport">
                      Transport
                    </option>

                    <option value="office">
                      Office
                    </option>

                    <option value="food">
                      Food
                    </option>

                    <option value="repair">
                      Repair
                    </option>

                    <option value="miscellaneous">
                      Miscellaneous
                    </option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expense-amount">
                    Amount
                  </label>

                  <input
                    id="expense-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    name="amount"
                    value={
                      expenseForm.amount
                    }
                    onChange={
                      handleExpenseChange
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="expense-payment">
                    Payment Method
                  </label>

                  <select
                    id="expense-payment"
                    name="paymentMethod"
                    value={
                      expenseForm.paymentMethod
                    }
                    onChange={
                      handleExpenseChange
                    }
                    required
                  >
                    <option value="cash">
                      Cash
                    </option>

                    <option value="upi">
                      UPI
                    </option>

                    <option value="bank">
                      Bank
                    </option>

                    <option value="card">
                      Card
                    </option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expense-date">
                    Expense Date
                  </label>

                  <input
                    id="expense-date"
                    type="date"
                    name="expenseDate"
                    value={
                      expenseForm.expenseDate
                    }
                    onChange={
                      handleExpenseChange
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="expense-note">
                    Note
                  </label>

                  <input
                    id="expense-note"
                    type="text"
                    name="note"
                    value={
                      expenseForm.note
                    }
                    onChange={
                      handleExpenseChange
                    }
                    placeholder="Optional"
                    maxLength={500}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="primary-button"
                disabled={expenseLoading}
              >
                <Plus size={17} />

                {expenseLoading
                  ? "Saving..."
                  : "Add Expense"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================
          EMPLOYEE SECTION
      ===================================== */}

      {activeSection === "employees" && (
        <div className="content-panel">
          <div className="content-panel-header">
            <div>
              <h2>Employees</h2>

              <p>
                Manage employees, shifts and
                salary details.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  loadEmployees()
                }
                disabled={
                  employeesLoading
                }
              >
                <RefreshCw
                  size={16}
                />

                Refresh
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  setShowEmployeeModal(
                    true
                  )
                }
                disabled={
                  employeeLoading
                }
              >
                <Plus size={17} />
                Add Employee
              </button>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Phone</th>
                  <th>Shift</th>
                  <th>Shift Time</th>
                  <th>Salary</th>
                  <th>Joining Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {employeesLoading &&
                employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="empty-table"
                    >
                      Loading employees...
                    </td>
                  </tr>
                ) : employees.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="empty-table"
                    >
                      No employees added
                      yet.
                    </td>
                  </tr>
                ) : (
                  employees.map(
                    (employee) => (
                      <tr
                        key={
                          employee._id
                        }
                      >
                        <td>
                          <strong>
                            {
                              employee.name
                            }
                          </strong>
                        </td>

                        <td>
                          {employee.designation ||
                            "-"}
                        </td>

                        <td>
                          {employee.phone ||
                            "-"}
                        </td>

                        <td>
                          {employee.shiftName ||
                            "-"}
                        </td>

                        <td>
                          {employee.shiftStartTime &&
                          employee.shiftEndTime ? (
                            <span>
                              {formatTime(
                                employee.shiftStartTime
                              )}
                              {" → "}
                              {formatTime(
                                employee.shiftEndTime
                              )}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td>
                          {formatMoney(
                            employee.salary
                          )}
                        </td>

                        <td>
                          {employee.joiningDate
                            ? new Date(
                                employee.joiningDate
                              ).toLocaleDateString(
                                "en-IN"
                              )
                            : "-"}
                        </td>

                        <td>
                          <span
                            className={`status-badge ${
                              employee.status ||
                              "active"
                            }`}
                          >
                            {
                              employee.status ||
                              "active"
                            }
                          </span>
                        </td>

                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="action-view"
                              title="Pay Salary"
                              aria-label={`Pay salary to ${
                                employee.name
                              }`}
                              disabled={
                                payingEmployeeId ===
                                  employee._id ||
                                deletingEmployeeId ===
                                  employee._id
                              }
                              onClick={() =>
                                handlePaySalary(
                                  employee
                                )
                              }
                            >
                              <IndianRupee
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              className="action-delete"
                              title="Delete employee"
                              aria-label={`Delete ${
                                employee.name
                              }`}
                              disabled={
                                deletingEmployeeId ===
                                  employee._id ||
                                payingEmployeeId ===
                                  employee._id
                              }
                              onClick={() =>
                                handleDeleteEmployee(
                                  employee._id
                                )
                              }
                            >
                              <Trash2
                                size={16}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================
          ADD EMPLOYEE MODAL
      ===================================== */}

      {showEmployeeModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEmployeeModal();
            }
          }}
        >
          <div
            className="stock-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-employee-title"
          >
            <div className="stock-edit-modal-header">
              <div>
                <h2 id="add-employee-title">
                  Add Employee
                </h2>

                <p>
                  Add employee and assign
                  their working shift.
                </p>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={
                  closeEmployeeModal
                }
                disabled={employeeLoading}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleAddEmployee}
              noValidate
            >
              {/* ==========================
                  BASIC EMPLOYEE DETAILS
              ========================== */}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="employee-name">
                    Employee Name
                  </label>

                  <input
                    id="employee-name"
                    type="text"
                    name="name"
                    value={
                      employeeForm.name
                    }
                    onChange={
                      handleEmployeeChange
                    }
                    maxLength={100}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="employee-phone">
                    Phone
                  </label>

                  <input
                    id="employee-phone"
                    type="tel"
                    name="phone"
                    value={
                      employeeForm.phone
                    }
                    onChange={
                      handleEmployeeChange
                    }
                    maxLength={20}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="employee-designation">
                    Designation
                  </label>

                  <select
                    id="employee-designation"
                    name="designation"
                    value={
                      employeeForm.designation
                    }
                    onChange={
                      handleEmployeeChange
                    }
                  >
                    <option value="">
                      Select Designation
                    </option>

                    <option value="Manager">
                      Manager
                    </option>

                    <option value="Supervisor">
                      Supervisor
                    </option>

                    <option value="Nozzle Operator">
                      Nozzle Operator
                    </option>

                    <option value="Cashier">
                      Cashier
                    </option>

                    <option value="Accountant">
                      Accountant
                    </option>

                    <option value="Helper">
                      Helper
                    </option>

                    <option value="Cleaner">
                      Cleaner
                    </option>

                    <option value="Security">
                      Security
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="employee-salary">
                    Monthly Salary
                  </label>

                  <input
                    id="employee-salary"
                    type="number"
                    min="0"
                    step="0.01"
                    name="salary"
                    value={
                      employeeForm.salary
                    }
                    onChange={
                      handleEmployeeChange
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="employee-joining-date">
                  Joining Date
                </label>

                <input
                  id="employee-joining-date"
                  type="date"
                  name="joiningDate"
                  value={
                    employeeForm.joiningDate
                  }
                  onChange={
                    handleEmployeeChange
                  }
                  required
                />
              </div>

              {/* ==========================
                  SHIFT DETAILS
              ========================== */}

              <div
                style={{
                  marginTop: "18px",
                  marginBottom: "12px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                  }}
                >
                  Shift Details
                </h3>

                <p
                  style={{
                    margin:
                      "5px 0 0",
                    fontSize: "13px",
                    opacity: 0.75,
                  }}
                >
                  Assign the employee to
                  a shift and define its
                  working time.
                </p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="employee-shift-name">
                    Shift Name
                  </label>

                  <input
                    id="employee-shift-name"
                    type="text"
                    name="shiftName"
                    value={
                      employeeForm.shiftName
                    }
                    onChange={
                      handleEmployeeChange
                    }
                    placeholder="Morning Shift"
                    maxLength={100}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="employee-shift-start">
                    Start Time
                  </label>

                  <input
                    id="employee-shift-start"
                    type="time"
                    name="shiftStartTime"
                    value={
                      employeeForm.shiftStartTime
                    }
                    onChange={
                      handleEmployeeChange
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="employee-shift-end">
                    End Time
                  </label>

                  <input
                    id="employee-shift-end"
                    type="time"
                    name="shiftEndTime"
                    value={
                      employeeForm.shiftEndTime
                    }
                    onChange={
                      handleEmployeeChange
                    }
                  />
                </div>

                <div
                  className="form-group"
                  style={{
                    justifyContent:
                      "flex-end",
                  }}
                >
                  {employeeForm.shiftStartTime &&
                  employeeForm.shiftEndTime ? (
                    <div
                      style={{
                        padding:
                          "10px 12px",
                        borderRadius:
                          "8px",
                        background:
                          "rgba(0,0,0,0.04)",
                        fontSize:
                          "13px",
                      }}
                    >
                      <strong>
                        Shift Time:
                      </strong>{" "}
                      {formatTime(
                        employeeForm.shiftStartTime
                      )}{" "}
                      →{" "}
                      {formatTime(
                        employeeForm.shiftEndTime
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* ==========================
                  ACTIONS
              ========================== */}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeEmployeeModal
                  }
                  disabled={
                    employeeLoading
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    employeeLoading
                  }
                >
                  {employeeLoading
                    ? "Adding..."
                    : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddExpense;