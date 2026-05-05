import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
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
import { playSound } from "../utils/sounds";

export default function HomeScreen({ route, navigation }) {
  const userId = route?.params?.userId;

  const [profiles, setProfiles] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [myPhoto, setMyPhoto] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [filters, setFilters] = useState({ minAge: 18, maxAge: 50, maxDistance: null });

  const notificationListener = useRef();
  const responseListener = useRef();
  const cardRef = useRef();
  const initialLoadDone = useRef(false);

  useEffect(() => {
    const init = async () => {
      const loadedFilters = await loadFilters();
      const loc = await setupLocation();
      await Promise.all([
        loadProfiles(loadedFilters, loc),
        loadMyPhoto(),
        setupPushToken(),
      ]);
      setLoading(false);
      initialLoadDone.current = true;
    };
    init();
  }, []);

  // Recharge les profils quand on revient sur l'écran (ex : retour depuis Filtres)
  useFocusEffect(
    useCallback(() => {
      if (!initialLoadDone.current) return;
      AsyncStorage.getItem("swipeFilters").then((stored) => {
        const newFilters = stored ? JSON.parse(stored) : filters;
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
        return parsed;
      }
    } catch (e) {}
    return { minAge: 18, maxAge: 50, maxDistance: null };
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

  // 🔔 LISTENERS NOTIFICATIONS
  useEffect(() => {
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification reçue:", notification);
      });

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
          } catch (err) {
            console.log("Erreur récupération user depuis notif:", err);
          }
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  // 📱 PUSH TOKEN
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
    } catch (err) {
      console.log("Push token error:", err);
    }
  };

  const loadProfiles = async (filtersToUse, loc) => {
    try {
      const params = {};
      if (filtersToUse?.minAge) params.min_age = filtersToUse.minAge;
      if (filtersToUse?.maxAge) params.max_age = filtersToUse.maxAge;
      if (filtersToUse?.maxDistance) params.max_distance = filtersToUse.maxDistance;
      if (loc) {
        params.lat = loc.latitude;
        params.lon = loc.longitude;
      }
      const response = await API.get(`/profiles/${userId}`, { params });
      setProfiles(response.data.profiles || []);
    } catch (error) {
      console.log("API ERROR:", error);
    }
  };

  const loadMyPhoto = async () => {
    try {
      const res = await API.get(`/user/${userId}`);
      setMyPhoto(res.data.photo_url);
    } catch (error) {
      console.log("PHOTO ERROR:", error);
    }
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
    } catch (error) {
      console.log("LIKE ERROR:", error);
    }
  };

  const dislike = () => {
    playSound("nope");
    nextProfile();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF4458" />
      </View>
    );
  }

  if (index >= profiles.length) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.noMore}>Plus de profils 👀</Text>
        <TouchableOpacity onPress={() => loadProfiles(filters, userLocation)} style={styles.reloadBtn}>
          <Text style={styles.reloadBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentProfile = profiles[index];

  return (
    <SafeAreaView style={styles.container}>
      {/* Bouton filtres */}
      <TouchableOpacity
        style={styles.filterBtn}
        onPress={() => navigation.navigate("Filters")}
      >
        <Ionicons name="options-outline" size={22} color="#FF4458" />
      </TouchableOpacity>

      <View style={styles.cardArea}>
        {profiles[index + 1] && (
          <SwipeCard profile={profiles[index + 1]} isNext />
        )}
        {currentProfile && (
          <SwipeCard
            ref={cardRef}
            key={currentProfile.id}
            profile={currentProfile}
            onLike={like}
            onDislike={dislike}
          />
        )}
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, styles.dislike]}
          onPress={() => cardRef.current?.swipeLeft()}
        >
          <Text style={styles.buttonText}>❌</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.like]}
          onPress={() => cardRef.current?.swipeRight()}
        >
          <Text style={styles.buttonText}>❤️</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },

  cardArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  noMore: { fontSize: 18, color: "#555", marginBottom: 16 },
  reloadBtn: {
    backgroundColor: "#FF4458",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 25,
  },
  reloadBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  filterBtn: {
    position: "absolute",
    top: 12,
    right: 16,
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  buttons: {
    position: "absolute",
    bottom: 30,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-evenly",
  },

  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },

  like: { backgroundColor: "#4CAF50" },
  dislike: { backgroundColor: "#F44336" },
  buttonText: { fontSize: 30 },
});
