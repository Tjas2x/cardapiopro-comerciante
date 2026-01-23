export async function uploadImageToCloudinary(uri: string) {
  const CLOUD_NAME = "dhsfwsu71";
  const UPLOAD_PRESET = "cardapiopro_products";

  const form = new FormData();

  form.append("file", {
    uri,
    name: "photo.jpg",
    type: "image/jpeg",
  } as any);

  form.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: form,
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "Falha ao enviar imagem");
  }

  return data.secure_url as string;
}
