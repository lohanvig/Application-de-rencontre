import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated
} from "react-native";
import Screen from "../components/Screen";
import { playSound } from "../utils/sounds";

export default function MatchScreen({ route, navigation }) {

  const { userPhoto, match } = route.params;

  console.log("USER PHOTO:", userPhoto);
  console.log("MATCH PHOTO:", match.photo_url);

  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;



  useEffect(() => {
    playSound("match");

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();

  }, []);

  return (

    <Screen style={styles.container}>

      <Animated.Text
        style={[
          styles.title,
          { opacity }
        ]}
      >
        💘 It's a Match!
      </Animated.Text>

      <Animated.Text
        style={[
          styles.subtitle,
          { opacity }
        ]}
      >
        You and {match.username} like each other
      </Animated.Text>

      <Animated.Text
        style={[
          styles.heart,
          {
            transform: [{ scale }],
            opacity
          }
        ]}
      >
        ❤️
      </Animated.Text>

      <View style={styles.photos}>

        <Image
          source={{ uri: userPhoto }}
          style={styles.avatar}
        />

        <Image
          source={{ uri: match.photo_url }}
          style={styles.avatar}
        />

      </View>

      <TouchableOpacity
        style={styles.messageBtn}
        onPress={() => navigation.navigate("Chat", { user: match })}
      >
        <Text style={styles.messageText}>Send Message</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.keep}>Keep Swiping</Text>
      </TouchableOpacity>

    </Screen>

  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#FF4458",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },

  title: {
    fontSize: 40,
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },

  subtitle: {
    color: "white",
    marginTop: 10,
    fontSize: 18,
    textAlign: "center"
  },

  heart: {
    fontSize: 80,
    marginVertical: 20
  },

  photos: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 30
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginHorizontal: 10,
    borderWidth: 3,
    borderColor: "white"
  },

  messageBtn: {
    backgroundColor: "white",
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    marginTop: 10
  },

  messageText: {
    color: "#FF4458",
    fontWeight: "bold",
    fontSize: 16
  },

  keep: {
    marginTop: 20,
    color: "white",
    fontSize: 16
  }

});