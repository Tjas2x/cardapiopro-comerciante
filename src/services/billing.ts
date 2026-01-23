import { api } from "./api";

export type BillingPlan = "monthly" | "yearly";

export type BillingWhatsAppResponse = {
  phone?: string;
  message?: string;
  whatsappUrl: string;
  plan?: null | { id: BillingPlan; priceCents: number };
};

export async function getBillingWhatsApp(plan?: BillingPlan) {
  const query = plan ? `?plan=${encodeURIComponent(plan)}` : "";
  const res = await api.get(`/billing/whatsapp${query}`);
  return res.data as BillingWhatsAppResponse;
}

export type ActivateSubscriptionResponse = {
  ok: true;
  status: "ACTIVE";
  paidUntil: string; // ISO string
};

export async function activateSubscription(code: string) {
  const res = await api.post("/billing/activate", { code: code.trim() });
  return res.data as ActivateSubscriptionResponse;
}
