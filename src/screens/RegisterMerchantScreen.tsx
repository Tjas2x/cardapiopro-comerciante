import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";

/* ========= MÁSCARA TELEFONE BR ========= */
function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7)
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function RegisterMerchantScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const handleRegister = async () => {
    try {
      const response = await fetch(
        "http://192.168.100.3:4000/restaurants/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            phone: "55" + phone.replace(/\D/g, ""),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Erro", data.error || "Falha no cadastro");
        return;
      }

      Alert.alert("Sucesso", "Conta criada!");

      // CORREÇÃO AQUI — NÃO FORÇA HOME
      navigation.goBack();
    } catch {
      Alert.alert("Erro", "Não foi possível conectar ao servidor");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 20,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <Text>Nome do Restaurante</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
            />

            <Text>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
            />

            <Text>Senha</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
            />

            <Text>Telefone</Text>
            <TextInput
              value={phone}
              onChangeText={(text) => setPhone(formatPhone(text))}
              keyboardType="phone-pad"
              placeholder="(DDD) 9XXXX-XXXX"
              style={{ borderWidth: 1, marginBottom: 20, padding: 8 }}
            />

            <TouchableOpacity
              onPress={handleRegister}
              style={{
                backgroundColor: "#000",
                padding: 15,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", textAlign: "center" }}>
                Criar Conta
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
