import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../styles/theme";

export default function ProfileCard({ profile, onLike, onDislike }) {

  return (

    <View style={styles.card}>

      <Image
        source={{ uri: profile.photo_url }}
        style={styles.image}
      />

      <View style={styles.info}>

        <Text style={styles.name}>
          {profile.username}, {profile.age || "?"}
        </Text>

        <Text style={styles.bio}>
          {profile.bio || "No bio yet"}
        </Text>

      </View>

      <View style={styles.buttons}>

        <TouchableOpacity
          style={[styles.button, styles.dislike]}
          onPress={() => onDislike(profile.id)}
        >
          <Text style={styles.buttonText}>❌</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.like]}
          onPress={() => onLike(profile.id)}
        >
          <Text style={styles.buttonText}>❤️</Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  card: {
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 4
  },

  image: {
    width: "100%",
    height: 400
  },

  info: {
    padding: 20
  },

  name: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.primary
  },

  bio: {
    marginTop: 10,
    fontSize: 16,
    color: "#444"
  },

  buttons: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20
  },

  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center"
  },

  like: {
    backgroundColor: "#4CAF50"
  },

  dislike: {
    backgroundColor: "#FF5252"
  },

  buttonText: {
    fontSize: 28
  }

});