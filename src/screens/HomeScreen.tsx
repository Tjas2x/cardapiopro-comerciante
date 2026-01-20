import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Vibration,
  Switch,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";

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

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useContext(AuthContext);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const prevNewOrdersCountRef = useRef<number | null>(null);

  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // ✅ painel recolhível
  const [showAlertsSettings, setShowAlertsSettings] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);

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
    } catch {
      // ignora
    }
  }

  async function saveSettings(next: Settings) {
    setSettings(next);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // ignora
    }
  }

  async function playNewOrderSound() {
    if (!settings.soundEnabled) return;

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(selectedSoundAsset, {
        shouldPlay: true,
      });

      soundRef.current = sound;
    } catch {
      // não quebra nada se falhar
    }
  }

  async function notifyNewOrder() {
    if (settings.vibrationEnabled) {
      Vibration.vibrate(200);
    }
    if (settings.soundEnabled) {
      await playNewOrderSound();
    }
  }

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
          await notifyNewOrder();
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
    loadSettings();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, settings.soundEnabled, settings.vibrationEnabled, settings.soundChoice]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, padding: 14 }}>
      {/* Header (mais compacto) */}
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
          {user?.email}
        </Text>
      </View>

      {/* Atualizar / Sair (compacto) */}
      <View style={{ flexDirection: "row", marginBottom: 8 }}>
        <TouchableOpacity
          onPress={loadAll}
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

      {/* Avisos (compacto + expande/recolhe) */}
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

            <Text style={{ color: theme.colors.muted, marginTop: 2, fontSize: 12 }}>
              Som: {settings.soundEnabled ? "ON" : "OFF"} • Vibração:{" "}
              {settings.vibrationEnabled ? "ON" : "OFF"} • Som {settings.soundChoice}
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
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ color: theme.colors.muted, flex: 1 }}>Som</Text>
              <Switch
                value={settings.soundEnabled}
                onValueChange={(v) => saveSettings({ ...settings, soundEnabled: v })}
              />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
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
                      saveSettings({ ...settings, soundChoice: n as SoundChoice })
                    }
                    style={{
                      flex: 1,
                      backgroundColor: active ? theme.colors.primary : theme.colors.card2,
                      paddingVertical: 9,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? "rgba(0,0,0,0.08)" : theme.colors.border,
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

      {/* Ver Pedidos */}
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

      {/* Novo Produto */}
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

      {/* Meu QR Code */}
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

      {/* Título */}
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
                padding: 12,
                borderRadius: theme.radius.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                marginBottom: 10,
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
