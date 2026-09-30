import api from "./api";

/* =====================================
   EXPENSE
===================================== */

export const addExpense = async (data) => {
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

export const deleteExpense = async (id) => {
  if (!id) {
    throw new Error(
      "Expense ID is required."
    );
  }

  const response = await api.delete(
    `/expenses/${id}`
  );

  return response.data;
};

/* =====================================
   EMPLOYEES
===================================== */

export const getEmployees = async () => {
  const response = await api.get(
    "/expenses/employees"
  );

  return response.data;
};

export const addEmployee = async (data) => {
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

  const response = await api.patch(
    `/expenses/employees/${id}`,
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
    `/expenses/employees/${id}`
  );

  return response.data;
};

export const paySalary = async (
  id,
  data
) => {
  if (!id) {
    throw new Error(
      "Employee ID is required."
    );
  }

  const response = await api.post(
    `/expenses/employees/${id}/pay-salary`,
    data
  );

  return response.data;
};