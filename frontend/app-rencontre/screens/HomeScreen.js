import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import API from "../api/api";
import ProfileCard from "../components/ProfileCard";

export default function HomeScreen({ route }) {

  const { userId } = route.params;

  const [profiles, setProfiles] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {

    try {

      const response = await API.get(`/profiles/${userId}`);

      console.log("API RESPONSE :", response.data);

      setProfiles(response.data.profiles || []);

    } catch (error) {

      console.log("API ERROR :", error);

    } finally {

      setLoading(false);

    }

  };

  const like = async (likedUserId) => {

    await API.post("/like", {
      user_id: userId,
      liked_user_id: likedUserId
    });

    setIndex(index + 1);

  };

  const dislike = () => {
    setIndex(index + 1);
  };

  // ⏳ écran de chargement
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 😢 plus de profils
  if (!profiles[index]) {
    return (
      <View style={styles.center}>
        <Text>No more profiles</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <ProfileCard
        profile={profiles[index]}
        onLike={like}
        onDislike={dislike}
      />

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#F8F9FB"
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  }

});