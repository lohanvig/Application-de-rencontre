import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet
} from "react-native";
import API from "../api/api";
import useWebSocket from "../hooks/useWebSocket";

export default function MatchListScreen({ route, navigation }) {
  const userId = route?.params?.userId;
  const [matches, setMatches] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({}); // { match_id: count }

  useEffect(() => {
    loadMatches();
  }, []);

  // 🔹 Hook WebSocket pour les notifications in-app
  useWebSocket(userId, (newMessage) => {
    const matchId = newMessage.match_id;
    setUnreadMessages((prev) => ({
      ...prev,
      [matchId]: prev[matchId] ? prev[matchId] + 1 : 1
    }));
  });

  const loadMatches = async () => {
    try {
      const res = await API.get(`/matches/${userId}`);
      setMatches(res.data.matches || []);
    } catch (err) {
      console.log("MATCH ERROR:", err);
    }
  };

  const openChat = (item) => {
    // reset le badge de ce match
    setUnreadMessages((prev) => ({
      ...prev,
      [item.match_id]: 0
    }));

    navigation.navigate("ChatScreen", {
      matchId: item.match_id,
      user: item,
      currentUserId: userId
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.matchItem} onPress={() => openChat(item)}>
      <Image source={{ uri: item.photo_url }} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.name}>{item.username}</Text>
        <Text style={styles.lastMessage}>
          {item.last_message && item.last_message.length > 0
            ? item.last_message
            : "Démarre la conversation 👀"}
        </Text>
      </View>
      {/* Badge de nouveau message */}
      {unreadMessages[item.match_id] > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadMessages[item.match_id]}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.match_id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>Aucun match pour le moment 😢</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },

  listContent: {
    paddingTop: 60,
    paddingBottom: 20
  },

  matchItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 10,
    marginVertical: 5,
    backgroundColor: "#fff",
    borderRadius: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1,
    position: "relative"
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#eee"
  },

  info: {
    flex: 1,
    marginLeft: 15,
    justifyContent: "center"
  },

  name: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2
  },

  lastMessage: {
    fontSize: 14,
    color: "#777"
  },

  badge: {
    position: "absolute",
    right: 15,
    top: 15,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    justifyContent: "center",
    alignItems: "center"
  },

  badgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50
  },

  empty: {
    fontSize: 16,
    color: "#555"
  }
});