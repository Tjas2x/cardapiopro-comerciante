import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";

import {
  activateSubscription,
  getBillingWhatsApp,
  BillingPlan,
} from "../services/billing";

import { notifySubscriptionRestored } from "../services/subscriptionBlock";

const PLANS = {
  monthly: { label: "Mensal", price: "R$ 29,90/mês" },
  yearly: { label: "Anual", price: "R$ 299,90/ano (2 meses grátis)" },
};

export default function SubscriptionBlockedScreen() {
  const [code, setCode] = useState("");
  const [activating, setActivating] = useState(false);

  async function openWhatsApp(plan?: BillingPlan) {
    try {
      const data = await getBillingWhatsApp(plan);
      await Linking.openURL(data.whatsappUrl);
    } catch (e: any) {
      console.log("WHATSAPP ERROR STATUS =>", e?.response?.status);
      console.log("WHATSAPP ERROR DATA =>", e?.response?.data);
      console.log("WHATSAPP ERROR MSG =>", e?.message);
      Alert.alert("Erro", "Não foi possível abrir o WhatsApp.");
    }
  }

  async function onActivate() {
    const c = code.trim().toUpperCase();

    if (!c) {
      Alert.alert("Código", "Digite seu código de ativação.");
      return;
    }

    try {
      setActivating(true);

      const data = await activateSubscription(c);

      Alert.alert(
        "Ativado ✅",
        `Assinatura ativada!\nVálida até: ${data?.paidUntil || "OK"}`
      );

      notifySubscriptionRestored();
    } catch (e: any) {
      console.log("ACTIVATE ERROR STATUS =>", e?.response?.status);
      console.log("ACTIVATE ERROR DATA =>", e?.response?.data);
      console.log("ACTIVATE ERROR MSG =>", e?.message);

      Alert.alert(
        "Erro",
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Falha ao ativar assinatura"
      );
    } finally {
      setActivating(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0B0F1A" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Text style={styles.title}>Teste expirou</Text>
            <Text style={styles.subtitle}>
              Seu teste acabou. Assine para continuar usando.
            </Text>

            <View style={styles.plansBox}>
              <Text style={styles.plansTitle}>Planos</Text>

              <View style={styles.planRow}>
                <Text style={styles.planName}>Plano Mensal</Text>
                <Text style={styles.planPrice}>{PLANS.monthly.price}</Text>
              </View>

              <View style={styles.planRow}>
                <Text style={styles.planName}>Plano Anual</Text>
                <Text style={styles.planPrice}>{PLANS.yearly.price}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primary}
              onPress={() => openWhatsApp("monthly")}
            >
              <Text style={styles.primaryText}>Assinar Mensal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryAlt}
              onPress={() => openWhatsApp("yearly")}
            >
              <Text style={styles.primaryAltText}>Assinar Anual</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondary}
              onPress={() => openWhatsApp()}
            >
              <Text style={styles.secondaryText}>Falar no WhatsApp</Text>
            </TouchableOpacity>

            {/* ✅ Ativação por código */}
            <View style={styles.activateBox}>
              <Text style={styles.activateTitle}>Já paguei</Text>
              <Text style={styles.activateSubtitle}>
                Digite o código de ativação que você recebeu.
              </Text>

              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Ex: CP-7H2K-19XZ"
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="characters"
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={onActivate}
              />

              <TouchableOpacity
                style={styles.activateBtn}
                onPress={onActivate}
                disabled={activating}
              >
                {activating ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.activateBtnText}>Ativar</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.hint}>
                Códigos MVP: Mensal = MENSAL29 | Anual = ANUAL299
              </Text>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0B0F1A",
  },
  title: { color: "#fff", fontSize: 28, fontWeight: "900", marginBottom: 8 },
  subtitle: { color: "#cbd5e1", marginBottom: 16 },

  plansBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  plansTitle: { color: "#fff", fontWeight: "900", marginBottom: 10 },
  planRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  planName: { color: "#e2e8f0", fontWeight: "800" },
  planPrice: { color: "#94a3b8", fontWeight: "700" },

  primary: {
    backgroundColor: "#2FC7B0",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  primaryText: { textAlign: "center", fontWeight: "900", color: "#071018" },

  primaryAlt: {
    backgroundColor: "rgba(47,199,176,0.14)",
    borderWidth: 1,
    borderColor: "rgba(47,199,176,0.35)",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  primaryAltText: { textAlign: "center", fontWeight: "900", color: "#ffffff" },

  secondary: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    padding: 14,
    borderRadius: 14,
    marginBottom: 18,
  },
  secondaryText: { textAlign: "center", fontWeight: "900", color: "#fff" },

  activateBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 14,
  },
  activateTitle: { color: "#fff", fontWeight: "900", marginBottom: 4 },
  activateSubtitle: { color: "#cbd5e1", marginBottom: 10, fontSize: 12 },

  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    padding: 12,
    color: "#fff",
    marginBottom: 10,
  },
  activateBtn: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  activateBtnText: { color: "#0B0F1A", fontWeight: "900" },

  hint: {
    marginTop: 10,
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    textAlign: "center",
  },
});
