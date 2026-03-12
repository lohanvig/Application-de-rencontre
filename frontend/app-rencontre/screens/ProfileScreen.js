import React from "react";
import { View, Text, Image, StyleSheet, ScrollView } from "react-native";
import { colors } from "../styles/theme";

export default function ProfileScreen({ route }) {

  const { profile } = route.params;

  return (

    <ScrollView style={styles.container}>

      <Image
        source={{ uri: profile.photo_url }}
        style={styles.image}
      />

      <View style={styles.infoContainer}>

        <Text style={styles.username}>
          {profile.username}, {profile.age || "?"}
        </Text>

        <Text style={styles.bio}>
          {profile.bio || "No bio yet"}
        </Text>

      </View>

    </ScrollView>

  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.background
  },

  image: {
    width: "100%",
    height: 420,
    resizeMode: "cover"
  },

  infoContainer: {
    padding: 25
  },

  username: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 10
  },

  bio: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text
  }

});