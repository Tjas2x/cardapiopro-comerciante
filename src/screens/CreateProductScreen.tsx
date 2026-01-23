import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { createProduct } from "../services/products";

const CLOUDINARY_CLOUD_NAME = "dhsfwsu71";
const CLOUDINARY_UPLOAD_PRESET = "cardapiopro_products";

async function uploadToCloudinary(imageUri: string) {
  const formData = new FormData();

  formData.append("file", {
    uri: imageUri,
    name: "product.jpg",
    type: "image/jpeg",
  } as any);

  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 60000); // ✅ 60s timeout

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
        signal: controller.signal,
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error?.message || "Falha no upload da imagem");
    }

    return {
      url: data.secure_url as string,
      publicId: data.public_id as string,
    };
  } finally {
    clearTimeout(t);
  }
}

export default function CreateProductScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceCents, setPriceCents] = useState("1990");

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const priceNumber = useMemo(() => {
    const onlyDigits = priceCents.replace(/[^\d]/g, "");
    return Number(onlyDigits || 0);
  }, [priceCents]);

  async function pickImage() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permissão",
          "Permita o acesso às fotos para selecionar uma imagem."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      setImageUri(uri);
      setImageUrl(null);
    } catch (e: any) {
      console.log("PICK IMAGE ERROR =>", e?.message);
      Alert.alert("Erro", "Falha ao selecionar imagem.");
    }
  }

  async function uploadImageIfNeeded() {
    if (!imageUri) return null;
    if (imageUrl) return imageUrl;

    setUploadingImage(true);
    try {
      const { url } = await uploadToCloudinary(imageUri);
      setImageUrl(url);
      return url;
    } catch (e: any) {
      console.log("UPLOAD ERROR =>", e?.message);
      throw e;
    } finally {
      setUploadingImage(false);
    }
  }

  async function onSave() {
    const n = name.trim();
    const d = description.trim();

    if (!n) {
      Alert.alert("Nome", "Digite o nome do produto.");
      return;
    }

    if (!priceNumber || priceNumber < 1) {
      Alert.alert("Preço", "Digite o preço em centavos (ex: 1290).");
      return;
    }

    try {
      setSaving(true);
      Keyboard.dismiss();

      const finalImageUrl = await uploadImageIfNeeded();

      await createProduct({
        name: n,
        description: d ? d : undefined,
        priceCents: priceNumber,
        imageUrl: finalImageUrl,
      });

      Alert.alert("Criado ✅", "Produto cadastrado com sucesso!");
      navigation.goBack();
    } catch (err: any) {
      console.log("CREATE PRODUCT ERROR =>", err?.message);
      console.log("CREATE PRODUCT ERROR STATUS =>", err?.response?.status);
      console.log("CREATE PRODUCT ERROR DATA =>", err?.response?.data);

      Alert.alert(
        "Erro",
        err?.response?.data?.error ||
          err?.message ||
          "Falha ao criar produto (network)"
      );
    } finally {
      setSaving(false);
    }
  }

  const disabled = saving || uploadingImage;

  return (
    <View style={styles.page}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        enableOnAndroid={true}
        extraScrollHeight={80} // ✅ mais folga pro teclado
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true} // ✅ mostra scroll
      >
        <Text style={styles.title}>Novo Produto</Text>

        {/* Imagem */}
        <View style={styles.card}>
          <Text style={styles.label}>Imagem</Text>

          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} />
          ) : (
            <View style={styles.previewEmpty}>
              <Text style={styles.previewEmptyText}>Sem imagem</Text>
            </View>
          )}

          <TouchableOpacity style={styles.btn} onPress={pickImage}>
            <Text style={styles.btnText}>
              {imageUri ? "Trocar imagem" : "Selecionar imagem"}
            </Text>
          </TouchableOpacity>

          {uploadingImage ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator />
              <Text style={styles.inlineLoadingText}>Enviando imagem...</Text>
            </View>
          ) : null}
        </View>

        {/* Nome */}
        <View style={styles.card}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            placeholder="Ex: Pizza Calabresa"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={name}
            onChangeText={setName}
            style={styles.input}
            returnKeyType="next"
          />
        </View>

        {/* Descrição */}
        <View style={styles.card}>
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            placeholder="Ex: Pizza grande com calabresa e cebola"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={description}
            onChangeText={setDescription}
            style={[styles.input, { height: 90 }]}
            multiline
          />
        </View>

        {/* Preço */}
        <View style={styles.card}>
          <Text style={styles.label}>Preço (centavos)</Text>
          <TextInput
            placeholder="Ex: 5990"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={priceCents}
            onChangeText={setPriceCents}
            keyboardType="numeric"
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={onSave}
            selectTextOnFocus={true} // ✅ toca e seleciona tudo
          />

          <Text style={styles.helper}>
            Exibição no cardápio: R$ {(priceNumber / 100).toFixed(2)}
          </Text>
        </View>

        {/* Botão */}
        <TouchableOpacity
          style={[styles.saveBtn, disabled && { opacity: 0.6 }]}
          onPress={onSave}
          disabled={disabled}
        >
          {saving ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.saveBtnText}>Salvar</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0B0F1A" },
  container: {
    padding: 16,
    gap: 12,
    backgroundColor: "#0B0F1A",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 14,
  },
  label: { color: "#fff", fontWeight: "900", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    padding: 12,
    color: "#fff",
  },
  helper: {
    marginTop: 8,
    color: "rgba(255,255,255,0.50)",
    fontSize: 12,
  },
  preview: {
    width: "100%",
    height: 170,
    borderRadius: 12,
    marginBottom: 10,
  },
  previewEmpty: {
    width: "100%",
    height: 170,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  previewEmptyText: {
    color: "rgba(255,255,255,0.35)",
    fontWeight: "800",
  },
  btn: {
    backgroundColor: "rgba(47,199,176,0.14)",
    borderWidth: 1,
    borderColor: "rgba(47,199,176,0.35)",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "900" },
  inlineLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  inlineLoadingText: {
    color: "rgba(255,255,255,0.65)",
    fontWeight: "800",
  },
  saveBtn: {
    backgroundColor: "#2FC7B0",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnText: { color: "#071018", fontWeight: "900" },
});
