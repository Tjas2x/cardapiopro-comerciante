import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { notifySubscriptionExpired } from "./subscriptionBlock";

export const api = axios.create({
  baseURL: "https://cardapiopro-backend.onrender.com",
  timeout: 30000, // upload + mobile
});

const TOKEN_KEY = "@token";

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

// ✅ GARANTE TOKEN EM TODA REQUISIÇÃO
api.interceptors.request.use(async (config) => {
  try {
    // se já existe header, não mexe
    if (config.headers?.Authorization) return config;

    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const cleanToken = String(token || "").trim();

    if (cleanToken) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${cleanToken}`;
    }
  } catch {
    // ignora
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 402) {
      notifySubscriptionExpired();
    }

    return Promise.reject(error);
  }
);
