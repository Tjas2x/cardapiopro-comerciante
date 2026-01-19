import { api } from "./api";

export async function getMyRestaurant() {
  const res = await api.get("/merchant/restaurants/me");
  return res.data;
}
