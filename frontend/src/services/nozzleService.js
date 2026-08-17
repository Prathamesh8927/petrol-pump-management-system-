import api from "./api";

export const getNozzles =
  async () => {
    const response =
      await api.get(
        "/nozzles"
      );

    return response.data;
  };

export const addNozzle =
  async (data) => {
    const response =
      await api.post(
        "/nozzles",
        data
      );

    return response.data;
  };

export const updateNozzle =
  async (id, data) => {
    const response =
      await api.patch(
        `/nozzles/${id}`,
        data
      );

    return response.data;
  };

export const deleteNozzle =
  async (id) => {
    const response =
      await api.delete(
        `/nozzles/${id}`
      );

    return response.data;
  };

export const addNozzleReading =
  async (data) => {
    const response =
      await api.post(
        "/nozzles/readings",
        data
      );

    return response.data;
  };

export const getNozzleReadings =
  async () => {
    const response =
      await api.get(
        "/nozzles/readings"
      );

    return response.data;
  };

export const getReadingHistory =
  getNozzleReadings;