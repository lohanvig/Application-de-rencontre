import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import API from "../api/api";
import { useWS } from "../context/WebSocketContext";
import { colors } from "../styles/theme";

export default function MatchListScreen({ route, navigation }) {
  const userId = route?.params?.userId;

  const [matches, setMatches] = useState([]);
  const [lastSeen, setLastSeen] = useState({});
  const { subscribe, unread, markAsRead, onlineUsers } = useWS();
  const tabBarHeight = useBottomTabBarHeight();

  useEffect(() => {
    AsyncStorage.getItem("lastSeen").then((data) => {
      if (data) setLastSeen(JSON.parse(data));
    });
  }, []);

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe((newMessage) => {
      if (newMessage.type !== "new_message") return;

      const matchId = newMessage.match_id;

      setMatches((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((m) => m.match_id === matchId);

        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            last_message: newMessage.content,
            updated_at: newMessage.created_at || new Date().toISOString(),
          };
        } else {
          updated.unshift({
            match_id: matchId,
            username: "Nouveau match",
            photo_url: null,
            last_message: newMessage.content,
            updated_at: newMessage.created_at || new Date().toISOString(),
          });
        }

        updated.sort(
          (a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
        );
        return updated;
      });
    });

    return unsubscribe;
  }, [subscribe]);

  const loadMatches = async () => {
    try {
      const res = await API.get(`/matches/${userId}`);
      const sorted = (res.data.matches || []).sort(
        (a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
      );
      setMatches(sorted);
    } catch (err) {
      console.log("MATCH ERROR:", err);
    }
  };

  const openChat = useCallback(
    (item) => {
      markAsRead(item.match_id);
      const updated = { ...lastSeen, [item.match_id]: new Date().toISOString() };
      setLastSeen(updated);
      AsyncStorage.setItem("lastSeen", JSON.stringify(updated));
      navigation.navigate("ChatScreen", {
        matchId: item.match_id,
        user: item,
        currentUserId: userId,
      });
    },
    [markAsRead, navigation, userId, lastSeen]
  );

  const unmatch = useCallback((matchId) => {
    Alert.alert(
      "Supprimer ce match ?",
      "La conversation sera définitivement supprimée.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await API.delete(`/match/${matchId}`);
              setMatches((prev) => prev.filter((m) => m.match_id !== matchId));
            } catch (err) {
              console.log("UNMATCH ERROR:", err);
            }
          },
        },
      ]
    );
  }, []);

  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffH = (now - d) / 3600000;
    if (diffH < 24) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffH < 168) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
  };

  const renderItem = ({ item }) => {
    const wsUnread = unread[item.match_id] || 0;
    const hasNewSinceLastSeen =
      item.updated_at &&
      (!lastSeen[item.match_id] || lastSeen[item.match_id] < item.updated_at);
    const hasUnread = wsUnread > 0 || hasNewSinceLastSeen;
    const isOnline = onlineUsers.has(item.id) || item.is_online;

    return (
      <TouchableOpacity
        style={styles.matchItem}
        onPress={() => openChat(item)}
        onLongPress={() => unmatch(item.match_id)}
        activeOpacity={0.7}
      >
        {hasUnread && <View style={styles.unreadBar} />}

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
          {isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, hasUnread && styles.nameUnread]}
              numberOfLines={1}
            >
              {item.username}
            </Text>
            {item.updated_at && (
              <Text style={styles.timeText}>{formatTime(item.updated_at)}</Text>
            )}
          </View>
          <Text
            style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {item.last_message?.length > 0
              ? item.last_message
              : "Démarre la conversation 👋"}
          </Text>
        </View>

        {hasUnread && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {wsUnread > 0 ? (wsUnread > 99 ? "99+" : wsUnread) : "●"}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSub}>
          {matches.length} conversation{matches.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={matches}
        keyExtractor={(item) => item.match_id.toString()}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 12 }]}
        extraData={unread}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="chatbubble-outline" size={44} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Aucun match pour le moment</Text>
            <Text style={styles.emptySub}>Continue de swiper pour trouver ta moitié !</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

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
    paddingTop: 8,
    paddingHorizontal: 14,
  },

  matchItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginVertical: 3,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  unreadBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },

  avatarWrapper: { position: "relative" },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.border,
  },

  avatarFallback: {
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarInitial: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primary,
  },

  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.surface,
  },

  info: {
    flex: 1,
    marginLeft: 14,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  name: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
    flex: 1,
  },

  nameUnread: {
    fontWeight: "700",
  },

  timeText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginLeft: 8,
  },

  lastMessage: {
    fontSize: 14,
    color: colors.textTertiary,
  },

  lastMessageUnread: {
    color: colors.textSecondary,
    fontWeight: "600",
  },

  badge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
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
