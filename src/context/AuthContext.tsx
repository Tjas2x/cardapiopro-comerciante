import React, { createContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { api, setAuthToken } from "../services/api";

type AuthContextData = {
  user: any;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
};

export const AuthContext = createContext<AuthContextData>(
  {} as AuthContextData
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorage() {
      try {
        const token = await AsyncStorage.getItem("@token");
        const storedUser = await AsyncStorage.getItem("@user");

        if (token && storedUser) {
          const cleanToken = String(token || "").trim();

          // ✅ único lugar que seta token
          setAuthToken(cleanToken);

          setUser(JSON.parse(storedUser));
        } else {
          setAuthToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    }

    loadStorage();
  }, []);

  async function signIn(email: string, password: string) {
    const response = await api.post("/auth/login", { email, password });
    const { token, user } = response.data;

    const cleanToken = String(token || "").trim();

    await AsyncStorage.setItem("@token", cleanToken);
    await AsyncStorage.setItem("@user", JSON.stringify(user));

    // ✅ seta token imediatamente no axios
    setAuthToken(cleanToken);

    setUser(user);
  }

  async function signOut() {
    await AsyncStorage.multiRemove(["@token", "@user"]);

    // ✅ remove token do axios
    setAuthToken(null);

    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
