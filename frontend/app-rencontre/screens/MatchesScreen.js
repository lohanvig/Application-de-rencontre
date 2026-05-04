import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import API from "../api/api";
import { useWS } from "../context/WebSocketContext";

export default function MatchListScreen({ route, navigation }) {
  const userId = route?.params?.userId;

  const [matches, setMatches] = useState([]);
  const { subscribe, unread, markAsRead } = useWS();

  useEffect(() => {
    loadMatches();
  }, []);

  // Abonnement aux messages WebSocket (connexion partagée via context)
  useEffect(() => {
    const unsubscribe = subscribe((newMessage) => {
      if (newMessage.type !== "new_message") return;

      const matchId = newMessage.match_id;

      setMatches((prev) => {
        const updated = [...prev];
        const index = updated.findIndex((m) => m.match_id === matchId);

        if (index !== -1) {
          updated[index] = {
            ...updated[index],
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
      navigation.navigate("ChatScreen", {
        matchId: item.match_id,
        user: item,
        currentUserId: userId,
      });
    },
    [markAsRead, navigation, userId]
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

  const renderItem = ({ item }) => {
    const unreadCount = unread[item.match_id] || 0;
    const hasUnread = unreadCount > 0;

    return (
      <TouchableOpacity
        style={[styles.matchItem, hasUnread && styles.matchItemUnread]}
        onPress={() => openChat(item)}
        onLongPress={() => unmatch(item.match_id)}
        activeOpacity={0.7}
      >
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
          {hasUnread && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.info}>
          <Text style={[styles.name, hasUnread && styles.nameUnread]}>
            {item.username}
          </Text>
          <Text
            style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {item.last_message?.length > 0
              ? item.last_message
              : "Démarre la conversation 👀"}
          </Text>
        </View>

        {hasUnread && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.match_id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        extraData={unread}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💔</Text>
            <Text style={styles.empty}>Aucun match pour le moment</Text>
            <Text style={styles.emptySub}>Continue de swiper !</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },

  listContent: {
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 12,
  },

  matchItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginVertical: 4,
    backgroundColor: "#fff",
    borderRadius: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },

  matchItemUnread: {
    backgroundColor: "#FFF5F5",
    elevation: 3,
    shadowOpacity: 0.1,
  },

  avatarWrapper: {
    position: "relative",
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#eee",
  },

  avatarFallback: {
    backgroundColor: "#FFD6D6",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarInitial: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FF4458",
  },

  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FF3B30",
    borderWidth: 2,
    borderColor: "#fff",
  },

  info: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },

  name: {
    fontSize: 16,
    fontWeight: "500",
    color: "#222",
    marginBottom: 3,
  },

  nameUnread: {
    fontWeight: "700",
    color: "#000",
  },

  lastMessage: {
    fontSize: 14,
    color: "#999",
  },

  lastMessageUnread: {
    color: "#444",
    fontWeight: "500",
  },

  badge: {
    backgroundColor: "#FF3B30",
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
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  empty: {
    fontSize: 17,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
  },

  emptySub: {
    fontSize: 14,
    color: "#999",
  },
});
