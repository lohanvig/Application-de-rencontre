import React, { useEffect, useState, useCallback } from "react";
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
import API from "../api/api";
import { useWS } from "../context/WebSocketContext";

export default function LikesScreen({ route, navigation }) {
  const userId = route?.params?.userId;
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myPhoto, setMyPhoto] = useState(null);
  const { onlineUsers } = useWS();

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

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
        navigation.navigate("Match", { match: profile, userPhoto: myPhoto });
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
          {item.username}
          {item.age ? `, ${item.age}` : ""}
        </Text>
        {!!item.bio && (
          <Text style={styles.bio} numberOfLines={1}>
            {item.bio}
          </Text>
        )}
      </View>

      <TouchableOpacity style={styles.passBtn} onPress={() => pass(item.id)}>
        <Text style={styles.passBtnText}>✕</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.likeBtn} onPress={() => likeBack(item)}>
        <Text style={styles.likeBtnText}>❤️</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF4458" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Qui vous a liké</Text>
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🙈</Text>
            <Text style={styles.empty}>Personne ne vous a encore liké</Text>
            <Text style={styles.emptySub}>Continue de swiper !</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FF4458",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },

  listContent: { paddingHorizontal: 12, paddingBottom: 20 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginVertical: 4,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },

  avatarWrapper: { position: "relative" },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#eee",
  },

  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#4CD964",
    borderWidth: 2,
    borderColor: "#fff",
  },

  avatarFallback: {
    backgroundColor: "#FFD6D6",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarInitial: { fontSize: 22, fontWeight: "700", color: "#FF4458" },

  info: { flex: 1, marginLeft: 14 },

  name: { fontSize: 16, fontWeight: "700", color: "#222", marginBottom: 3 },

  bio: { fontSize: 13, color: "#888" },

  passBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },

  passBtnText: { fontSize: 16, color: "#888" },

  likeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF0F0",
    justifyContent: "center",
    alignItems: "center",
  },

  likeBtnText: { fontSize: 20 },

  emptyContainer: { alignItems: "center", paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  empty: { fontSize: 17, fontWeight: "600", color: "#555", marginBottom: 6 },
  emptySub: { fontSize: 14, color: "#999" },
});
