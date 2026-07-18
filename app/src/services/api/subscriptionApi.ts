import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../../constants/api";

const API_URL = API_BASE_URL;
export type PlanCode = "lite" | "standard";
export type IconLibrary = "feather" | "material-community";

export type SubscriptionPlan = {
  code: PlanCode;
  productId: string;
  basePlanId: string;
  name: string;
  description: string;
  fallbackPrice: string;
  billingPeriod: string;
  routeLabel: string;
  limits: {
    dailyRoutes: number | null;
  };
  capabilities: {
    cameraAddressScanner: boolean;
    voiceAddressSearch: boolean;
    routeManifestImport: boolean;
    copyPastRouteStops: boolean;
    reorderOptimisedStops: boolean;
    advancedStopPreferences: boolean;
  };
  badgeLabel?: string | null;
  popular: boolean;
  sortOrder: number;
  iconLibrary: IconLibrary;
  iconName: string;
  features: string[];
};

export type SubscriptionPlansResponse = {
  plans: SubscriptionPlan[];
};

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
    planCode: PlanCode;
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

export async function getSubscriptionPlans(): Promise<SubscriptionPlansResponse> {
  const response = await apiRequest<
    SubscriptionPlansResponse | { data: SubscriptionPlansResponse }
  >("/api/subscriptions/plans");

  return "data" in response ? response.data : response;
}