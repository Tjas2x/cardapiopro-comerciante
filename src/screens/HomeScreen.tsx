import React, { useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Vibration,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import { AuthContext } from "../context/AuthContext";
import { deleteProduct, listProducts } from "../services/products";
import { listOrders } from "../services/orders";
import { theme } from "../theme";
import { formatBRL } from "../utils/money";

type Product = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useContext(AuthContext);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const prevNewOrdersCountRef = useRef<number | null>(null);

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await listProducts();
      setProducts(data);
    } catch (err: any) {
      Alert.alert("Erro", err?.message || "Falha ao carregar produtos");
    } finally {
      setLoading(false);
    }
  }

  async function loadNewOrdersCount(shouldNotify = false) {
    try {
      const orders = await listOrders();
      const count = orders.filter((o) => o.status === "NEW").length;

      if (shouldNotify) {
        const prev = prevNewOrdersCountRef.current;
        if (prev !== null && count > prev) {
          Vibration.vibrate(200);
        }
      }

      prevNewOrdersCountRef.current = count;
      setNewOrdersCount(count);
    } catch {
      prevNewOrdersCountRef.current = 0;
      setNewOrdersCount(0);
    }
  }

  async function loadAll() {
    await Promise.all([loadProducts(), loadNewOrdersCount(false)]);
  }

  async function onDelete(id: string) {
    Alert.alert("Excluir produto", "Tem certeza que deseja excluir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProduct(id);
            loadProducts();
          } catch (err: any) {
            Alert.alert("Erro", err?.message || "Falha ao excluir produto");
          }
        },
      },
    ]);
  }

  useEffect(() => {
    let timer: any;

    const unsubFocus = navigation.addListener("focus", () => {
      loadAll();

      timer = setInterval(() => {
        loadNewOrdersCount(true);
      }, 5000);
    });

    const unsubBlur = navigation.addListener("blur", () => {
      if (timer) clearInterval(timer);
    });

    return () => {
      if (timer) clearInterval(timer);
      unsubFocus();
      unsubBlur();
    };
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, padding: 16 }}>
      {/* Header */}
      <View style={{ marginBottom: 14 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 22,
            fontWeight: "900",
          }}
        >
          Painel do Comerciante
        </Text>

        <Text style={{ color: theme.colors.muted, marginTop: 2 }}>
          {user?.email}
        </Text>
      </View>

      {/* Linha de ações secundárias */}
      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        {/* Atualizar */}
        <TouchableOpacity
          onPress={loadAll}
          style={{
            flex: 1,
            backgroundColor: theme.colors.card2,
            padding: 12,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            marginRight: 10,
          }}
        >
          <Text
            style={{
              color: theme.colors.text,
              textAlign: "center",
              fontWeight: "900",
            }}
          >
            Atualizar
          </Text>
        </TouchableOpacity>

        {/* Sair */}
        <TouchableOpacity
          onPress={signOut}
          style={{
            flex: 1,
            backgroundColor: theme.colors.card2,
            padding: 12,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: "rgba(227,93,106,0.55)",
          }}
        >
          <Text
            style={{
              color: theme.colors.danger,
              textAlign: "center",
              fontWeight: "900",
            }}
          >
            Sair
          </Text>
        </TouchableOpacity>
      </View>

      {/* Ação principal: Pedidos */}
      <TouchableOpacity
        onPress={() => navigation.navigate("Orders")}
        style={{
          backgroundColor: theme.colors.primary,
          padding: 14,
          borderRadius: theme.radius.lg,
          marginBottom: 12,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#071018", fontWeight: "900" }}>
          Ver Pedidos
        </Text>

        {newOrdersCount > 0 && (
          <View
            style={{
              marginLeft: 10,
              backgroundColor: "rgba(7,16,24,0.35)",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "rgba(7,16,24,0.35)",
            }}
          >
            <Text style={{ color: "#071018", fontWeight: "900" }}>
              {newOrdersCount} novo{newOrdersCount > 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Ação secundária: Novo Produto */}
      <TouchableOpacity
        onPress={() => navigation.navigate("CreateProduct")}
        style={{
          backgroundColor: theme.colors.card,
          padding: 14,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            textAlign: "center",
            fontWeight: "900",
          }}
        >
          + Novo Produto
        </Text>
      </TouchableOpacity>

      {/* NOVO: Meu QR Code */}
      <TouchableOpacity
        onPress={() => navigation.navigate("MyQr")}
        style={{
          backgroundColor: theme.colors.card,
          padding: 14,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          marginBottom: 14,
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            textAlign: "center",
            fontWeight: "900",
          }}
        >
          📲 Meu QR Code
        </Text>
      </TouchableOpacity>

      {/* Título */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 16,
            fontWeight: "900",
          }}
        >
          Produtos
        </Text>
        <Text style={{ color: theme.colors.muted }}>{products.length} item(s)</Text>
      </View>

      {/* Lista */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ color: theme.colors.muted, marginTop: 10 }}>
            Carregando produtos...
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.muted, marginTop: 20 }}>
              Nenhum produto encontrado.
            </Text>
          }
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: theme.colors.card,
                padding: 14,
                borderRadius: theme.radius.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontWeight: "900",
                  fontSize: 16,
                }}
              >
                {item.name}
              </Text>

              <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                {item.description || "Sem descrição"}
              </Text>

              <Text style={{ color: theme.colors.text, marginTop: 10, fontWeight: "900" }}>
                {formatBRL(item.priceCents)}
              </Text>

              <View style={{ flexDirection: "row", marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate("EditProduct", { id: item.id })}
                  style={{
                    backgroundColor: theme.colors.card2,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    marginRight: 10,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                    Editar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onDelete(item.id)}
                  style={{
                    backgroundColor: "rgba(227,93,106,0.12)",
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "rgba(227,93,106,0.35)",
                  }}
                >
                  <Text style={{ color: theme.colors.danger, fontWeight: "900" }}>
                    Excluir
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
