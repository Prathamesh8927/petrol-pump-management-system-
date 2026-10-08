import api from "./api";

/* =====================================================
   EXPENSES
===================================================== */

export const addExpense = async (
  data
) => {
  if (!data || typeof data !== "object") {
    throw new Error(
      "Expense data is required."
    );
  }

  const response = await api.post(
    "/expenses",
    data
  );

  return response.data;
};

export const getExpenses = async (
  params = {}
) => {
  const response = await api.get(
    "/expenses",
    {
      params,
    }
  );

  return response.data;
};

export const deleteExpense = async (
  id
) => {
  if (!id) {
    throw new Error(
      "Expense ID is required."
    );
  }

  const response = await api.delete(
    `/expenses/${encodeURIComponent(id)}`
  );

  return response.data;
};

/* =====================================================
   EMPLOYEES
===================================================== */

export const getEmployees = async () => {
  const response = await api.get(
    "/expenses/employees"
  );

  return response.data;
};

export const addEmployee = async (
  data
) => {
  if (!data || typeof data !== "object") {
    throw new Error(
      "Employee data is required."
    );
  }

  const response = await api.post(
    "/expenses/employees",
    data
  );

  return response.data;
};

export const updateEmployee = async (
  id,
  data
) => {
  if (!id) {
    throw new Error(
      "Employee ID is required."
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error(
      "Employee update data is required."
    );
  }

  const response = await api.patch(
    `/expenses/employees/${encodeURIComponent(
      id
    )}`,
    data
  );

  return response.data;
};

export const deleteEmployee = async (
  id
) => {
  if (!id) {
    throw new Error(
      "Employee ID is required."
    );
  }

  const response = await api.delete(
    `/expenses/employees/${encodeURIComponent(
      id
    )}`
  );

  return response.data;
};

/* =====================================================
   PAY EMPLOYEE SALARY
===================================================== */

export const paySalary = async (
  id,
  data
) => {
  if (!id) {
    throw new Error(
      "Employee ID is required."
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error(
      "Salary payment data is required."
    );
  }

  const response = await api.post(
    `/expenses/employees/${encodeURIComponent(
      id
    )}/pay-salary`,
    data
  );

  return response.data;
};

/* =====================================================
   DEFAULT EXPORT
===================================================== */

export default {
  addExpense,
  getExpenses,
  deleteExpense,

  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,

  paySalary,
};