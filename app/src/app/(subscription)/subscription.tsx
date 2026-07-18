import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  ErrorCode,
  deepLinkToSubscriptions,
  useIAP,
} from "../../services/iap-safe-wrapper";
import {
  getMySubscription,
  getSubscriptionPlans,
  verifySubscriptionPurchase,
  type PlanCode,
  type SubscriptionPlan,
} from "../../services/api/subscriptionApi";

const COLORS = {
  background: "#F7F9FC",
  surface: "#FFFFFF",
  surfaceMuted: "#F4F7FB",
  primary: "#4F46E5",
  primaryDark: "#3730A3",
  primarySoft: "#EEF2FF",
  primaryBorder: "#C7D2FE",
  textPrimary: "#111827",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  border: "#E2E8F0",
  success: "#16A34A",
  successSoft: "#ECFDF3",
  warning: "#B45309",
  warningSoft: "#FFF7ED",
  white: "#FFFFFF",
  overlay: "rgba(15, 23, 42, 0.58)",
  shadow: "#0F172A",
} as const;

const MONTHLY_BASE_PLAN_ID = "monthly";
const BILLING_PERIOD = "/month";

const SCREEN_COPY = {
  brand: "RouteFloww Premium",
  eyebrow: "PLANS FOR EVERY DRIVER",
  title: "Drive smarter on every route",
  subtitle:
    "Choose a plan that matches your daily workload. Upgrade or cancel through Google Play at any time.",
  loadingPlans: "Loading subscription plans…",
  storePriceNote: "Final pricing is shown and charged by Google Play.",
  renewalNotice:
    "Subscriptions renew automatically each month unless cancelled. Manage or cancel your plan from Google Play subscriptions.",
  manageSubscription: "Manage subscription",
  bestValue: "BEST VALUE",
  currentPlan: "Current plan",
  paymentInProgress: "Opening Google Play…",
  choosePlan: "Choose",
  retry: "Try again",
} as const;

const ALERT_COPY = {
  paymentUnsuccessfulTitle: "Payment unsuccessful",
  paymentUnsuccessfulMessage: "The purchase could not be completed.",
  verificationFailedTitle: "Verification failed",
  verificationFailedMessage:
    "Google Play did not return the purchase information required to activate your plan.",
  subscriptionActivatedTitle: "Subscription activated",
  continue: "Continue",
  activationFailedTitle: "Could not activate subscription",
  activationFailedMessage:
    "Please try again. You will not be charged twice for the same purchase.",
  applePaymentTitle: "Apple payment required",
  applePaymentMessage:
    "Google Play Billing is available only on Android. Connect this screen to Apple In-App Purchase before offering subscriptions on iPhone.",
  storeUnavailableTitle: "Google Play unavailable",
  storeUnavailableMessage:
    "Google Play is not connected yet. Reopen the app and try again.",
  planUnavailableTitle: "Plan unavailable",
  planUnavailableMessage:
    "This plan is not available from Google Play right now. Check its product and base-plan configuration in Play Console.",
  paymentStartFailedTitle: "Unable to start payment",
  paymentStartFailedMessage: "Please try again.",
  manageFailedTitle: "Unable to open subscriptions",
  manageFailedMessage:
    "Open Google Play, tap your profile, then select Payments & subscriptions.",
} as const;

const WEB_SANDBOX_COPY = {
  confirmTitle: "Web Sandbox Mode",
  confirmMessage:
    "Would you like to simulate this purchase and test your backend verification endpoint?",
  success: "The simulated purchase request reached your backend.",
  expectedFailure:
    "The backend rejected the mock token, which is expected when Google verification is enabled.",
} as const;

type PlanDefinition = SubscriptionPlan;

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel";
};

type CustomAlertState = {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
};

type PlanCardProps = {
  plan: PlanDefinition;
  price: string;
  active: boolean;
  loading: boolean;
  disabled: boolean;
  currentPlan: PlanCode | null;
  onPress: () => void;
};

function PlanIcon({ plan }: { plan: PlanDefinition }) {
  if (plan.iconLibrary === "material-community") {
    return (
      <MaterialCommunityIcons
        name={plan.iconName as any}
        size={24}
        color={COLORS.primary}
      />
    );
  }

  return (
    <Feather
      name={plan.iconName as any}
      size={22}
      color={COLORS.primary}
    />
  );
}

