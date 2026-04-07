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

export default function MatchListScreen({ route, navigation }) {
  const userId = route?.params?.userId;
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      const res = await API.get(`/matches/${userId}`);
      // On s'assure que chaque match a un last_message
      const data = (res.data.matches || []).map((m) => ({
        ...m,
        last_message: m.last_message || "" // placeholder vide si pas de message
      }));
      setMatches(data);
    } catch (err) {
      console.log("MATCH ERROR:", err);
    }
  };

  const openChat = (item) => {
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
        <Text
          style={styles.lastMessage}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.last_message.length > 0
            ? item.last_message
            : "Démarre la conversation 👀"}
        </Text>
      </View>
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
    paddingTop: 60, // on augmente le padding pour que le premier match ne touche pas le haut
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
    shadowRadius: 1
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