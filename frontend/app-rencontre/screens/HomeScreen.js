import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import API from "../api/api";
import ProfileCard from "../components/ProfileCard";
import { colors } from "../styles/theme";

export default function HomeScreen({ route }) {

  const { userId } = route.params;

  const [profiles, setProfiles] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const dislike = () => {
    setIndex(index + 1);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {

    const response = await API.get(`/profiles/${userId}`);

    console.log(response.data); // 🔍 debug

    setProfiles(response.data.profiles);
  };

  const like = async (likedUserId) => {

    try {

      const response = await API.post("/like", {
        user_id: userId,
        liked_user_id: likedUserId
      });

      if (response.data.is_match) {
        alert("🔥 It's a Match!");
      }

    } catch (error) {
      console.log(error);
    }

    setIndex(index + 1);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profiles[index]) {
    return (
      <View style={styles.center}>
        <Text style={styles.noMore}>No more profiles 😢</Text>
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
    backgroundColor: colors.background
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background
  },

  noMore: {
    fontSize: 20,
    color: colors.text,
    fontWeight: "500"
  }

});