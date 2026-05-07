import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as Location from "expo-location";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

import API from "../api/api";
import SwipeCard from "../components/SwipeCard";
import { playSound, loadMuteState, initAudio } from "../utils/sounds";
import { colors } from "../styles/theme";

export default function HomeScreen({ route, navigation }) {
  const userId = route?.params?.userId;

  const [profiles, setProfiles] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [myPhoto, setMyPhoto] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [filters, setFilters] = useState({ minAge: 18, maxAge: 50, maxDistance: null, genderPref: null });
  const [cardAreaH, setCardAreaH] = useState(0);

  const notificationListener = useRef();
  const responseListener = useRef();
  const cardRef = useRef();
  const initialLoadDone = useRef(false);
  const loadedFiltersKey = useRef(null);

  useEffect(() => {
    const init = async () => {
      const loadedFilters = await loadFilters();
      const loc = await setupLocation();
      await Promise.all([
        loadProfiles(loadedFilters, loc),
        loadMyPhoto(),
        setupPushToken(),
        initAudio(),
        loadMuteState(),
      ]);
      setLoading(false);
      initialLoadDone.current = true;
    };
    init();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!initialLoadDone.current) return;
      AsyncStorage.getItem("swipeFilters").then((stored) => {
        const newFilters = stored ? JSON.parse(stored) : filters;
        const newKey = JSON.stringify(newFilters);
        // Ne recharge que si les filtres ont changé depuis le dernier chargement
        if (newKey === loadedFiltersKey.current) return;
        loadedFiltersKey.current = newKey;
        setFilters(newFilters);
        setIndex(0);
        loadProfiles(newFilters, userLocation);
      });
    }, [userLocation])
  );

  const loadFilters = async () => {
    try {
      const stored = await AsyncStorage.getItem("swipeFilters");
      if (stored) {
        const parsed = JSON.parse(stored);
        setFilters(parsed);
        loadedFiltersKey.current = stored;
        return parsed;
      }
    } catch (e) {}
    const defaults = { minAge: 18, maxAge: 50, maxDistance: null, genderPref: null };
    loadedFiltersKey.current = JSON.stringify(defaults);
    return defaults;
  };

  const setupLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      await API.put(`/user/${userId}/location`, coords);
      return coords;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {});

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(async (response) => {
        const data = response.notification.request.content.data;
        if (data?.matchId && data?.senderId) {
          try {
            const userRes = await API.get(`/user/${data.senderId}`);
            navigation.navigate("ChatScreen", {
              matchId: data.matchId,
              currentUserId: userId,
              user: userRes.data,
            });
          } catch (err) {}
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  const setupPushToken = async () => {
    try {
      if (!Device.isDevice) return;
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") return;
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      if (!token) return;
      await API.post("/user/push-token", { user_id: userId, push_token: token });
    } catch (err) {}
  };

  const loadProfiles = async (filtersToUse, loc) => {
    try {
      const params = {};
      if (filtersToUse?.minAge) params.min_age = filtersToUse.minAge;
      if (filtersToUse?.maxAge) params.max_age = filtersToUse.maxAge;
      if (filtersToUse?.maxDistance) params.max_distance = filtersToUse.maxDistance;
      if (filtersToUse?.genderPref) params.gender_pref = filtersToUse.genderPref;
      if (loc) {
        params.lat = loc.latitude;
        params.lon = loc.longitude;
      }
      const response = await API.get(`/profiles/${userId}`, { params });
      setProfiles(response.data.profiles || []);
    } catch (error) {}
  };

  const loadMyPhoto = async () => {
    try {
      const res = await API.get(`/user/${userId}`);
      setMyPhoto(res.data.photo_url);
    } catch (error) {}
  };

  const nextProfile = () => setIndex((prev) => prev + 1);

  const like = async (likedUserId) => {
    const currentProfile = profiles[index];
    playSound("like");
    try {
      const response = await API.post("/like", { user_id: userId, liked_user_id: likedUserId });
      if (response.data.is_match) {
        playSound("match");
        navigation.navigate("Match", {
          match: currentProfile,
          userPhoto: myPhoto,
          matchId: response.data.match_id,
          currentUserId: userId,
        });
      }
      nextProfile();
    } catch (error) {}
  };

  const dislike = async (dislikedUserId) => {
    playSound("nope");
    try {
      await API.post("/dislike", { user_id: userId, disliked_user_id: dislikedUserId });
    } catch (e) {}
    nextProfile();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (index >= profiles.length) {
    return (
      // edges=["top"] : le bottom safe area est géré par la tab bar
      <SafeAreaView style={styles.center} edges={["top"]}>
        <View style={styles.emptyIconWrapper}>
          <Ionicons name="heart-dislike-outline" size={48} color={colors.textTertiary} />
        </View>
        <Text style={styles.noMore}>Plus de profils pour l'instant</Text>
        <Text style={styles.noMoreSub}>Reviens un peu plus tard 👀</Text>
        <TouchableOpacity
          onPress={() => loadProfiles(filters, userLocation)}
          style={styles.reloadBtn}
        >
          <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.reloadBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentProfile = profiles[index];

  return (
    // edges=["top"] uniquement — la tab bar gère le bas
    <SafeAreaView style={styles.container} edges={["top"]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.headerLogo}>
            <Ionicons name="heart" size={14} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Découvrir</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.mapBtn}
            onPress={() => navigation.navigate("Map", { userId })}
            activeOpacity={0.8}
          >
            <Ionicons name="map-outline" size={19} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => navigation.navigate("Filters")}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={17} color={colors.primary} />
            <Text style={styles.filterBtnText}>Filtres</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Cards ── */}
      <View
        style={styles.cardArea}
        onLayout={(e) => setCardAreaH(e.nativeEvent.layout.height)}
      >
        {profiles[index + 1] && cardAreaH > 0 && (
          <SwipeCard profile={profiles[index + 1]} isNext containerHeight={cardAreaH} />
        )}
        {currentProfile && cardAreaH > 0 && (
          <SwipeCard
            ref={cardRef}
            key={currentProfile.id}
            profile={currentProfile}
            onLike={like}
            onDislike={dislike}
            containerHeight={cardAreaH}
          />
        )}
      </View>

      {/* ── Buttons ── */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.nopeBtn}
          onPress={() => cardRef.current?.swipeLeft()}
          activeOpacity={0.85}
        >
          <Ionicons name="close" size={30} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.likeBtn}
          onPress={() => cardRef.current?.swipeRight()}
          activeOpacity={0.85}
        >
          <Ionicons name="heart" size={26} color="#22C55E" />
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8FA",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8FA",
    padding: 32,
  },

  /* ── Header ── */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
    // Toujours au-dessus des cartes
    zIndex: 10,
    elevation: 10,
  },

  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1A1A2E",
    letterSpacing: 0.1,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  mapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,68,88,0.06)",
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: "rgba(255,68,88,0.06)",
  },

  filterBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },

  /* ── Card area ── */
  cardArea: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },

  /* ── Buttons ── */
  buttons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 32,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 14 : 16,
    backgroundColor: "#F8F8FA",
  },

  nopeBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    borderWidth: 1.5,
    borderColor: "rgba(255,68,88,0.16)",
  },

  likeBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#22C55E",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    borderWidth: 1.5,
    borderColor: "rgba(34,197,94,0.16)",
  },

  /* ── Empty state ── */
  emptyIconWrapper: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  noMore: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 8,
    textAlign: "center",
  },

  noMoreSub: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 28,
    textAlign: "center",
  },

  reloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  reloadBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
