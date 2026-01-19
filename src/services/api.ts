import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMemoryToken } from "./token";

export const api = axios.create({
  baseURL: "https://cardapiopro-backend.onrender.com",
});

api.interceptors.request.use(async (config) => {
  const memToken = getMemoryToken();
  const diskToken = await AsyncStorage.getItem("@token");

  const token = String(memToken || diskToken || "").trim();

  config.headers = config.headers ?? {};

  // remove duplicatas de header
  delete (config.headers as any).authorization;
  delete (config.headers as any).Authorization;

  if (token) {
    (config.headers as any).Authorization = `Bearer ${token}`;
  }

  console.log("➡️ API REQUEST:", config.method?.toUpperCase(), config.url);
  console.log(
    "➡️ AUTH HEADER:",
    (config.headers as any).Authorization ? "OK" : "MISSING"
  );

  return config;
});
