import {
  useEffect,
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
} from "lucide-react";

import {
  addExpense,
  getEmployees,
  addEmployee,
  deleteEmployee,
  paySalary,
} from "../../services/expenseService";

const AddExpense = () => {
  const today =
    new Date().toLocaleDateString(
      "en-CA"
    );

  const [
    activeSection,
    setActiveSection,
  ] = useState("expense");

  /* =====================================
     EXPENSE FORM
  ===================================== */

  const [
    expenseForm,
    setExpenseForm,
  ] = useState({
    title: "",
    category: "miscellaneous",
    amount: "",
    paymentMethod: "cash",
    expenseDate: today,
    note: "",
  });

  const [
    expenseLoading,
    setExpenseLoading,
  ] = useState(false);

  /* =====================================
     EMPLOYEE
  ===================================== */

  const [
    employees,
    setEmployees,
  ] = useState([]);

  const [
    employeeLoading,
    setEmployeeLoading,
  ] = useState(false);

  const [
    showEmployeeModal,
    setShowEmployeeModal,
  ] = useState(false);

  const [
    employeeForm,
    setEmployeeForm,
  ] = useState({
    name: "",
    phone: "",
    designation: "",
    salary: "",
    joiningDate: today,
  });

  /* =====================================
     LOAD EMPLOYEES
  ===================================== */

  const loadEmployees =
    async () => {
      try {
        const data =
          await getEmployees();

        setEmployees(
          data.employees || []
        );
      } catch (error) {
        console.error(
          "LOAD EMPLOYEE ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load employees"
        );
      }
    };

  useEffect(() => {
    loadEmployees();
  }, []);

  /* =====================================
     EXPENSE INPUT
  ===================================== */

  const handleExpenseChange =
    (e) => {
      const {
        name,
        value,
      } = e.target;

      setExpenseForm(
        (prev) => ({
          ...prev,
          [name]: value,
        })
      );
    };

  /* =====================================
     ADD EXPENSE
  ===================================== */

  const handleExpenseSubmit =
    async (e) => {
      e.preventDefault();

      try {
        setExpenseLoading(true);

        await addExpense({
          ...expenseForm,

          amount: Number(
            expenseForm.amount
          ),
        });

        toast.success(
          "Expense added successfully"
        );

        setExpenseForm({
          title: "",
          category:
            "miscellaneous",
          amount: "",
          paymentMethod:
            "cash",
          expenseDate:
            today,
          note: "",
        });
      } catch (error) {
        console.error(
          "ADD EXPENSE ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to add expense"
        );
      } finally {
        setExpenseLoading(false);
      }
    };

  /* =====================================
     EMPLOYEE INPUT
  ===================================== */

  const handleEmployeeChange =
    (e) => {
      const {
        name,
        value,
      } = e.target;

      setEmployeeForm(
        (prev) => ({
          ...prev,
          [name]: value,
        })
      );
    };

  /* =====================================
     ADD EMPLOYEE
  ===================================== */

  const handleAddEmployee =
    async (e) => {
      e.preventDefault();

      try {
        setEmployeeLoading(true);

        await addEmployee({
          ...employeeForm,

          salary: Number(
            employeeForm.salary
          ),
        });

        toast.success(
          "Employee added successfully"
        );

        setEmployeeForm({
          name: "",
          phone: "",
          designation: "",
          salary: "",
          joiningDate: today,
        });

        setShowEmployeeModal(
          false
        );

        await loadEmployees();
      } catch (error) {
        console.error(
          "ADD EMPLOYEE ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to add employee"
        );
      } finally {
        setEmployeeLoading(false);
      }
    };

  /* =====================================
     DELETE EMPLOYEE
  ===================================== */

  const handleDeleteEmployee =
    async (id) => {
      const confirmed =
        window.confirm(
          "Delete this employee?"
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteEmployee(id);

        toast.success(
          "Employee deleted"
        );

        await loadEmployees();
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to delete employee"
        );
      }
    };

  /* =====================================
     PAY SALARY
  ===================================== */

  const handlePaySalary =
    async (employee) => {
      const confirmed =
        window.confirm(
          `Pay ₹${Number(
            employee.salary || 0
          ).toLocaleString(
            "en-IN"
          )} salary to ${employee.name}?`
        );

      if (!confirmed) {
        return;
      }

      try {
        await paySalary(
          employee._id,
          {
            paymentDate: today,
            paymentMethod:
              "cash",
            amount:
              employee.salary,
          }
        );

        toast.success(
          `Salary paid to ${employee.name}`
        );
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to pay salary"
        );
      }
    };

  return (
    <div className="page-container">

      {/* HEADER */}

      <div className="page-header">

        <div>
          <h1>
            Expenses
          </h1>

          <p>
            Manage pump expenses
            and employees.
          </p>
        </div>

      </div>

      {/* TOP TABS */}

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
        }}
      >

        <button
          type="button"
          className={
            activeSection ===
            "expense"
              ? "primary-button"
              : "secondary-button"
          }
          onClick={() =>
            setActiveSection(
              "expense"
            )
          }
        >
          <Wallet size={17} />
          Add Expense
        </button>

        <button
          type="button"
          className={
            activeSection ===
            "employees"
              ? "primary-button"
              : "secondary-button"
          }
          onClick={() =>
            setActiveSection(
              "employees"
            )
          }
        >
          <Users size={17} />
          Employees
        </button>

      </div>

      {/* =====================================
          ADD EXPENSE SECTION
      ===================================== */}

      {activeSection ===
        "expense" && (

        <div className="content-panel">

          <div className="content-panel-header">
            <h2>
              Add New Expense
            </h2>
          </div>

          <div className="content-panel-body">

            <form
              className="clean-form"
              onSubmit={
                handleExpenseSubmit
              }
            >

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Expense Title
                  </label>

                  <input
                    type="text"
                    name="title"
                    value={
                      expenseForm.title
                    }
                    onChange={
                      handleExpenseChange
                    }
                    placeholder="Example: Electricity Bill"
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    Category
                  </label>

                  <select
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

                  <label>
                    Amount
                  </label>

                  <input
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

                  <label>
                    Payment Method
                  </label>

                  <select
                    name="paymentMethod"
                    value={
                      expenseForm.paymentMethod
                    }
                    onChange={
                      handleExpenseChange
                    }
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

                  <label>
                    Expense Date
                  </label>

                  <input
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

                  <label>
                    Note
                  </label>

                  <input
                    type="text"
                    name="note"
                    value={
                      expenseForm.note
                    }
                    onChange={
                      handleExpenseChange
                    }
                    placeholder="Optional"
                  />

                </div>

              </div>

              <button
                type="submit"
                className="primary-button"
                disabled={
                  expenseLoading
                }
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

      {activeSection ===
        "employees" && (

        <div className="content-panel">

          <div className="content-panel-header">

            <div>
              <h2>
                Employees
              </h2>

              <p>
                Manage employees
                and salary details.
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                setShowEmployeeModal(
                  true
                )
              }
            >
              <Plus size={17} />
              Add Employee
            </button>

          </div>

          <div className="table-container">

            <table>

              <thead>
                <tr>
                  <th>Name</th>
                  <th>
                    Designation
                  </th>
                  <th>Phone</th>
                  <th>Salary</th>
                  <th>
                    Joining Date
                  </th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {employees.length ===
                0 ? (

                  <tr>
                    <td
                      colSpan="7"
                      className="empty-table"
                    >
                      No employees
                      added yet.
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
                          ₹
                          {Number(
                            employee.salary ||
                              0
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </td>

                        <td>
                          {
                            employee.joiningDate
                          }
                        </td>

                        <td>
                          <span
                            className={`status-badge ${employee.status}`}
                          >
                            {
                              employee.status
                            }
                          </span>
                        </td>

                        <td>

                          <div className="row-actions">

                            <button
                              type="button"
                              className="action-view"
                              title="Pay Salary"
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
                              title="Delete"
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

        <div className="modal-backdrop">

          <div className="stock-edit-modal">

            <div className="stock-edit-modal-header">

              <div>
                <h2>
                  Add Employee
                </h2>

                <p>
                  Add new pump
                  employee.
                </p>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={() =>
                  setShowEmployeeModal(
                    false
                  )
                }
              >
                <X size={20} />
              </button>

            </div>

            <form
              onSubmit={
                handleAddEmployee
              }
            >

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Employee Name
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={
                      employeeForm.name
                    }
                    onChange={
                      handleEmployeeChange
                    }
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    Phone
                  </label>

                  <input
                    type="text"
                    name="phone"
                    value={
                      employeeForm.phone
                    }
                    onChange={
                      handleEmployeeChange
                    }
                  />

                </div>

              </div>

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Designation
                  </label>

                  <input
                    type="text"
                    name="designation"
                    value={
                      employeeForm.designation
                    }
                    onChange={
                      handleEmployeeChange
                    }
                    placeholder="Staff / Manager"
                  />

                </div>

                <div className="form-group">

                  <label>
                    Monthly Salary
                  </label>

                  <input
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

                <label>
                  Joining Date
                </label>

                <input
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
                  onClick={() =>
                    setShowEmployeeModal(
                      false
                    )
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