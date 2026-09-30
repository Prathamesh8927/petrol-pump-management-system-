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

/*
 * Employee response includes:
 *
 * name
 * phone
 * designation
 * salary
 * joiningDate
 * status
 * note
 *
 * Shift details:
 * shiftName
 * shiftStartTime
 * shiftEndTime
 */

export const getEmployees = async () => {
  const response = await api.get(
    "/expenses/employees"
  );

  return response.data;
};

/*
 * Add employee.
 *
 * Example data:
 *
 * {
 *   name: "Rahul",
 *   phone: "9876543210",
 *   designation: "Nozzle Operator",
 *   salary: 18000,
 *   joiningDate: "2026-09-30",
 *   note: "",
 *
 *   shiftName: "Morning",
 *   shiftStartTime: "06:00",
 *   shiftEndTime: "14:00"
 * }
 */
export const addEmployee = async (
  data
) => {
  const response = await api.post(
    "/expenses/employees",
    data
  );

  return response.data;
};

/*
 * Update employee.
 *
 * Shift fields can also be updated:
 *
 * shiftName
 * shiftStartTime
 * shiftEndTime
 */
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

/* =====================================
   PAY EMPLOYEE SALARY
===================================== */

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