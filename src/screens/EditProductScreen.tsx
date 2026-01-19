import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, Alert, ActivityIndicator } from "react-native";
import { getProduct, updateProduct } from "../services/products";

export default function EditProductScreen({ route, navigation }: any) {
  const { id } = route.params;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceCents, setPriceCents] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const p = await getProduct(id);
      setName(p.name);
      setDescription(p.description || "");
      setPriceCents(String(p.priceCents));
    } catch (err: any) {
      Alert.alert("Erro", err?.message || "Falha ao carregar produto");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  async function onSave() {
    try {
      setLoading(true);
      await updateProduct(id, {
        name,
        description,
        priceCents: Number(priceCents),
      });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Erro", err?.message || "Falha ao atualizar produto");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10 }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Editar Produto</Text>

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
        placeholder="Preço em centavos"
        value={priceCents}
        onChangeText={setPriceCents}
        keyboardType="numeric"
        style={{ borderWidth: 1, padding: 12, borderRadius: 10 }}
      />

      <Button title="Salvar" onPress={onSave} />
    </View>
  );
}
