import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    setMinAge((prev) => {
      const next = Math.max(18, Math.min(prev + delta, maxAge - 1));
      return next;
    });
  };

  const changeMaxAge = (delta) => {
    setMaxAge((prev) => {
      const next = Math.max(minAge + 1, Math.min(prev + delta, 99));
      return next;
    });
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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Filtres</Text>

        {/* ÂGE */}
        <Text style={styles.sectionTitle}>Tranche d'âge</Text>
        <View style={styles.rangeRow}>
          <View style={styles.ageBox}>
            <Text style={styles.ageLabel}>Minimum</Text>
            <View style={styles.counter}>
              <TouchableOpacity style={styles.counterBtn} onPress={() => changeMinAge(-1)}>
                <Text style={styles.counterBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{minAge}</Text>
              <TouchableOpacity style={styles.counterBtn} onPress={() => changeMinAge(1)}>
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.rangeSep}>—</Text>

          <View style={styles.ageBox}>
            <Text style={styles.ageLabel}>Maximum</Text>
            <View style={styles.counter}>
              <TouchableOpacity style={styles.counterBtn} onPress={() => changeMaxAge(-1)}>
                <Text style={styles.counterBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{maxAge}</Text>
              <TouchableOpacity style={styles.counterBtn} onPress={() => changeMaxAge(1)}>
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* DISTANCE */}
        <Text style={styles.sectionTitle}>Distance maximale</Text>
        <View style={styles.chips}>
          {DISTANCE_OPTIONS.map((opt) => {
            const selected = maxDistance === opt.value;
            return (
              <TouchableOpacity
                key={String(opt.value)}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setMaxDistance(opt.value)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveBtnText}>Appliquer les filtres</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  content: { padding: 24, paddingBottom: 40 },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FF4458",
    marginBottom: 28,
    textAlign: "center",
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 14,
    marginTop: 8,
  },

  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },

  ageBox: { alignItems: "center", flex: 1 },
  ageLabel: { fontSize: 12, color: "#999", marginBottom: 10, fontWeight: "600" },

  counter: { flexDirection: "row", alignItems: "center" },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  counterBtnText: { fontSize: 20, color: "#FF4458", fontWeight: "700", lineHeight: 24 },
  counterValue: { fontSize: 22, fontWeight: "700", marginHorizontal: 14, color: "#222", minWidth: 30, textAlign: "center" },

  rangeSep: { fontSize: 18, color: "#ccc", marginHorizontal: 4 },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 36,
  },

  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  chipSelected: {
    backgroundColor: "#FF4458",
    borderColor: "#FF4458",
  },
  chipText: { fontSize: 14, color: "#555", fontWeight: "600" },
  chipTextSelected: { color: "#fff" },

  saveBtn: {
    backgroundColor: "#FF4458",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
