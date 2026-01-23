import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Vibration,
  Switch,
  Image,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";

import { AuthContext } from "../context/AuthContext";
import {
  deleteProduct,
  listProducts,
  updateProduct,
  ProductDTO,
} from "../services/products";
import { listOrders } from "../services/orders";
import { theme } from "../theme";
import { formatBRL } from "../utils/money";
import { api } from "../services/api";

type Product = ProductDTO;

type SoundChoice = 1 | 2 | 3;

type Settings = {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  soundChoice: SoundChoice;
};

const SETTINGS_KEY = "@merchant_settings_v1";

const defaultSettings: Settings = {
  soundEnabled: true,
  vibrationEnabled: true,
  soundChoice: 1,
};

function formatPrice(priceCents: number) {
  try {
    return formatBRL(priceCents);
  } catch {
    return `R$ ${(priceCents / 100).toFixed(2)}`;
  }
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useContext(AuthContext);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [newOrdersCount, setNewOrdersCount] = useState(0);

  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [showAlertsSettings, setShowAlertsSettings] = useState(false);

  const [restaurantName, setRestaurantName] = useState<string | null>(null);

  // 🔊 Som (carrega 1 vez e reutiliza)
  const soundRef = useRef<Audio.Sound | null>(null);

  // 🔁 Polling de pedidos
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  // ✅ IDs já vistos
  const seenOrderIdsRef = useRef<Set<string>>(new Set());

  // 🔒 evita loads simultâneos (principal fix do loop)
  const isLoadingProductsRef = useRef(false);
  const isLoadingMeRef = useRef(false);

  const selectedSoundAsset = useMemo(() => {
    if (settings.soundChoice === 2) {
      return require("../../assets/sounds/new-order-2.mp3");
    }
    if (settings.soundChoice === 3) {
      return require("../../assets/sounds/new-order-3.mp3");
    }
    return require("../../assets/sounds/new-order-1.mp3");
  }, [settings.soundChoice]);

  async function loadSettings() {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<Settings>;
      setSettings((prev) => ({
        ...prev,
        ...parsed,
      }));
    } catch {}
  }

  async function saveSettings(next: Settings) {
    setSettings(next);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {}
  }

  async function playNewOrderSound() {
    if (!settings.soundEnabled) return;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });

      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(selectedSoundAsset, {
          shouldPlay: false,
        });
        soundRef.current = sound;
      }

      await soundRef.current.replayAsync();
    } catch {}
  }

  async function notifyNewOrder() {
    try {
      if (settings.vibrationEnabled) {
        Vibration.vibrate(200);
      }
      if (settings.soundEnabled) {
        await playNewOrderSound();
      }
    } catch {}
  }

  async function loadProducts(silent = false) {
    if (isLoadingProductsRef.current) return;
    isLoadingProductsRef.current = true;

    try {
      if (!silent) setLoading(true);

      const data = await listProducts();
      setProducts(data);
    } catch (err: any) {
      if (err?.response?.status === 402) return;

      // ✅ não prender a tela em loading
      Alert.alert(
        "Erro",
        err?.response?.data?.error ||
          err?.message ||
          "Falha ao carregar produtos"
      );
    } finally {
      if (!silent) setLoading(false);
      isLoadingProductsRef.current = false;
    }
  }

  async function loadMe(silent = true) {
    if (isLoadingMeRef.current) return;
    isLoadingMeRef.current = true;

    try {
      const res = await api.get("/me");
      const name = res.data?.restaurant?.name;
      if (name) setRestaurantName(String(name));
      else setRestaurantName(null);
    } catch (err: any) {
      if (err?.response?.status === 402) return;
      setRestaurantName(null);
    } finally {
      isLoadingMeRef.current = false;
    }
  }

  async function loadNewOrdersCount(shouldNotify = false) {
    try {
      const orders = await listOrders();

      const count = orders.filter((o) => o.status === "NEW").length;
      setNewOrdersCount(count);

      const seen = seenOrderIdsRef.current;

      if (!shouldNotify) {
        orders.forEach((o) => seen.add(o.id));
        return;
      }

      const newOnes = orders.filter((o) => !seen.has(o.id));
      newOnes.forEach((o) => seen.add(o.id));

      const hasNewOrder = newOnes.some((o) => o.status === "NEW");
      if (hasNewOrder) {
        await notifyNewOrder();
      }
    } catch {
      setNewOrdersCount(0);
    }
  }

  async function loadAll() {
    await Promise.all([loadProducts(false), loadNewOrdersCount(false), loadMe()]);
  }

  function showDeleteBusinessError() {
    Alert.alert(
      "Não foi possível excluir",
      "Este produto já foi usado em pedidos e não pode ser excluído.\n\nDica: desative o produto para removê-lo do cardápio."
    );
  }

  async function onToggleActive(item: Product) {
    try {
      const nextActive = !item.active;

      await updateProduct(item.id, { active: nextActive });

      setProducts((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, active: nextActive } : p))
      );
    } catch (err: any) {
      if (err?.response?.status === 402) return;

      Alert.alert(
        "Erro",
        err?.response?.data?.error ||
          err?.message ||
          "Falha ao alterar status do produto"
      );
    }
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
            setProducts((prev) => prev.filter((p) => p.id !== id));
          } catch (err: any) {
            const status = err?.response?.status;

            if (status === 402) return;

            if (status === 409) {
              showDeleteBusinessError();
              return;
            }

            if (status === 404) {
              Alert.alert(
                "Produto não encontrado",
                "Este produto não existe mais."
              );
              await loadProducts(true);
              return;
            }

            Alert.alert(
              "Erro",
              err?.response?.data?.error ||
                err?.message ||
                "Falha ao excluir produto"
            );
          }
        },
      },
    ]);
  }

  // ✅ settings + cleanup áudio
  useEffect(() => {
    loadSettings();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  // ✅ primeira carga
  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * ✅ Atualiza produtos quando voltar pra Home
   * Importante: SILENT (não trava UI e não entra em loop)
   */
  useFocusEffect(
    useCallback(() => {
      loadProducts(true);
      loadMe(true);
    }, [])
  );

  // ✅ polling novos pedidos
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    pollRef.current = setInterval(() => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      loadNewOrdersCount(true)
        .catch(() => {})
        .finally(() => {
          isPollingRef.current = false;
        });
    }, 5000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.soundEnabled, settings.vibrationEnabled, settings.soundChoice]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, padding: 14 }}>
      <View style={{ marginBottom: 8 }}>
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
          {restaurantName ?? user?.email}
        </Text>
      </View>

      <View style={{ flexDirection: "row", marginBottom: 8 }}>
        <TouchableOpacity
          onPress={() => loadAll()}
          style={{
            flex: 1,
            backgroundColor: theme.colors.card2,
            paddingVertical: 10,
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

        <TouchableOpacity
          onPress={signOut}
          style={{
            flex: 1,
            backgroundColor: theme.colors.card2,
            paddingVertical: 10,
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

      <View
        style={{
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          padding: 10,
          marginBottom: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
              🔔 Avisos de novos pedidos
            </Text>

            <Text
              style={{
                color: theme.colors.muted,
                marginTop: 2,
                fontSize: 12,
              }}
            >
              Som: {settings.soundEnabled ? "ON" : "OFF"} • Vibração:{" "}
              {settings.vibrationEnabled ? "ON" : "OFF"} • Som{" "}
              {settings.soundChoice}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowAlertsSettings((v) => !v)}
            style={{
              backgroundColor: theme.colors.card2,
              paddingVertical: 7,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
              {showAlertsSettings ? "Fechar" : "Configurar"}
            </Text>
          </TouchableOpacity>
        </View>

        {showAlertsSettings && (
          <View style={{ marginTop: 10 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text style={{ color: theme.colors.muted, flex: 1 }}>Som</Text>
              <Switch
                value={settings.soundEnabled}
                onValueChange={(v) =>
                  saveSettings({ ...settings, soundEnabled: v })
                }
              />
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text style={{ color: theme.colors.muted, flex: 1 }}>Vibração</Text>
              <Switch
                value={settings.vibrationEnabled}
                onValueChange={(v) =>
                  saveSettings({ ...settings, vibrationEnabled: v })
                }
              />
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              {[1, 2, 3].map((n) => {
                const active = settings.soundChoice === n;
                return (
                  <TouchableOpacity
                    key={n}
                    onPress={() =>
                      saveSettings({
                        ...settings,
                        soundChoice: n as SoundChoice,
                      })
                    }
                    style={{
                      flex: 1,
                      backgroundColor: active
                        ? theme.colors.primary
                        : theme.colors.card2,
                      paddingVertical: 9,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active
                        ? "rgba(0,0,0,0.08)"
                        : theme.colors.border,
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        fontWeight: "900",
                        color: active ? "#071018" : theme.colors.text,
                      }}
                    >
                      Som {n}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={async () => {
                try {
                  await notifyNewOrder();
                } catch {}
              }}
              style={{
                marginTop: 10,
                backgroundColor: theme.colors.card2,
                paddingVertical: 9,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontWeight: "900",
                  color: theme.colors.text,
                }}
              >
                Testar aviso
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate("Orders")}
        style={{
          backgroundColor: theme.colors.primary,
          paddingVertical: 12,
          borderRadius: theme.radius.lg,
          marginBottom: 8,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#071018", fontWeight: "900" }}>Ver Pedidos</Text>

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

      <TouchableOpacity
        onPress={() => navigation.navigate("CreateProduct")}
        style={{
          backgroundColor: theme.colors.card,
          paddingVertical: 12,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          marginBottom: 8,
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

      <TouchableOpacity
        onPress={() => navigation.navigate("MyQr")}
        style={{
          backgroundColor: theme.colors.card,
          paddingVertical: 12,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          marginBottom: 10,
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

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
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
        <Text style={{ color: theme.colors.muted }}>
          {products.length} item(s)
        </Text>
      </View>

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
          renderItem={({ item }) => {
            const hasImage = Boolean(item.imageUrl);

            return (
              <View
                style={{
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.radius.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  marginBottom: 10,
                  overflow: "hidden",
                  flexDirection: "row",
                }}
              >
                <View
                  style={{
                    width: 86,
                    height: 86,
                    backgroundColor: theme.colors.card2,
                    borderRightWidth: 1,
                    borderRightColor: theme.colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {hasImage ? (
                    <Image
                      source={{ uri: String(item.imageUrl) }}
                      style={{ width: 86, height: 86 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                      Sem{"\n"}foto
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1, padding: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontWeight: "900",
                        fontSize: 16,
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>

                    {item.active === false && (
                      <View
                        style={{
                          marginLeft: 8,
                          backgroundColor: "rgba(227,93,106,0.12)",
                          borderWidth: 1,
                          borderColor: "rgba(227,93,106,0.35)",
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 999,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.colors.danger,
                            fontWeight: "900",
                            fontSize: 11,
                          }}
                        >
                          Inativo
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={{ color: theme.colors.muted, marginTop: 4 }}
                    numberOfLines={2}
                  >
                    {item.description || "Sem descrição"}
                  </Text>

                  <Text
                    style={{
                      color: theme.colors.text,
                      marginTop: 8,
                      fontWeight: "900",
                    }}
                  >
                    {formatPrice(item.priceCents)}
                  </Text>

                  <View style={{ flexDirection: "row", marginTop: 12, flexWrap: "wrap" }}>
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate("EditProduct", { id: item.id })
                      }
                      style={{
                        backgroundColor: theme.colors.card2,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        marginRight: 10,
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                        Editar
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => onToggleActive(item)}
                      style={{
                        backgroundColor:
                          item.active === false
                            ? "rgba(51,201,138,0.14)"
                            : "rgba(240,179,91,0.16)",
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor:
                          item.active === false
                            ? "rgba(51,201,138,0.45)"
                            : "rgba(240,179,91,0.55)",
                        marginRight: 10,
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                        {item.active === false ? "Ativar" : "Desativar"}
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
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: theme.colors.danger, fontWeight: "900" }}>
                        Excluir
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
