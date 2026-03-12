import API from "./api";

export const sendLike = async (userId, likedUserId) => {
  const response = await API.post("/like", {
    user_id: userId,
    liked_user_id: likedUserId,
  });

  return response.data;
};