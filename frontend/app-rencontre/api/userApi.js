import API from "./api";

export const createUser = async (data) => {
  const response = await API.post("/user", data);
  return response.data;
};