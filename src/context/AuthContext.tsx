import React, { createContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import { setMemoryToken } from "../services/token";

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

          setMemoryToken(cleanToken);
          api.defaults.headers.common["Authorization"] = `Bearer ${cleanToken}`;

          setUser(JSON.parse(storedUser));
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

    // ✅ garante token disponível imediatamente (evita race condition)
    setMemoryToken(cleanToken);

    await AsyncStorage.setItem("@token", cleanToken);
    await AsyncStorage.setItem("@user", JSON.stringify(user));

    api.defaults.headers.common["Authorization"] = `Bearer ${cleanToken}`;
    setUser(user);
  }

  async function signOut() {
    setMemoryToken(null);
    await AsyncStorage.multiRemove(["@token", "@user"]);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
