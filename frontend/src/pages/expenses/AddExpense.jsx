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
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
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

    if (!isValidDate(expenseForm.expenseDate)) {
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

    const salary = Number(
      employeeForm.salary
    );

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

    try {
      setEmployeeLoading(true);

      await addEmployee({
        name,
        phone,
        designation,
        salary,
        joiningDate:
          employeeForm.joiningDate,
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
      <div className="page-header">
        <div>
          <h1>Expenses</h1>

          <p>
            Manage pump expenses and
            employees.
          </p>
        </div>
      </div>

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

      {activeSection === "employees" && (
        <div className="content-panel">
          <div className="content-panel-header">
            <div>
              <h2>Employees</h2>

              <p>
                Manage employees and
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
                      colSpan="7"
                      className="empty-table"
                    >
                      Loading employees...
                    </td>
                  </tr>
                ) : employees.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="7"
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
                  Add new pump employee.
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

                  <input
                    id="employee-designation"
                    type="text"
                    name="designation"
                    value={
                      employeeForm.designation
                    }
                    onChange={
                      handleEmployeeChange
                    }
                    placeholder="Staff / Manager"
                    maxLength={100}
                  />
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