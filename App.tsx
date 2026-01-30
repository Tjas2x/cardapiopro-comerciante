import React, { useContext, useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import OrdersScreen from "./src/screens/OrdersScreen";
import MyQrScreen from "./src/screens/MyQrScreen";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import CreateProductScreen from "./src/screens/CreateProductScreen";
import EditProductScreen from "./src/screens/EditProductScreen";
import SubscriptionBlockedScreen from "./src/screens/SubscriptionBlockedScreen";
import RegisterMerchantScreen from "./src/screens/RegisterMerchantScreen"; // NOVO

import { AuthProvider, AuthContext } from "./src/context/AuthContext";

import {
  setSubscriptionExpiredListener,
  setSubscriptionRestoredListener,
} from "./src/services/subscriptionBlock";

const Stack = createNativeStackNavigator();

function Routes() {
  const { user, loading } = useContext(AuthContext);

  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    setSubscriptionExpiredListener(() => setBlocked(true));
    setSubscriptionRestoredListener(() => setBlocked(false));
  }, []);

  if (loading) return null;

  // 🔒 Assinatura bloqueada
  if (user && blocked) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="SubscriptionBlocked"
          component={SubscriptionBlockedScreen}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator>
      {user ? (
        // ===== LOGADO =====
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: "Painel do Comerciante" }}
          />

          <Stack.Screen
            name="MyQr"
            component={MyQrScreen}
            options={{ title: "Meu QR Code" }}
          />

          <Stack.Screen
            name="Orders"
            component={OrdersScreen}
            options={{ title: "Pedidos" }}
          />

          <Stack.Screen
            name="CreateProduct"
            component={CreateProductScreen}
            options={{ title: "Novo Produto" }}
          />

          <Stack.Screen
            name="EditProduct"
            component={EditProductScreen}
            options={{ title: "Editar Produto" }}
          />
        </>
      ) : (
        // ===== NÃO LOGADO =====
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="RegisterMerchant"
            component={RegisterMerchantScreen}
            options={{ title: "Criar Conta" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Routes />
      </NavigationContainer>
    </AuthProvider>
  );
}
