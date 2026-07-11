import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { ErrorCode, deepLinkToSubscriptions, useIAP } from "../../services/iap-safe-wrapper";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getMySubscription,
  verifySubscriptionPurchase,
} from "./../../services/api/subscriptionApi";

const PRODUCT_IDS = {
  lite: "routeflow_lite_monthly",
  standard: "routeflow_standard_monthly",
} as const;

type PlanCode = keyof typeof PRODUCT_IDS;

type PlanProps = {
  planCode: PlanCode;
  title: string;
  subtitle: string;
  price: string;
  icon: ReactNode;
  features: string[];
  popular?: boolean;
  active?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function PlanCard({
  title,
  subtitle,
  price,
  icon,
  features,
  popular,
  active,
  loading,
  disabled,
  onPress,
}: PlanProps) {
  return (
    <View style={[styles.card, popular && styles.popularCard]}>
      {popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>MOST POPULAR</Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>{icon}</View>

        <View style={styles.headerTextContainer}>
          <Text style={styles.planTitle}>{title}</Text>
          <Text style={styles.planSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.price}>{price}</Text>
        <Text style={styles.billingPeriod}> / month</Text>
      </View>

      <View style={styles.featureContainer}>
        {features.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <Feather name="check-circle" size={18} color="#16A34A" />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          active && styles.activeButton,
          (disabled || loading) && styles.disabledButton,
          pressed && !disabled && !loading && styles.buttonPressed,
        ]}
        disabled={disabled || loading || active}
        onPress={onPress}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>
            {active ? "Current plan" : "Continue"}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanCode | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanCode | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [purchaseToProcess, setPurchaseToProcess] = useState<any>(null);
  const processedPurchaseTokens = useRef(new Set<string>());

  const productIds = useMemo(() => Object.values(PRODUCT_IDS), []);

  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: (purchase) => {
      setPurchaseToProcess(purchase);
    },
    onPurchaseError: (error) => {
      setSelectedPlan(null);

      if (error.code !== ErrorCode.UserCancelled) {
        Alert.alert(
          "Payment unsuccessful",
          error.message || "The purchase could not be completed.",
        );
      }
    },
  });

  useEffect(() => {
    if (!connected || Platform.OS !== "android") {
      return;
    }

    fetchProducts({
      skus: productIds,
      type: "subs",
    }).catch((error: any) => {
      console.error("Failed to load subscription products", error);
    });
  }, [connected, fetchProducts, productIds]);

  useEffect(() => {
    let mounted = true;

    const loadCurrentSubscription = async () => {
      try {
        const result = await getMySubscription();

        if (!mounted || !result.active || !result.subscription) {
          return;
        }

        setCurrentPlan(result.subscription.planCode);
      } catch (error) {
        console.warn("Could not load current subscription", error);
      } finally {
        if (mounted) {
          setCheckingSubscription(false);
        }
      }
    };

    loadCurrentSubscription();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!purchaseToProcess || Platform.OS !== "android") {
      return;
    }

    const processPurchase = async () => {
      const purchaseToken =
        purchaseToProcess.purchaseToken ||
        purchaseToProcess.purchaseTokenAndroid;
      const productId = purchaseToProcess.productId;

      if (!purchaseToken || !productId) {
        setSelectedPlan(null);
        Alert.alert(
          "Verification failed",
          "Google Play did not return the required purchase information.",
        );
        return;
      }

      if (processedPurchaseTokens.current.has(purchaseToken)) {
        return;
      }

      processedPurchaseTokens.current.add(purchaseToken);

      try {
        const result = await verifySubscriptionPurchase({
          platform: "android",
          productId,
          purchaseToken,
          transactionId: purchaseToProcess.transactionId || null,
        });

        if (!result.active || !result.subscription) {
          throw new Error(
            result.message || "The subscription is not active yet.",
          );
        }

        // Finish only after your backend has verified and stored the purchase.
        await finishTransaction({
          purchase: purchaseToProcess,
          isConsumable: false,
        });

        setCurrentPlan(result.subscription.planCode);
        setSelectedPlan(null);
        setPurchaseToProcess(null);

        Alert.alert(
          "Subscription activated",
          `Your ${result.subscription.planCode} plan is now active.`,
          [
            {
              text: "Continue",
              onPress: () => router.replace("/"),
            },
          ],
        );
      } catch (error) {
        processedPurchaseTokens.current.delete(purchaseToken);
        setSelectedPlan(null);

        Alert.alert(
          "Could not activate subscription",
          error instanceof Error
            ? error.message
            : "Please try again. You will not be charged twice.",
        );
      }
    };

    processPurchase();
  }, [finishTransaction, purchaseToProcess, router]);

  const getStoreProduct = (productId: string) =>
    products.find((product: any) => product.id === productId) as any;

  const getPrice = (planCode: PlanCode, fallback: string) => {
    const product = getStoreProduct(PRODUCT_IDS[planCode]);
    return product?.displayPrice || fallback;
  };

  const purchasePlan = async (planCode: PlanCode) => {
    if (Platform.OS !== "android") {
      Alert.alert(
        "Apple payment required",
        "On iPhone, this screen must be connected to Apple In-App Purchase. Google Play Billing only works on Android.",
      );
      return;
    }

    if (!connected) {
      Alert.alert(
        "Store unavailable",
        "Google Play is not connected. Please reopen the app and try again.",
      );
      return;
    }

    const productId = PRODUCT_IDS[planCode];
    const product = getStoreProduct(productId);
    const offers = product?.subscriptionOfferDetailsAndroid || [];
    const monthlyOffer =
      offers.find((offer: any) => offer.basePlanId === "monthly") || offers[0];

    if (!product || !monthlyOffer?.offerToken) {
      Alert.alert(
        "Plan unavailable",
        "This subscription is not configured correctly in Google Play Console.",
      );
      return;
    }

    try {
      setSelectedPlan(planCode);

      await requestPurchase({
        request: {
          google: {
            skus: [productId],
            subscriptionOffers: [
              {
                sku: productId,
                offerToken: monthlyOffer.offerToken,
              },
            ],
          },
        },
        type: "subs",
      });
    } catch (error) {
      setSelectedPlan(null);

      Alert.alert(
        "Unable to start payment",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const handleManageSubscription = async () => {
    try {
      await deepLinkToSubscriptions({
        skuAndroid: currentPlan ? PRODUCT_IDS[currentPlan] : undefined,
      });
    } catch {
      Alert.alert(
        "Unable to open subscriptions",
        "Open Google Play, tap your profile, then Payments & subscriptions.",
      );
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const storeLoading = Platform.OS === "android" && (!connected || !products.length);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Feather name="arrow-left" size={22} color="#2563EB" />
          </Pressable>

          <Text style={styles.title}>Choose your subscription</Text>
          <Text style={styles.subtitle}>
            Unlock premium delivery and route-planning features.
          </Text>

          {(checkingSubscription || storeLoading) && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#2563EB" />
              <Text style={styles.loadingText}>Loading store plans...</Text>
            </View>
          )}

          <PlanCard
            planCode="lite"
            title="Lite"
            subtitle="Perfect for individual drivers"
            price={getPrice("lite", "£9.99")}
            icon={<Feather name="navigation" size={22} color="#2563EB" />}
            features={["10 routes per day", "Turn-by-turn navigation"]}
            active={currentPlan === "lite"}
            loading={selectedPlan === "lite"}
            disabled={Boolean(selectedPlan) || storeLoading}
            onPress={() => purchasePlan("lite")}
          />

          <PlanCard
            popular
            planCode="standard"
            title="Standard"
            subtitle="Best for professional drivers"
            price={getPrice("standard", "£14.99")}
            icon={
              <MaterialCommunityIcons name="crown" size={24} color="#2563EB" />
            }
            features={[
              "Unlimited routes",
              "Camera address scanner",
              "Voice address search",
              "Turn-by-turn navigation",
             ]}
            active={currentPlan === "standard"}
            loading={selectedPlan === "standard"}
            disabled={Boolean(selectedPlan) || storeLoading}
            onPress={() => purchasePlan("standard")}
          />

          <Text style={styles.renewalText}>
            Payment is charged by Google Play. Your subscription renews
            automatically every month until cancelled. You can cancel at any
            time from Google Play subscriptions.
          </Text>

          {currentPlan && (
            <Pressable
              style={styles.manageButton}
              onPress={handleManageSubscription}
            >
              <Feather name="settings" size={17} color="#2563EB" />
              <Text style={styles.manageButtonText}>Manage subscription</Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    padding: 20,
    paddingBottom: 42,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDE8F7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "#F8FBFF",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 22,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 12,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#64748B",
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#DDE8F7",
    padding: 20,
    marginBottom: 22,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 4,
  },
  popularCard: {
    borderColor: "#2563EB",
  },
  popularBadge: {
    position: "absolute",
    right: 18,
    top: -12,
    backgroundColor: "#DBEAFE",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  popularText: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 11,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  headerTextContainer: {
    flex: 1,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  planTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#0F172A",
  },
  planSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 3,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 22,
  },
  price: {
    fontSize: 30,
    fontWeight: "600",
    color: "#2563EB",
  },
  billingPeriod: {
    fontSize: 14,
    color: "#64748B",
  },
  featureContainer: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: "#334155",
    marginLeft: 12,
  },
  button: {
    height: 52,
    backgroundColor: "#2563EB",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  activeButton: {
    backgroundColor: "#16A34A",
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonPressed: {
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  renewalText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  manageButton: {
    marginTop: 18,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  manageButtonText: {
    marginLeft: 8,
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "500",
  },
});
