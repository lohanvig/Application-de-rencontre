import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Circle } from "react-native-maps";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../api/api";
import { colors } from "../styles/theme";

export default function MapScreen({ route, navigation }) {
  const { userId } = route.params;

  const [profiles, setProfiles] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [maxDistance, setMaxDistance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const mapRef = useRef(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let loc = null;
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserLocation(loc);
      }
      await loadProfiles(loc);
    } catch (e) {
      console.log("MAP INIT ERROR:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async (loc) => {
    try {
      const stored = await AsyncStorage.getItem("swipeFilters");
      const filters = stored ? JSON.parse(stored) : {};
      const params = {};
      if (filters.minAge) params.min_age = filters.minAge;
      if (filters.maxAge) params.max_age = filters.maxAge;
      if (filters.maxDistance) {
        params.max_distance = filters.maxDistance;
        setMaxDistance(filters.maxDistance);
      }
      if (loc) {
        params.lat = loc.latitude;
        params.lon = loc.longitude;
      }
      const res = await API.get(`/profiles/${userId}`, { params });
      const list = (res.data.profiles || []).filter(
        (p) => p.lat_approx != null && p.lon_approx != null
      );
      setProfiles(list);
    } catch (e) {
      console.log("MAP LOAD ERROR:", e);
    }
  };

  const selectProfile = (profile) => {
    setSelected(profile);
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start();

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: profile.lat_approx,
          longitude: profile.lon_approx,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        400
      );
    }
  };

  const dismissProfile = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setSelected(null));
  };

  const likeProfile = async (profile) => {
    try {
      await API.post("/like", { user_id: userId, liked_user_id: profile.id });
      setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
      dismissProfile();
    } catch (e) {
      console.log("LIKE ERROR:", e);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const initialRegion = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      }
    : {
        latitude: 48.8566,
        longitude: 2.3522,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>À proximité</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{profiles.length}</Text>
        </View>
      </View>

      {/* Carte */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => selected && dismissProfile()}
      >
        {/* Cercle de proximité autour de l'utilisateur */}
        {userLocation && maxDistance != null && (
          <Circle
            center={userLocation}
            radius={maxDistance * 1000}
            fillColor="rgba(255,68,88,0.06)"
            strokeColor="rgba(255,68,88,0.2)"
            strokeWidth={1}
          />
        )}

        {/* Marqueurs des profils */}
        {profiles.map((profile) => (
          <Marker
            key={profile.id}
            coordinate={{ latitude: profile.lat_approx, longitude: profile.lon_approx }}
            onPress={() => selectProfile(profile)}
          >
            <View style={[styles.marker, selected?.id === profile.id && styles.markerSelected]}>
              {profile.photo_url ? (
                <Image source={{ uri: profile.photo_url }} style={styles.markerPhoto} />
              ) : (
                <View style={styles.markerFallback}>
                  <Text style={styles.markerInitial}>
                    {(profile.username || "?")[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.markerTail} />
          </Marker>
        ))}
      </MapView>

      {/* Bulle de profil sélectionné */}
      {selected && (
        <Animated.View
          style={[styles.profileCard, { transform: [{ translateY: slideAnim }] }]}
        >
          <TouchableOpacity style={styles.cardDismiss} onPress={dismissProfile} activeOpacity={0.7}>
            <View style={styles.cardHandle} />
          </TouchableOpacity>

          <View style={styles.cardContent}>
            {selected.photo_url ? (
              <Image source={{ uri: selected.photo_url }} style={styles.cardPhoto} />
            ) : (
              <View style={[styles.cardPhoto, styles.cardPhotoFallback]}>
                <Text style={styles.cardInitial}>
                  {(selected.username || "?")[0].toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>
                {selected.username}{selected.age ? `, ${selected.age}` : ""}
              </Text>
              {selected.distance != null && (
                <View style={styles.cardDistance}>
                  <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.cardDistanceText}>{selected.distance} km · Zone approximative</Text>
                </View>
              )}
              {!!selected.bio && (
                <Text style={styles.cardBio} numberOfLines={2}>
                  {selected.bio}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.passBtn} onPress={dismissProfile} activeOpacity={0.8}>
              <Ionicons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.likeBtn}
              onPress={() => likeProfile(selected)}
              activeOpacity={0.85}
            >
              <Ionicons name="heart" size={22} color="#fff" />
              <Text style={styles.likeBtnText}>J'aime</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F8FA" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
    gap: 12,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A2E",
  },

  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  countText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },

  map: {
    flex: 1,
  },

  /* ── Markers ── */
  marker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "#fff",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },

  markerSelected: {
    borderColor: colors.primary,
    borderWidth: 3,
    width: 56,
    height: 56,
    borderRadius: 28,
  },

  markerPhoto: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  markerFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },

  markerInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },

  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
    alignSelf: "center",
    marginTop: -1,
  },

  /* ── Profile card ── */
  profileCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },

  cardDismiss: {
    alignItems: "center",
    paddingVertical: 12,
  },

  cardHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
  },

  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 14,
    marginBottom: 16,
  },

  cardPhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F3F4F6",
  },

  cardPhotoFallback: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
  },

  cardInitial: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
  },

  cardInfo: {
    flex: 1,
    gap: 4,
  },

  cardName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A2E",
  },

  cardDistance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  cardDistanceText: {
    fontSize: 12,
    color: "#6B7280",
  },

  cardBio: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
  },

  passBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFF0F1",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,68,88,0.2)",
  },

  likeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 26,
    paddingVertical: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  likeBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
