import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  AppState,
  Vibration,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Audio } from "expo-av";

import { theme } from "../theme";
import { formatBRL } from "../utils/money";
import {
  listOrders,
  updateOrderStatus,
  Order,
  OrderStatus,
} from "../services/orders";

type Filter = "ALL" | OrderStatus;

function statusLabel(s: OrderStatus) {
  switch (s) {
    case "NEW":
      return "Novo";
    case "PREPARING":
      return "Preparando";
    case "OUT_FOR_DELIVERY":
      return "Saiu";
    case "DELIVERED":
      return "Entregue";
    case "CANCELED":
      return "Cancelado";
    default:
      return s;
  }
}

function statusPillStyle(s: OrderStatus) {
  if (s === "NEW") {
    return {
      bg: "rgba(47,199,176,0.18)",
      border: "rgba(47,199,176,0.55)",
      text: theme.colors.primary,
    };
  }
  if (s === "PREPARING") {
    return {
      bg: "rgba(240,179,91,0.16)",
      border: "rgba(240,179,91,0.55)",
      text: theme.colors.warning,
    };
  }
  if (s === "OUT_FOR_DELIVERY") {
    return {
      bg: "rgba(47,199,176,0.14)",
      border: "rgba(47,199,176,0.35)",
      text: theme.colors.text,
    };
  }
  if (s === "DELIVERED") {
    return {
      bg: "rgba(51,201,138,0.14)",
      border: "rgba(51,201,138,0.45)",
      text: theme.colors.success,
    };
  }
  if (s === "CANCELED") {
    return {
      bg: "rgba(255,255,255,0.06)",
      border: theme.colors.border,
      text: theme.colors.muted,
    };
  }
  return {
    bg: theme.colors.card2,
    border: theme.colors.border,
    text: theme.colors.text,
  };
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");

  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  // 🔒 evita múltiplos fetch simultâneos
  const isFetchingRef = useRef(false);

  // ⏱ controle do timer
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🔔 controlar alerta de "novo pedido"
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const soundRef = useRef<Audio.Sound | null>(null);
  const soundEnabledRef = useRef(true); // se você tiver toggle no app, ligue nisso aqui

  async function ensureSoundLoaded() {
    try {
      if (soundRef.current) return;

      // Se você quiser um som personalizado, coloque um mp3 em:
      // /assets/sounds/new-order.mp3
      // e troque o require abaixo.
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/sounds/new-order.mp3"),
        { shouldPlay: false }
      );

      soundRef.current = sound;

      // Permite tocar som mesmo em modo silencioso (iOS)
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });
    } catch {
      // se falhar o áudio, segue vida (sem crash)
    }
  }

  async function playNewOrderAlert() {
    if (!soundEnabledRef.current) return;

    try {
      await ensureSoundLoaded();

      // vibração curta
      Vibration.vibrate(180);

      if (soundRef.current) {
        await soundRef.current.replayAsync();
      }
    } catch {
      // não travar a tela se áudio falhar
    }
  }

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startPolling() {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      load(true);
    }, 5000);
  }

  function detectNewOrders(nextOrders: Order[]) {
    // Detecta apenas os pedidos que chegaram agora (IDs que não existiam antes)
    const seen = seenOrderIdsRef.current;

    const newOnes = nextOrders.filter((o) => !seen.has(o.id));
    newOnes.forEach((o) => seen.add(o.id));

    // toca apenas se chegou algum pedido novo com status NEW
    const hasNew = newOnes.some((o) => o.status === "NEW");

    if (hasNew) {
      playNewOrderAlert();
    }
  }

  async function load(silent = false) {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (!silent) setLoading(true);

      const data = await listOrders();

      // 🔔 alerta apenas se realmente chegou pedido novo
      detectNewOrders(data);

      setOrders(data);
      setLastSyncAt(new Date());
    } catch (err: any) {
      if (err?.response?.status === 402) return;
      Alert.alert("Erro", err?.message || "Falha ao carregar pedidos");
    } finally {
      if (!silent) setLoading(false);
      isFetchingRef.current = false;
    }
  }

  async function setStatus(orderId: string, status: OrderStatus) {
    try {
      await updateOrderStatus(orderId, status);
      await load(true);
    } catch (err: any) {
      if (err?.response?.status === 402) return;
      Alert.alert("Erro", err?.message || "Falha ao atualizar status");
    }
  }

  // ✅ primeira carga
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ polling só enquanto tela estiver em foco
  useFocusEffect(
    useCallback(() => {
      // força sync quando entrar na tela
      load(true);

      if (autoRefresh) startPolling();

      return () => {
        stopPolling();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoRefresh])
  );

  // ✅ ao voltar do background, faz refresh imediato
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        load(true);
      }
    });

    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ cleanup do som ao desmontar
  useEffect(() => {
    return () => {
      stopPolling();
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  const sortedOrders = useMemo(() => {
    const copy = [...orders];

    copy.sort((a, b) => {
      const aScore = a.status === "NEW" ? 0 : 1;
      const bScore = b.status === "NEW" ? 0 : 1;
      if (aScore !== bScore) return aScore - bScore;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return copy;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (filter === "ALL") return sortedOrders;
    return sortedOrders.filter((o) => o.status === filter);
  }, [sortedOrders, filter]);

  function Chip({ label, value }: { label: string; value: Filter }) {
    const selected = filter === value;

    return (
      <TouchableOpacity
        onPress={() => setFilter(value)}
        style={{
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: selected
            ? "rgba(47,199,176,0.14)"
            : theme.colors.card,
          marginRight: 8,
          marginBottom: 8,
        }}
      >
        <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
          padding: 16,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator />
        <Text style={{ color: theme.colors.muted, marginTop: 10 }}>
          Carregando pedidos...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, padding: 16 }}>
      <View style={{ marginBottom: 12 }}>
        <Text
          style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900" }}
        >
          Pedidos
        </Text>

        <Text style={{ color: theme.colors.muted, marginTop: 2 }}>
          Auto-refresh: {autoRefresh ? "ON" : "OFF"} (5s)
          {lastSyncAt ? ` • Sync: ${lastSyncAt.toLocaleTimeString()}` : ""}
        </Text>
      </View>

      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        <TouchableOpacity
          onPress={() => load()}
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

        <TouchableOpacity
          onPress={() => setAutoRefresh((v) => !v)}
          style={{
            flex: 1,
            backgroundColor: autoRefresh
              ? "rgba(51,201,138,0.16)"
              : theme.colors.card2,
            padding: 12,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: autoRefresh
              ? "rgba(51,201,138,0.55)"
              : theme.colors.border,
          }}
        >
          <Text
            style={{
              color: theme.colors.text,
              textAlign: "center",
              fontWeight: "900",
            }}
          >
            Auto: {autoRefresh ? "ON" : "OFF"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
        <Chip label="Todos" value="ALL" />
        <Chip label="Novos" value="NEW" />
        <Chip label="Preparando" value="PREPARING" />
        <Chip label="Saiu" value="OUT_FOR_DELIVERY" />
        <Chip label="Entregues" value="DELIVERED" />
        <Chip label="Cancelados" value="CANCELED" />
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={{ color: theme.colors.muted }}>
            Nenhum pedido encontrado.
          </Text>
        }
        renderItem={({ item }) => {
          const pill = statusPillStyle(item.status);

          return (
            <View
              style={{
                backgroundColor: theme.colors.card,
                borderWidth: 1,
                borderColor:
                  item.status === "NEW"
                    ? "rgba(47,199,176,0.55)"
                    : theme.colors.border,
                padding: 14,
                borderRadius: theme.radius.lg,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                  Pedido #{item.id.slice(0, 6).toUpperCase()}
                </Text>

                <View
                  style={{
                    backgroundColor: pill.bg,
                    borderWidth: 1,
                    borderColor: pill.border,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ color: pill.text, fontWeight: "900" }}>
                    {statusLabel(item.status)}
                  </Text>
                </View>
              </View>

              <Text style={{ color: theme.colors.muted, marginTop: 6 }}>
                Cliente: {item.customerName || "—"}
              </Text>
              <Text style={{ color: theme.colors.muted }}>
                Tel: {item.customerPhone || "—"}
              </Text>
              <Text style={{ color: theme.colors.muted }}>
                Endereço: {item.deliveryAddress || "—"}
              </Text>

              <Text
                style={{
                  color: theme.colors.text,
                  fontWeight: "900",
                  marginTop: 10,
                }}
              >
                Total: {formatBRL(item.totalCents)}
              </Text>

              <View style={{ marginTop: 10 }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontWeight: "900",
                    marginBottom: 6,
                  }}
                >
                  Itens:
                </Text>

                {item.items?.map((it) => (
                  <Text key={it.id} style={{ color: theme.colors.muted }}>
                    • {it.quantity}x {it.nameSnapshot} (
                    {formatBRL(it.unitPriceCents)})
                  </Text>
                ))}
              </View>

              <View
                style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12 }}
              >
                {item.status === "NEW" && (
                  <>
                    <TouchableOpacity
                      onPress={() => setStatus(item.id, "PREPARING")}
                      style={{
                        backgroundColor: "rgba(240,179,91,0.16)",
                        borderWidth: 1,
                        borderColor: "rgba(240,179,91,0.55)",
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        marginRight: 10,
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{ color: theme.colors.text, fontWeight: "900" }}
                      >
                        Preparando
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setStatus(item.id, "CANCELED")}
                      style={{
                        backgroundColor: "rgba(227,93,106,0.12)",
                        borderWidth: 1,
                        borderColor: "rgba(227,93,106,0.35)",
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        marginRight: 10,
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.danger,
                          fontWeight: "900",
                        }}
                      >
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {item.status === "PREPARING" && (
                  <TouchableOpacity
                    onPress={() => setStatus(item.id, "OUT_FOR_DELIVERY")}
                    style={{
                      backgroundColor: "rgba(47,199,176,0.14)",
                      borderWidth: 1,
                      borderColor: "rgba(47,199,176,0.35)",
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      marginRight: 10,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{ color: theme.colors.text, fontWeight: "900" }}
                    >
                      Saiu para entrega
                    </Text>
                  </TouchableOpacity>
                )}

                {item.status === "OUT_FOR_DELIVERY" && (
                  <TouchableOpacity
                    onPress={() => setStatus(item.id, "DELIVERED")}
                    style={{
                      backgroundColor: "rgba(51,201,138,0.14)",
                      borderWidth: 1,
                      borderColor: "rgba(51,201,138,0.45)",
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      marginRight: 10,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{ color: theme.colors.text, fontWeight: "900" }}
                    >
                      Entregue
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
