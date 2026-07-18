import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../../constants/api";

const API_URL = API_BASE_URL;

export type VerifySubscriptionPayload = {
  platform: "android";
  productId: string;
  purchaseToken: string;
  transactionId?: string | null;
};

export type SubscriptionResponse = {
  active: boolean;
  message?: string;
  subscription: null | {
    planCode: "lite" | "standard";
    productId: string;
    provider: "google_play";
    status: string;
    autoRenew: boolean;
    expiresAt: string | null;
  };
};

async function getAccessToken(): Promise<string> {
  const token = await AsyncStorage.getItem("authToken");

  if (!token) {
    throw new Error("You are not logged in. Please sign in and try again.");
  }

  return token;
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) {
    throw new Error("API_BASE_URL is not configured.");
  }

  const token = await getAccessToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Subscription request failed.");
  }

  return data as T;
}

export function verifySubscriptionPurchase(
  payload: VerifySubscriptionPayload,
): Promise<SubscriptionResponse> {
  return apiRequest<SubscriptionResponse>("/api/subscriptions/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMySubscription(): Promise<SubscriptionResponse> {
  return apiRequest<SubscriptionResponse>("/api/subscriptions/me");
}
