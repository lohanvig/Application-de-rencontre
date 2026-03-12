import React, { useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder
} from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function SwipeCard({ profile, onLike, onDislike, isNext }) {

  const position = useRef(new Animated.ValueXY()).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp"
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: "clamp"
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: "clamp"
  });

  const panResponder = useRef(
    PanResponder.create({

      onStartShouldSetPanResponder: () => !isNext,

      onPanResponderMove: (evt, gesture) => {

        position.setValue({
          x: gesture.dx,
          y: gesture.dy
        });

      },

      onPanResponderRelease: (evt, gesture) => {

        if (gesture.dx > 120) {
          swipeRight();
        }
        else if (gesture.dx < -120) {
          swipeLeft();
        }
        else {
          resetPosition();
        }

      }

    })
  ).current;

  const swipeRight = () => {

    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 },
      duration: 250,
      useNativeDriver: false
    }).start(() => onLike(profile.id));

  };

  const swipeLeft = () => {

    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
      duration: 250,
      useNativeDriver: false
    }).start(() => onDislike(profile.id));

  };

  const resetPosition = () => {

    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      useNativeDriver: false
    }).start();

  };

  return (

    <Animated.View
      style={[
        styles.card,
        isNext && styles.nextCard,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate }
          ]
        }
      ]}
      {...(!isNext ? panResponder.panHandlers : {})}
    >

      {/* IMAGE */}
      {profile.photo_url ? (
        <Image
          source={{ uri: profile.photo_url }}
          style={styles.image}
        />
      ) : (
        <View style={styles.noPhoto}>
          <Text style={{ fontSize: 40 }}>📷</Text>
        </View>
      )}

      {/* LIKE */}
      <Animated.View style={[styles.likeBadge, { opacity: likeOpacity }]}>
        <Text style={styles.likeText}>LIKE</Text>
      </Animated.View>

      {/* NOPE */}
      <Animated.View style={[styles.nopeBadge, { opacity: nopeOpacity }]}>
        <Text style={styles.nopeText}>NOPE</Text>
      </Animated.View>

      {/* INFOS */}
      <View style={styles.info}>

        <Text style={styles.name}>
          {profile.username}, {profile.age}
        </Text>

        <Text style={styles.bio}>
          {profile.bio}
        </Text>

      </View>

    </Animated.View>

  );

}

const styles = StyleSheet.create({

  card: {
    position: "absolute",
    width: "100%",
    height: 520,
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",

    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6
  },

  nextCard: {
    transform: [{ scale: 0.95 }],
    top: 10
  },

  image: {
    width: "100%",
    height: 380,
    resizeMode: "cover"
  },

  noPhoto: {
    width: "100%",
    height: 380,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EEE"
  },

  info: {
    padding: 20
  },

  name: {
    fontSize: 24,
    fontWeight: "700"
  },

  bio: {
    marginTop: 5,
    color: "#555"
  },

  likeBadge: {
    position: "absolute",
    top: 50,
    left: 20,
    borderWidth: 3,
    borderColor: "#4CAF50",
    padding: 10,
    borderRadius: 10,
    transform: [{ rotate: "-20deg" }]
  },

  likeText: {
    fontSize: 32,
    color: "#4CAF50",
    fontWeight: "bold"
  },

  nopeBadge: {
    position: "absolute",
    top: 50,
    right: 20,
    borderWidth: 3,
    borderColor: "#F44336",
    padding: 10,
    borderRadius: 10,
    transform: [{ rotate: "20deg" }]
  },

  nopeText: {
    fontSize: 32,
    color: "#F44336",
    fontWeight: "bold"
  }

});