import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { getProduct, updateProduct } from "../services/products";
import { theme } from "../theme";
import { formatBRL } from "../utils/money";

function onlyDigits(s: string) {
  return String(s || "").replace(/\D/g, "");
}

export default function EditProductScreen({ route, navigation }: any) {
  const { id } = route.params;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceDigits, setPriceDigits] = useState(""); // digita sem vírgula (centavos)
  const [active, setActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const priceCents = useMemo(() => {
    const n = Number(onlyDigits(priceDigits || "0"));
    return Number.isFinite(n) ? n : 0;
  }, [priceDigits]);

  const previewPrice = useMemo(() => {
    try {
      return formatBRL(priceCents);
    } catch {
      return `R$ ${(priceCents / 100).toFixed(2)}`;
    }
  }, [priceCents]);

  async function load() {
    try {
      setLoading(true);
      const p = await getProduct(id);

      setName(p.name || "");
      setDescription(p.description || "");
      setPriceDigits(String(p.priceCents ?? 0));
      setActive(Boolean(p.active));
    } catch (err: any) {
      Alert.alert(
        "Erro",
        err?.response?.data?.error || err?.message || "Falha ao carregar produto"
      );
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  async function onSave() {
    if (saving) return;

    const cleanName = String(name || "").trim();
    const cleanDesc = String(description || "").trim();

    if (!cleanName) {
      Alert.alert("Atenção", "Informe o nome do produto.");
      return;
    }

    if (!Number.isInteger(priceCents) || priceCents <= 0) {
      Alert.alert(
        "Atenção",
        "Preço inválido. Digite o valor sem vírgula.\nEx: 1990 = R$ 19,90"
      );
      return;
    }

    try {
      setSaving(true);

      await updateProduct(id, {
        name: cleanName,
        description: cleanDesc ? cleanDesc : null,
        priceCents: priceCents,
        active,
      });

      Alert.alert("✅ Salvo", "Produto atualizado com sucesso.");
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(
        "Erro",
        err?.response?.data?.error || err?.message || "Falha ao atualizar produto"
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <ActivityIndicator />
        <Text style={{ color: theme.colors.muted, marginTop: 10 }}>
          Carregando produto...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        <View style={{ marginBottom: 14 }}>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900" }}>
            Editar Produto
          </Text>
          <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
            Atualize os dados do item do cardápio.
          </Text>
        </View>

        {/* Nome */}
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: theme.colors.muted, fontWeight: "900", marginBottom: 6 }}>
            Nome do produto
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex: X-Salada"
            placeholderTextColor={theme.colors.muted}
            style={{
              color: theme.colors.text,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 12,
              backgroundColor: theme.colors.card2,
              fontWeight: "900",
            }}
          />
        </View>

        {/* Descrição */}
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: theme.colors.muted, fontWeight: "900", marginBottom: 6 }}>
            Descrição (opcional)
          </Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ex: Pão, carne, queijo, alface e tomate..."
            placeholderTextColor={theme.colors.muted}
            multiline
            style={{
              color: theme.colors.text,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 12,
              backgroundColor: theme.colors.card2,
              minHeight: 90,
              textAlignVertical: "top",
            }}
          />
        </View>

        {/* Preço */}
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: theme.colors.muted, fontWeight: "900", marginBottom: 6 }}>
            Preço (digite sem vírgula)
          </Text>

          <TextInput
            value={priceDigits}
            onChangeText={(t) => setPriceDigits(onlyDigits(t))}
            keyboardType="numeric"
            placeholder="Ex: 1990"
            placeholderTextColor={theme.colors.muted}
            style={{
              color: theme.colors.text,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 12,
              backgroundColor: theme.colors.card2,
              fontWeight: "900",
              fontSize: 16,
            }}
          />

          <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
            Valor atual: <Text style={{ color: theme.colors.text, fontWeight: "900" }}>{previewPrice}</Text>
          </Text>
        </View>

        {/* Ativo */}
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 12,
            marginBottom: 14,
          }}
        >
          <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
            Disponibilidade
          </Text>

          <Text style={{ color: theme.colors.text, marginTop: 6 }}>
            Status atual:{" "}
            <Text style={{ fontWeight: "900" }}>{active ? "Ativo" : "Inativo"}</Text>
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <TouchableOpacity
              onPress={() => setActive(true)}
              style={{
                flex: 1,
                backgroundColor: active ? "rgba(51,201,138,0.16)" : theme.colors.card2,
                borderWidth: 1,
                borderColor: active ? "rgba(51,201,138,0.55)" : theme.colors.border,
                paddingVertical: 10,
                borderRadius: 999,
              }}
            >
              <Text style={{ textAlign: "center", color: theme.colors.text, fontWeight: "900" }}>
                Ativar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActive(false)}
              style={{
                flex: 1,
                backgroundColor: !active ? "rgba(240,179,91,0.16)" : theme.colors.card2,
                borderWidth: 1,
                borderColor: !active ? "rgba(240,179,91,0.55)" : theme.colors.border,
                paddingVertical: 10,
                borderRadius: 999,
              }}
            >
              <Text style={{ textAlign: "center", color: theme.colors.text, fontWeight: "900" }}>
                Desativar
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ações */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              flex: 1,
              backgroundColor: theme.colors.card2,
              borderWidth: 1,
              borderColor: theme.colors.border,
              paddingVertical: 12,
              borderRadius: theme.radius.lg,
            }}
          >
            <Text style={{ textAlign: "center", color: theme.colors.text, fontWeight: "900" }}>
              Cancelar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSave}
            disabled={saving}
            style={{
              flex: 1,
              backgroundColor: theme.colors.primary,
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.08)",
              paddingVertical: 12,
              borderRadius: theme.radius.lg,
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Text style={{ textAlign: "center", color: "#071018", fontWeight: "900" }}>
              {saving ? "Salvando..." : "Salvar"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
