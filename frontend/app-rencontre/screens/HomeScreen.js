import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity
} from "react-native";
import API from "../api/api";
import SwipeCard from "../components/SwipeCard";

export default function HomeScreen({ route, navigation }) {

  const { userId } = route.params;

  const [profiles, setProfiles] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [myPhoto, setMyPhoto] = useState(null);

  useEffect(() => {
    loadProfiles();
    loadMyPhoto();
  }, []);

  const loadProfiles = async () => {

    try {

      console.log("USER ID:", userId);

      const response = await API.get(`/profiles/${userId}`);

      console.log("PROFILES:", response.data);

      setProfiles(response.data.profiles || []);

    } catch (error) {

      console.log("API ERROR:", error);

    } finally {

      setLoading(false);

    }

  };

  const loadMyPhoto = async () => {

    try {

      const res = await API.get(`/user/${userId}`);

      console.log("USER API RESPONSE:", res.data);

      setMyPhoto(res.data.photo_url);

    } catch (error) {

      console.log("PHOTO ERROR:", error);

    }

  };

  const nextProfile = () => {
    setIndex((prev) => prev + 1);
  };

  const like = async (likedUserId) => {

    try {

      const response = await API.post("/like", {
        user_id: userId,
        liked_user_id: likedUserId
      });

      console.log("LIKE RESPONSE:", response.data);

      if (response.data.is_match) {

        console.log("MATCH DETECTED");

        navigation.navigate("Match", {
          match: currentProfile,
          userPhoto: myPhoto
        });

      }

      nextProfile();

    } catch (error) {

      console.log("LIKE ERROR:", error);

    }

  };

  const dislike = () => {
    nextProfile();
  };

  // Chargement
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Plus de profils
  if (index >= profiles.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.noMore}>No more profiles 😢</Text>
      </View>
    );
  }

  const currentProfile = profiles[index];

  return (
    <View style={styles.container}>

      {/* Zone cartes */}
      <View style={styles.cardArea}>

        {profiles[index + 1] && (
          <SwipeCard
            profile={profiles[index + 1]}
            isNext
          />
        )}

        {currentProfile && (
          <SwipeCard
            key={currentProfile.id}
            profile={currentProfile}
            onLike={like}
            onDislike={dislike}
          />
        )}

      </View>

      {/* Boutons */}
      <View style={styles.buttons}>

        <TouchableOpacity
          style={[styles.button, styles.dislike]}
          onPress={dislike}
        >
          <Text style={styles.buttonText}>❌</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.like]}
          onPress={() => like(currentProfile.id)}
        >
          <Text style={styles.buttonText}>❤️</Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F8F9FB",
    paddingHorizontal: 20
  },

  cardArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },

  noMore: {
    fontSize: 18,
    color: "#555"
  },

  buttons: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginBottom: 40
  },

  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6
  },

  like: {
    backgroundColor: "#4CAF50"
  },

  dislike: {
    backgroundColor: "#F44336"
  },

  buttonText: {
    fontSize: 30
  }

});