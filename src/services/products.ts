import { api } from "./api";

export async function listProducts() {
  const res = await api.get("/products");
  return res.data;
}

export async function createProduct(data: {
  name: string;
  description?: string;
  priceCents: number;
}) {
  const res = await api.post("/products", data);
  return res.data;
}

export async function updateProduct(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    priceCents: number;
    active: boolean;
  }>
) {
  const res = await api.patch(`/products/${id}`, data);
  return res.data;
}

export async function deleteProduct(id: string) {
  const res = await api.delete(`/products/${id}`);
  return res.data;
}

export async function getProduct(id: string) {
  const res = await api.get(`/products/${id}`);
  return res.data;
}
