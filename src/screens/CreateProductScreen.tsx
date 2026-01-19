import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { createProduct } from "../services/products";

export default function CreateProductScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceCents, setPriceCents] = useState("1990");
  const [loading, setLoading] = useState(false);

  async function onSave() {
    try {
      setLoading(true);

      await createProduct({
        name,
        description,
        priceCents: Number(priceCents),
      });

      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Erro", err?.message || "Falha ao criar produto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Novo Produto</Text>

      <TextInput
        placeholder="Nome"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, padding: 12, borderRadius: 10 }}
      />

      <TextInput
        placeholder="Descrição"
        value={description}
        onChangeText={setDescription}
        style={{ borderWidth: 1, padding: 12, borderRadius: 10 }}
      />

      <TextInput
        placeholder="Preço em centavos (ex: 1290)"
        value={priceCents}
        onChangeText={setPriceCents}
        keyboardType="numeric"
        style={{ borderWidth: 1, padding: 12, borderRadius: 10 }}
      />

      <Button title={loading ? "Salvando..." : "Salvar"} onPress={onSave} disabled={loading} />
    </View>
  );
}
