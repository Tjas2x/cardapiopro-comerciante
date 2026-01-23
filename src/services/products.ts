import { api } from "./api";

export type ProductDTO = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  active: boolean;
  imageUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function listProducts() {
  const res = await api.get("/products");
  return res.data as ProductDTO[];
}

export async function getProduct(id: string) {
  const res = await api.get(`/products/${id}`);
  return res.data as ProductDTO;
}

export async function createProduct(data: {
  name: string;
  description?: string;
  priceCents: number;
  active?: boolean;
  imageUrl?: string | null;
}) {
  const res = await api.post("/products", {
    name: data.name,
    description: data.description ?? null,
    priceCents: data.priceCents,
    active: data.active ?? true,
    imageUrl: data.imageUrl ?? null,
  });

  return res.data as ProductDTO;
}

export async function updateProduct(
  id: string,
  data: Partial<{
    name: string;
    description: string | null;
    priceCents: number;
    active: boolean;
    imageUrl: string | null;
  }>
) {
  const res = await api.put(`/products/${id}`, {
    ...data,
    // normalização segura
    description:
      typeof data.description === "undefined" ? undefined : data.description,
    imageUrl: typeof data.imageUrl === "undefined" ? undefined : data.imageUrl,
  });

  return res.data as ProductDTO;
}

export async function deleteProduct(id: string) {
  const res = await api.delete(`/products/${id}`);
  return res.data as { ok: true };
}
