import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OrdersScreen from "./src/screens/OrdersScreen";
import MyQrScreen from "./src/screens/MyQrScreen";

import { AuthProvider, AuthContext } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import CreateProductScreen from "./src/screens/CreateProductScreen";
import EditProductScreen from "./src/screens/EditProductScreen";

const Stack = createNativeStackNavigator();

function Routes() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;

  return (
    <Stack.Navigator>
      {user ? (
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
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
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
