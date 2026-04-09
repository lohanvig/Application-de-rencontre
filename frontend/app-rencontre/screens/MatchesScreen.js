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
  const [unreadMessages, setUnreadMessages] = useState({});

  useEffect(() => {
    loadMatches();
  }, []);

  // 🔥 WEBSOCKET TEMPS RÉEL (CORRIGÉ)
  useWebSocket(userId, (newMessage) => {

    const matchId = newMessage.match_id;
    const isMe = newMessage.sender_id === userId;

    // 🔔 unread uniquement si message reçu
    if (!isMe) {
      setUnreadMessages((prev) => ({
        ...prev,
        [matchId]: prev[matchId] ? prev[matchId] + 1 : 1
      }));
    }

    // 💬 update + TRI PROPRE
    setMatches((prev) => {

      let updated = [...prev];

      const index = updated.findIndex(m => m.match_id === matchId);

      if (index !== -1) {
        // 🔄 update match existant
        updated[index] = {
          ...updated[index],
          last_message: newMessage.content,
          updated_at: newMessage.created_at || Date.now()
        };
      } else {
        // ⚠️ cas rare: nouveau match pas encore chargé
        updated.unshift({
          match_id: matchId,
          username: "Nouveau match",
          photo_url: null,
          last_message: newMessage.content,
          updated_at: newMessage.created_at || Date.now()
        });
      }

      // 🔥 TRI PAR DATE (ULTRA IMPORTANT)
      updated.sort((a, b) =>
        new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
      );

      return updated;
    });

  });

  const loadMatches = async () => {
    try {
      const res = await API.get(`/matches/${userId}`);

      const sorted = (res.data.matches || []).sort((a, b) =>
        new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
      );

      setMatches(sorted);

    } catch (err) {
      console.log("MATCH ERROR:", err);
    }
  };

  const openChat = (item) => {

    // 🔕 reset badge
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

  const renderItem = ({ item }) => {

    const unread = unreadMessages[item.match_id] || 0;

    return (
      <TouchableOpacity style={styles.matchItem} onPress={() => openChat(item)}>

        <Image source={{ uri: item.photo_url }} style={styles.avatar} />

        <View style={styles.info}>
          <Text style={styles.name}>{item.username}</Text>

          <Text style={styles.lastMessage}>
            {item.last_message?.length > 0
              ? item.last_message
              : "Démarre la conversation 👀"}
          </Text>
        </View>

        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread}</Text>
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
        extraData={unreadMessages} // 🔥 force refresh badge
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
    elevation: 2
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#eee"
  },

  info: {
    flex: 1,
    marginLeft: 15
  },

  name: {
    fontSize: 18,
    fontWeight: "bold"
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