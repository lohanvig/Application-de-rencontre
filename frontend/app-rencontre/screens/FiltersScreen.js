import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../styles/theme";

const DISTANCE_OPTIONS = [
  { label: "10 km", value: 10 },
  { label: "25 km", value: 25 },
  { label: "50 km", value: 50 },
  { label: "100 km", value: 100 },
  { label: "Illimité", value: null },
];

export default function FiltersScreen({ navigation }) {
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(50);
  const [maxDistance, setMaxDistance] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem("swipeFilters").then((stored) => {
      if (stored) {
        const f = JSON.parse(stored);
        setMinAge(f.minAge ?? 18);
        setMaxAge(f.maxAge ?? 50);
        setMaxDistance(f.maxDistance ?? null);
      }
    });
  }, []);

  const changeMinAge = (delta) => {
    setMinAge((prev) => Math.max(18, Math.min(prev + delta, maxAge - 1)));
  };

  const changeMaxAge = (delta) => {
    setMaxAge((prev) => Math.max(minAge + 1, Math.min(prev + delta, 99)));
  };

  const save = async () => {
    await AsyncStorage.setItem(
      "swipeFilters",
      JSON.stringify({ minAge, maxAge, maxDistance })
    );
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Age section */}
        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>Tranche d'âge</Text>
        </View>

        <View style={[styles.card, styles.ageCard]}>
          <View style={styles.ageBlock}>
            <Text style={styles.ageLabel}>Minimum</Text>
            <View style={styles.counter}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => changeMinAge(-1)}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{minAge}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => changeMinAge(1)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.ageDivider} />

          <View style={styles.ageBlock}>
            <Text style={styles.ageLabel}>Maximum</Text>
            <View style={styles.counter}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => changeMaxAge(-1)}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{maxAge}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => changeMaxAge(1)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Distance section */}
        <View style={styles.sectionHeader}>
          <Ionicons name="location-outline" size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>Distance maximale</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.chips}>
            {DISTANCE_OPTIONS.map((opt) => {
              const selected = maxDistance === opt.value;
              return (
                <TouchableOpacity
                  key={String(opt.value)}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setMaxDistance(opt.value)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.87}>
          <Ionicons name="checkmark" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.saveBtnText}>Appliquer les filtres</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    marginTop: 20,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  ageBlock: {
    flex: 1,
    alignItems: "center",
    gap: 12,
  },

  ageLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  counterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,68,88,0.15)",
  },

  counterValue: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    minWidth: 36,
    textAlign: "center",
  },

  ageDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },

  ageCard: {
    flexDirection: "row",
    alignItems: "center",
  },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },

  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  chipText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  chipTextSelected: {
    color: "#fff",
  },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 32,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
