import React, { useContext, useState } from "react";
import { View, Text, TextInput, Button, Alert, TouchableOpacity } from "react-native";
import { AuthContext } from "../context/AuthContext";

export default function LoginScreen({ navigation }: any) {
  const { signIn } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    try {
      await signIn(email, password);
    } catch {
      Alert.alert("Erro", "Credenciais inválidas");
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />

      <Text>Senha</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, marginBottom: 20, padding: 8 }}
      />

      <Button title="Entrar" onPress={handleLogin} />

      {/* ===== NOVO BOTÃO ===== */}
      <TouchableOpacity
        onPress={() => navigation.navigate("RegisterMerchant")}
        style={{ marginTop: 20 }}
      >
        <Text style={{ textAlign: "center", color: "#0066cc" }}>
          Criar nova conta
        </Text>
      </TouchableOpacity>
    </View>
  );
}
