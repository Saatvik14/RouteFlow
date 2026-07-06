import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

type PlanProps = {
  title: string;
  subtitle: string;
  price: string;
  icon: React.ReactNode;
  features: string[];
  popular?: boolean;
  onPress: () => void;
};

function PlanCard({
  title,
  subtitle,
  price,
  icon,
  features,
  popular,
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

        <View style={{ flex: 1 }}>
          <Text style={styles.planTitle}>{title}</Text>
          <Text style={styles.planSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <Text style={styles.price}>{price}</Text>

      <View style={styles.featureContainer}>
        {features.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <Feather
              name="check-circle"
              size={18}
              color="#16A34A"
            />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <Pressable style={styles.button} onPress={onPress}>
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </View>
  );
}

export default function SubscriptionScreen() {
  const router = useRouter();

  const handleLite = () => {
    // TODO: Launch Google Play / Apple purchase
    console.log("Lite selected");
  };

  const handleStandard = () => {
    // TODO: Launch Google Play / Apple purchase
    console.log("Standard selected");
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather
              name="arrow-left"
              size={22}
              color="#2563EB"
            />
          </Pressable>

          <Text style={styles.title}>
            Choose your subscription
          </Text>

          <Text style={styles.subtitle}>
            Unlock premium features for your deliveries.
          </Text>

          <PlanCard
            title="Lite"
            subtitle="Perfect for individual drivers"
            price="£7.99/month"
            icon={
              <Feather
                name="navigation"
                size={22}
                color="#2563EB"
              />
            }
            features={[
              "10 routes per day",
              "Turn-by-turn Navigation",
            ]}
            onPress={handleLite}
          />

          <PlanCard
            popular
            title="Standard"
            subtitle="Best for professionals"
            price="£9.99/month"
            icon={
              <MaterialCommunityIcons
                name="crown"
                size={24}
                color="#2563EB"
              />
            }
            features={[
              "Unlimited Routes",
              "Camera Address Scanner",
              "Voice Address Search",
              "Turn-by-turn Navigation",
            ]}
            onPress={handleStandard}
          />
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
    paddingBottom: 40,
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
    fontWeight: "700",
    color: "#0F172A",
  },

  subtitle: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 28,
  },

  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#DDE8F7",
    padding: 20,
    marginBottom: 22,
    backgroundColor: "#FFFFFF",

    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 8,
    },
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
    fontWeight: "700",
    fontSize: 11,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
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
    fontWeight: "700",
    color: "#0F172A",
  },

  planSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 3,
  },

  price: {
    fontSize: 30,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 22,
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
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },

});