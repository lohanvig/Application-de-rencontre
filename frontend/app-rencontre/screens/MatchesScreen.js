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
      setMatches(res.data.matches || []);
    } catch (err) {
      console.log(err);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.matchItem}
      onPress={() =>
        navigation.navigate("Chat", {
          matchId: item.match_id,
          user: item
        })
      }
    >

      <Image source={{ uri: item.photo_url }} style={styles.avatar} />

      <View style={styles.info}>
        <Text style={styles.name}>{item.username}</Text>
        <Text style={styles.lastMessage}>
          {item.last_message || "Démarre la conversation 👀"}
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
        ListEmptyComponent={
          <Text style={styles.empty}>Aucun match pour le moment 😢</Text>
        }
      />

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#fff"
  },

  matchItem: {
    flexDirection: "row",
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#eee",
    alignItems: "center"
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30
  },

  info: {
    marginLeft: 15
  },

  name: {
    fontSize: 18,
    fontWeight: "bold"
  },

  lastMessage: {
    color: "#777",
    marginTop: 3
  },

  empty: {
    textAlign: "center",
    marginTop: 50
  }

});