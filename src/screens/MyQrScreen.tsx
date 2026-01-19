import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
  ActivityIndicator,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";

import { getMyRestaurant } from "../services/restaurants";

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  isOpen: boolean;
};

const WEB_URL = "https://cardapiopro-web.vercel.app";


export default function MyQrScreen() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        const data = await getMyRestaurant();
        if (!alive) return;
        setRestaurant(data);
      } catch (e: any) {
        console.log(e);
        if (!alive) return;
        Alert.alert("Erro", e?.message || "Falha ao carregar restaurante");
        setRestaurant(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  const menuUrl = useMemo(() => {
    if (!restaurant?.id) return "";
    return `${WEB_URL}/m/${restaurant.id}`;

  }, [restaurant?.id]);

  async function copyLink() {
    if (!menuUrl) return;
    await Clipboard.setStringAsync(menuUrl);
    Alert.alert("Copiado ✅", "Link do cardápio copiado.");
  }

  async function shareLink() {
    if (!menuUrl) return;
    try {
      await Share.share({
        message: `Meu cardápio: ${menuUrl}`,
      });
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao compartilhar");
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Meu QR Code</Text>
        <Text style={styles.subtitle}>Carregando restaurante...</Text>

        <View style={{ marginTop: 20, alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Meu QR Code</Text>
        <Text style={styles.subtitle}>
          Não foi possível carregar sua loja.
        </Text>

        <View style={styles.qrBox}>
          <Text style={{ fontWeight: "800", color: "#111827" }}>
            Restaurante não encontrado
          </Text>
          <Text style={{ marginTop: 6, color: "#52525b", textAlign: "center" }}>
            Verifique se este usuário possui restaurante vinculado (ownerId).
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meu QR Code</Text>
      <Text style={styles.subtitle}>
        {restaurant.name} • {restaurant.isOpen ? "Aberto" : "Fechado"}
      </Text>

      <View style={styles.qrBox}>
        <QRCode value={menuUrl} size={220} />
      </View>

      <Text style={styles.linkLabel}>Link:</Text>
      <Text style={styles.link} numberOfLines={2}>
        {menuUrl}
      </Text>

      <TouchableOpacity style={styles.btnPrimary} onPress={copyLink}>
        <Text style={styles.btnPrimaryText}>Copiar link</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnSecondary} onPress={shareLink}>
        <Text style={styles.btnSecondaryText}>Compartilhar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f4f4f5" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#52525b", marginBottom: 18 },

  qrBox: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },

  linkLabel: { fontSize: 13, color: "#52525b", marginTop: 6 },
  link: { fontSize: 13, color: "#111827", marginBottom: 14 },

  btnPrimary: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700" },

  btnSecondary: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  btnSecondaryText: { color: "#111827", fontWeight: "700" },
});
