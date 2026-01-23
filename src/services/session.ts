import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthToken } from "./api";

export async function bootSession() {
  const token = await AsyncStorage.getItem("@token");
  setAuthToken(token);
  return token;
}
