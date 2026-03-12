import API from "./api";

export const getProfiles = async (userId) => {
  const response = await API.get(`/profiles/${userId}`);
  return response.data.profiles;
};