function PlanCard({
  plan,
  price,
  active,
  loading,
  disabled,
  currentPlan,
  onPress,
}: PlanCardProps) {
  let buttonLabel = active
    ? SCREEN_COPY.currentPlan
    : loading
      ? SCREEN_COPY.paymentInProgress
      : `${SCREEN_COPY.choosePlan} ${plan.name}`;

  if (currentPlan === "lite" && plan.code === "standard") {
    buttonLabel = "Upgrade to Standard";
  }

  return (
    <View
      style={[
        styles.planCard,
        plan.popular && styles.featuredPlanCard,
        active && styles.activePlanCard,
      ]}
    >
      <View style={styles.planCardTopRow}>
        <View style={styles.planIdentityRow}>
          <View style={styles.planIconContainer}>
            <PlanIcon plan={plan} />
          </View>

          <View style={styles.planIdentityText}>
            <View style={styles.planNameRow}>
              <Text style={styles.planName}>{plan.name}</Text>
              {active ? (
                <View style={styles.currentPlanBadge}>
                  <Text style={styles.currentPlanBadgeText}>
                    {SCREEN_COPY.currentPlan}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.planDescription}>{plan.description}</Text>
          </View>
        </View>

        {plan.popular && !active ? (
          <View style={styles.popularBadge}>
            <MaterialCommunityIcons
              name="star-four-points"
              size={12}
              color={COLORS.primaryDark}
            />
            <Text style={styles.popularBadgeText}>
              {plan.badgeLabel || SCREEN_COPY.bestValue}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.priceSection}>
        <Text style={styles.price}>{price}</Text>
        <Text style={styles.billingPeriod}>
          {plan.billingPeriod || BILLING_PERIOD}
        </Text>
      </View>

      <View style={styles.routeAllowancePill}>
        <Feather name="map" size={15} color={COLORS.primaryDark} />
        <Text style={styles.routeAllowanceText}>{plan.routeLabel}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.featureList}>
        {plan.features.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <View style={styles.featureIconContainer}>
              <Feather name="check" size={13} color={COLORS.success} />
            </View>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        disabled={disabled || loading || active}
        onPress={onPress}
        style={({ pressed }) => [
          styles.planButton,
          plan.popular && styles.featuredPlanButton,
          active && styles.activePlanButton,
          (disabled || loading) && styles.disabledPlanButton,
          pressed && !disabled && !loading && !active && styles.pressedButton,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} size="small" />
        ) : (
          <>
            <Text style={styles.planButtonText}>{buttonLabel}</Text>
            {!active ? (
              <Feather name="arrow-right" size={17} color={COLORS.white} />
            ) : null}
          </>
        )}
      </Pressable>
    </View>
  );
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const processedPurchaseTokens = useRef(new Set<string>());

  const [customAlert, setCustomAlert] = useState<CustomAlertState>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
  });
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlanDetails, setLoadingPlanDetails] = useState(true);
  const [planDetailsError, setPlanDetailsError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlanCode | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanCode | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [loadingStoreProducts, setLoadingStoreProducts] = useState(false);
  const [purchaseToProcess, setPurchaseToProcess] = useState<any>(null);

  const showAlert = (
    title: string,
    message = "",
    buttons: AlertButton[] = [{ text: "OK" }],
  ) => {
    setCustomAlert({
      visible: true,
      title,
      message,
      buttons,
    });
  };

  const closeAlert = () => {
    setCustomAlert((previous) => ({ ...previous, visible: false }));
  };

  const loadPlanDetails = useCallback(async () => {
    setLoadingPlanDetails(true);
    setPlanDetailsError("");

    try {
      const result = await getSubscriptionPlans();
      const nextPlans = [...result.plans].sort(
        (first, second) => first.sortOrder - second.sortOrder,
      );

      if (!nextPlans.length) {
        throw new Error("No subscription plans are currently available.");
      }

      setPlans(nextPlans);
    } catch (error) {
      setPlans([]);
      setPlanDetailsError(
        error instanceof Error
          ? error.message
          : "Unable to load subscription plans.",
      );
    } finally {
      setLoadingPlanDetails(false);
    }
  }, []);

  useEffect(() => {
    loadPlanDetails();
  }, [loadPlanDetails]);

  const {
    connected,
    subscriptions,
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
        showAlert(
          ALERT_COPY.paymentUnsuccessfulTitle,
          error.message || ALERT_COPY.paymentUnsuccessfulMessage,
        );
      }
    },
  });

  const productIds = useMemo(
    () => plans.map((plan) => plan.productId),
    [plans],
  );

  useEffect(() => {
    if (
      !connected ||
      Platform.OS !== "android" ||
      productIds.length === 0
    ) {
      return;
    }

    let mounted = true;

    const loadStoreProducts = async () => {
      setLoadingStoreProducts(true);

      try {
        await fetchProducts({
          skus: productIds,
          type: "subs",
        });
      } catch (error) {
        console.error("Failed to load subscription products", error);
      } finally {
        if (mounted) {
          setLoadingStoreProducts(false);
        }
      }
    };

    loadStoreProducts();

    return () => {
      mounted = false;
    };
  }, [connected, fetchProducts, productIds]);

  useEffect(() => {
    let mounted = true;

    const loadCurrentSubscription = async () => {
      try {
        const result = await getMySubscription();

        if (!mounted || !result.active || !result.subscription) {
          return;
        }

        setCurrentPlan(result.subscription.planCode as PlanCode);
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
        showAlert(
          ALERT_COPY.verificationFailedTitle,
          ALERT_COPY.verificationFailedMessage,
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

        await finishTransaction({
          purchase: purchaseToProcess,
          isConsumable: false,
        });

        const activatedPlan = result.subscription.planCode as PlanCode;
        const activatedPlanName =
          plans.find((plan) => plan.code === activatedPlan)?.name ||
          activatedPlan;

        setCurrentPlan(activatedPlan);
        setSelectedPlan(null);
        setPurchaseToProcess(null);

        showAlert(
          ALERT_COPY.subscriptionActivatedTitle,
          `Your ${activatedPlanName} plan is now active.`,
          [
            {
              text: ALERT_COPY.continue,
              onPress: () => router.replace("/"),
            },
          ],
        );
      } catch (error) {
        processedPurchaseTokens.current.delete(purchaseToken);
        setSelectedPlan(null);

        showAlert(
          ALERT_COPY.activationFailedTitle,
          error instanceof Error
            ? error.message
            : ALERT_COPY.activationFailedMessage,
        );
      }
    };

    processPurchase();
  }, [finishTransaction, plans, purchaseToProcess, router]);

  const getStoreProduct = (productId: string) =>
    subscriptions.find((product: any) => product.id === productId) as any;

  const getPrice = (plan: PlanDefinition) => {
    const product = getStoreProduct(plan.productId);
    return product?.displayPrice || plan.fallbackPrice;
  };

  const purchasePlan = async (planCode: PlanCode) => {
    const plan = plans.find((item) => item.code === planCode);

    if (!plan) {
      return;
    }

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `[${WEB_SANDBOX_COPY.confirmTitle}]\n\n${plan.name}\n${WEB_SANDBOX_COPY.confirmMessage}`,
      );

      if (!confirmed) {
        return;
      }

      try {
        setSelectedPlan(planCode);

        await verifySubscriptionPurchase({
          platform: "android",
          productId: plan.productId,
          purchaseToken: `mock_token_${Date.now()}`,
        });

        window.alert(WEB_SANDBOX_COPY.success);
        router.replace("/");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : WEB_SANDBOX_COPY.expectedFailure;
        window.alert(`${WEB_SANDBOX_COPY.expectedFailure}\n\n${message}`);
      } finally {
        setSelectedPlan(null);
      }

      return;
    }

    if (Platform.OS !== "android") {
      showAlert(
        ALERT_COPY.applePaymentTitle,
        ALERT_COPY.applePaymentMessage,
      );
      return;
    }

    if (!connected) {
      showAlert(
        ALERT_COPY.storeUnavailableTitle,
        ALERT_COPY.storeUnavailableMessage,
      );
      return;
    }

    const productId = plan.productId;
    const product = getStoreProduct(productId);
    const offers = product?.subscriptionOfferDetailsAndroid || [];
    const monthlyOffer =
      offers.find(
        (offer: any) =>
          offer.basePlanId === (plan.basePlanId || MONTHLY_BASE_PLAN_ID),
      ) || offers[0];

    if (!product || !monthlyOffer?.offerToken) {
      showAlert(
        ALERT_COPY.planUnavailableTitle,
        ALERT_COPY.planUnavailableMessage,
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
      showAlert(
        ALERT_COPY.paymentStartFailedTitle,
        error instanceof Error
          ? error.message
          : ALERT_COPY.paymentStartFailedMessage,
      );
    }
  };

  const handleManageSubscription = async () => {
    try {
      const activePlan = plans.find((plan) => plan.code === currentPlan);

      await deepLinkToSubscriptions({
        skuAndroid: activePlan?.productId,
      });
    } catch {
      showAlert(
        ALERT_COPY.manageFailedTitle,
        ALERT_COPY.manageFailedMessage,
      );
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  const showLoadingState =
    checkingSubscription || loadingPlanDetails || loadingStoreProducts;
  const plansDisabled =
    Boolean(selectedPlan) || checkingSubscription || loadingPlanDetails;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.navigationRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
              onPress={handleBack}
            >
              <Feather
                name="arrow-left"
                size={21}
                color={COLORS.textPrimary}
              />
            </Pressable>

            <Text style={styles.brandText}>{SCREEN_COPY.brand}</Text>
            <View style={styles.navigationSpacer} />
          </View>

          <View style={styles.heroSection}>
            <View style={styles.eyebrowPill}>
              <MaterialCommunityIcons
                name="lightning-bolt-outline"
                size={14}
                color={COLORS.primaryDark}
              />
              <Text style={styles.eyebrowText}>{SCREEN_COPY.eyebrow}</Text>
            </View>

            <Text style={styles.title}>{SCREEN_COPY.title}</Text>
            <Text style={styles.subtitle}>{SCREEN_COPY.subtitle}</Text>
          </View>

          <View style={styles.valueStrip}>
            <View style={styles.valueItem}>
              <View style={styles.valueIcon}>
                <Feather name="clock" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.valueText}>Save planning time</Text>
            </View>

            <View style={styles.valueSeparator} />

            <View style={styles.valueItem}>
              <View style={styles.valueIcon}>
                <Feather name="compass" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.valueText}>Navigate with confidence</Text>
            </View>
          </View>

          {showLoadingState ? (
            <View style={styles.loadingBanner}>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <Text style={styles.loadingText}>
                {loadingPlanDetails
                  ? SCREEN_COPY.loadingPlans
                  : "Refreshing prices from Google Play…"}
              </Text>
            </View>
          ) : null}

          {planDetailsError ? (
            <View style={styles.planErrorCard}>
              <View style={styles.planErrorIcon}>
                <Feather name="alert-circle" size={18} color={COLORS.warning} />
              </View>
              <View style={styles.planErrorTextContainer}>
                <Text style={styles.planErrorTitle}>Unable to load plans</Text>
                <Text style={styles.planErrorText}>{planDetailsError}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={loadPlanDetails}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.manageButtonPressed,
                ]}
              >
                <Text style={styles.retryButtonText}>{SCREEN_COPY.retry}</Text>
              </Pressable>
            </View>
          ) : null}

          {currentPlan === "lite" && !planDetailsError && (
            <View style={styles.upgradeCallout}>
              <Feather name="trending-up" size={18} color={COLORS.primaryDark} />
              <Text style={styles.upgradeCalloutText}>
                You are currently on the Lite plan. Upgrade to Standard below to unlock unlimited routes, camera scanning, and advanced tools!
              </Text>
            </View>
          )}

          {currentPlan === "standard" ? (
            <View style={styles.standardActiveCard}>
              <View style={styles.successBadgeContainer}>
                <MaterialCommunityIcons name="check-circle" size={32} color={COLORS.success} />
              </View>
              <Text style={styles.standardActiveTitle}>You have subscribed to Standard Subscription</Text>
              <Text style={styles.standardActiveSubtitle}>
                Enjoy unlimited route planning and premium navigation features. Thank you for using RouteFloww!
              </Text>
            </View>
          ) : (
            <View style={styles.planList}>
              {plans.map((plan) => (
                <PlanCard
                  key={plan.code}
                  plan={plan}
                  price={getPrice(plan)}
                  active={currentPlan === plan.code}
                  loading={selectedPlan === plan.code}
                  disabled={plansDisabled}
                  currentPlan={currentPlan}
                  onPress={() => purchasePlan(plan.code)}
                />
              ))}
            </View>
          )}

          <View style={styles.billingInfoCard}>
            <View style={styles.billingInfoIcon}>
              <Feather name="shield" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.billingInfoTextContainer}>
              <Text style={styles.billingInfoTitle}>
                {SCREEN_COPY.storePriceNote}
              </Text>
              <Text style={styles.renewalText}>
                {SCREEN_COPY.renewalNotice}
              </Text>
            </View>
          </View>

          {currentPlan ? (
            <Pressable
              accessibilityRole="button"
              onPress={handleManageSubscription}
              style={({ pressed }) => [
                styles.manageButton,
                pressed && styles.manageButtonPressed,
              ]}
            >
              <Feather name="settings" size={17} color={COLORS.primary} />
              <Text style={styles.manageButtonText}>
                {SCREEN_COPY.manageSubscription}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={customAlert.visible}
        transparent
        animationType="fade"
        onRequestClose={closeAlert}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeAlert} />

          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Feather name="info" size={22} color={COLORS.primary} />
            </View>

            <Text style={styles.modalTitle}>{customAlert.title}</Text>
            {customAlert.message ? (
              <Text style={styles.modalMessage}>{customAlert.message}</Text>
            ) : null}

            <View style={styles.modalButtonContainer}>
              {customAlert.buttons.map((button, index) => (
                <Pressable
                  key={`${button.text}-${index}`}
                  style={({ pressed }) => [
                    styles.modalButton,
                    button.style === "cancel" && styles.modalCancelButton,
                    pressed && styles.modalButtonPressed,
                  ]}
                  onPress={() => {
                    closeAlert();
                    button.onPress?.();
                  }}
                >
                  <Text
                    style={[
                      styles.modalButtonText,
                      button.style === "cancel" &&
                        styles.modalCancelButtonText,
                    ]}
                  >
                    {button.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 40,
  },
  navigationRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  brandText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  navigationSpacer: {
    width: 42,
  },
  heroSection: {
    alignItems: "center",
    paddingTop: 26,
    paddingHorizontal: 8,
  },
  eyebrowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: COLORS.primaryDark,
  },
  title: {
    marginTop: 16,
    fontSize: 30,
    lineHeight: 37,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    maxWidth: 480,
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  valueStrip: {
    marginTop: 22,
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  valueItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  valueIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
    marginRight: 9,
  },
  valueText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  valueSeparator: {
    width: 1,
    height: 34,
    marginHorizontal: 12,
    backgroundColor: COLORS.border,
  },
  loadingBanner: {
    marginTop: 16,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    paddingHorizontal: 14,
  },
  loadingText: {
    marginLeft: 9,
    fontSize: 13,
    color: COLORS.primaryDark,
  },
  planList: {
    marginTop: 20,
    gap: 18,
  },
  planCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
  },
  featuredPlanCard: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  activePlanCard: {
    borderColor: COLORS.success,
  },
  planCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  planIdentityRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  planIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    marginRight: 13,
  },
  planIdentityText: {
    flex: 1,
    paddingRight: 8,
  },
  planNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  planName: {
    fontSize: 21,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  planDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  popularBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: COLORS.primaryDark,
  },
  currentPlanBadge: {
    borderRadius: 999,
    backgroundColor: COLORS.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  currentPlanBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.success,
  },
  priceSection: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "baseline",
  },
  price: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "600",
    letterSpacing: -0.5,
    color: COLORS.textPrimary,
  },
  billingPeriod: {
    marginLeft: 4,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  routeAllowancePill: {
    alignSelf: "flex-start",
    marginTop: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  routeAllowanceText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },
  divider: {
    height: 1,
    marginVertical: 20,
    backgroundColor: COLORS.border,
  },
  featureList: {
    gap: 13,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  featureIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.successSoft,
    marginRight: 10,
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textPrimary,
  },
  planButton: {
    marginTop: 22,
    minHeight: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primaryDark,
  },
  featuredPlanButton: {
    backgroundColor: COLORS.primary,
  },
  activePlanButton: {
    backgroundColor: COLORS.success,
  },
  disabledPlanButton: {
    opacity: 0.62,
  },
  pressedButton: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  planButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.white,
  },
  planErrorCard: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: COLORS.warningSoft,
    padding: 14,
  },
  planErrorIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFEDD5",
    marginRight: 10,
  },
  planErrorTextContainer: {
    flex: 1,
  },
  planErrorTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  planErrorText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
  retryButton: {
    marginLeft: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FDBA74",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.warning,
  },
  billingInfoCard: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    padding: 15,
  },
  billingInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
    marginRight: 11,
  },
  billingInfoTextContainer: {
    flex: 1,
  },
  billingInfoTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  renewalText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  manageButton: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    backgroundColor: COLORS.primarySoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  manageButtonPressed: {
    opacity: 0.76,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.overlay,
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    padding: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  modalMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  modalButtonContainer: {
    width: "100%",
    marginTop: 22,
    flexDirection: "row",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
  },
  modalCancelButton: {
    backgroundColor: COLORS.surfaceMuted,
  },
  modalButtonPressed: {
    opacity: 0.8,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.white,
  },
  modalCancelButtonText: {
    color: COLORS.textSecondary,
  },
  standardActiveCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.success,
    backgroundColor: COLORS.surface,
    padding: 24,
    alignItems: "center",
    marginTop: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
  },
  successBadgeContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.successSoft,
    marginBottom: 16,
  },
  standardActiveTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 10,
  },
  standardActiveSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  upgradeCallout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    backgroundColor: COLORS.primarySoft,
    padding: 16,
    marginTop: 20,
  },
  upgradeCalloutText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
    color: COLORS.primaryDark,
  },
});