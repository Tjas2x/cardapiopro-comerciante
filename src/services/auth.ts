import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setAuthToken } from "./api";

export async function login(email: string, password: string) {
  const res = await api.post("/auth/login", { email, password });
  const token: string = res.data.token;

  await AsyncStorage.setItem("@token", token);
  setAuthToken(token);

  return res.data;
}

export async function logout() {
  await AsyncStorage.removeItem("@token");
  setAuthToken(null);
}
