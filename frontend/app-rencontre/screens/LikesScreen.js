import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import API from "../api/api";
import { useWS } from "../context/WebSocketContext";
import { colors } from "../styles/theme";

export default function LikesScreen({ route, navigation }) {
  const userId = route?.params?.userId;
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myPhoto, setMyPhoto] = useState(null);
  const { onlineUsers, subscribe } = useWS();

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      if (msg.type === "new_like") load();
    });
    return unsubscribe;
  }, [subscribe]);

  const load = async () => {
    setLoading(true);
    try {
      const [likesRes, meRes] = await Promise.all([
        API.get(`/likes/received/${userId}`),
        API.get(`/user/${userId}`),
      ]);
      const list = likesRes.data.profiles || [];
      setProfiles(list);
      setMyPhoto(meRes.data.photo_url);
      navigation.setOptions({
        tabBarBadge: list.length > 0 ? list.length : null,
      });
    } catch (err) {
      console.log("LIKES ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const likeBack = async (profile) => {
    try {
      const res = await API.post("/like", {
        user_id: userId,
        liked_user_id: profile.id,
      });
      setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
      if (res.data.is_match) {
        navigation.navigate("Match", {
          match: profile,
          userPhoto: myPhoto,
          matchId: res.data.match_id,
          currentUserId: userId,
        });
      }
    } catch (err) {
      console.log("LIKE ERROR:", err);
    }
  };

  const pass = (profileId) => {
    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatarWrapper}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>
              {(item.username || "?")[0].toUpperCase()}
            </Text>
          </View>
        )}
        {(onlineUsers.has(item.id) || item.is_online) && (
          <View style={styles.onlineDot} />
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>
          {item.username}{item.age ? `, ${item.age}` : ""}
        </Text>
        {!!item.bio && (
          <Text style={styles.bio} numberOfLines={1}>
            {item.bio}
          </Text>
        )}
        {item.distance != null && (
          <View style={styles.distanceRow}>
            <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
            <Text style={styles.distance}>{item.distance} km</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.passBtn} onPress={() => pass(item.id)} activeOpacity={0.7}>
        <Ionicons name="close" size={20} color={colors.textTertiary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.likeBtn} onPress={() => likeBack(item)} activeOpacity={0.8}>
        <Ionicons name="heart" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Qui vous a liké</Text>
        <Text style={styles.headerSub}>
          {profiles.length > 0
            ? `${profiles.length} personne${profiles.length > 1 ? "s" : ""} t'attend${profiles.length > 1 ? "ent" : ""}`
            : "Aucun like pour le moment"}
        </Text>
      </View>

      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="heart-outline" size={44} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Pas encore de likes</Text>
            <Text style={styles.emptySub}>Continue de swiper pour te faire remarquer !</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
  },

  headerSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  avatarWrapper: { position: "relative" },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.border,
  },

  avatarFallback: {
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarInitial: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },

  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.surface,
  },

  info: {
    flex: 1,
    marginLeft: 14,
    gap: 3,
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },

  bio: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 1,
  },

  distance: {
    fontSize: 12,
    color: colors.textTertiary,
  },

  passBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },

  likeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },

  emptyIconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },

  emptySub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
