import React, { useRef, useState, forwardRef, useImperativeHandle } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SWIPE_THRESHOLD = 120;

const SwipeCard = forwardRef(({ profile, onLike, onDislike, isNext }, ref) => {
  const position = useRef(new Animated.ValueXY()).current;
  const [photoIndex, setPhotoIndex] = useState(0);

  const photos =
    profile.photos?.length > 0
      ? profile.photos
      : profile.photo_url
      ? [profile.photo_url]
      : [];

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });

  const cardScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: [0.97, 1, 0.97],
    extrapolate: "clamp",
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const swipeRight = () => {
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => onLike?.(profile.id));
  };

  const swipeLeft = () => {
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => onDislike?.(profile.id));
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      useNativeDriver: false,
    }).start();
  };

  useImperativeHandle(ref, () => ({ swipeRight, swipeLeft }));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isNext,

      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },

      onPanResponderRelease: (evt, gesture) => {
        // Tap (mouvement minimal) → navigation entre photos
        if (Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8) {
          const { locationX } = evt.nativeEvent;
          if (locationX < SCREEN_WIDTH * 0.4) {
            setPhotoIndex((i) => Math.max(0, i - 1));
          } else {
            setPhotoIndex((i) => Math.min(photos.length - 1, i + 1));
          }
          return;
        }

        if (gesture.dx > SWIPE_THRESHOLD) swipeRight();
        else if (gesture.dx < -SWIPE_THRESHOLD) swipeLeft();
        else resetPosition();
      },
    })
  ).current;

  const currentPhoto = photos[photoIndex];

  return (
    <Animated.View
      style={[
        styles.card,
        isNext && styles.nextCard,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate },
            { scale: cardScale },
          ],
        },
      ]}
      {...(!isNext ? panResponder.panHandlers : {})}
    >
      {/* PHOTO */}
      {currentPhoto ? (
        <Image source={{ uri: currentPhoto }} style={styles.image} />
      ) : (
        <View style={styles.noPhoto}>
          <Text style={styles.noPhotoIcon}>📷</Text>
        </View>
      )}

      {/* INDICATEURS PHOTOS */}
      {photos.length > 1 && (
        <View style={styles.dotsContainer}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === photoIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
      )}

      {/* BADGE LIKE */}
      <Animated.View style={[styles.likeBadge, { opacity: likeOpacity }]}>
        <Text style={styles.likeText}>LIKE</Text>
      </Animated.View>

      {/* BADGE NOPE */}
      <Animated.View style={[styles.nopeBadge, { opacity: nopeOpacity }]}>
        <Text style={styles.nopeText}>NOPE</Text>
      </Animated.View>

      {/* INFO OVERLAY */}
      <View style={styles.infoOverlay}>
        <Text style={styles.name}>
          {profile.username}{profile.age ? `, ${profile.age}` : ""}
        </Text>
        {!!profile.bio && (
          <Text style={styles.bio} numberOfLines={2}>
            {profile.bio}
          </Text>
        )}
      </View>
    </Animated.View>
  );
});

export default SwipeCard;

const styles = StyleSheet.create({
  card: {
    width: "100%",
    height: SCREEN_HEIGHT * 0.7,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 6,
    position: "absolute",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },

  nextCard: {
    transform: [{ scale: 0.95 }],
    top: 20,
    opacity: 0.85,
  },

  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  noPhoto: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },

  noPhotoIcon: { fontSize: 60 },

  // Barres de progression photos (style Tinder)
  dotsContainer: {
    position: "absolute",
    top: 10,
    left: 8,
    right: 8,
    flexDirection: "row",
    gap: 4,
  },

  dot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },

  dotActive: { backgroundColor: "rgba(255,255,255,0.95)" },
  dotInactive: { backgroundColor: "rgba(255,255,255,0.4)" },

  // Info en overlay sur la photo
  infoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.42)",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
  },

  name: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  bio: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },

  likeBadge: {
    position: "absolute",
    top: 50,
    left: 20,
    borderWidth: 3,
    borderColor: "#4CAF50",
    backgroundColor: "rgba(76,175,80,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    transform: [{ rotate: "-20deg" }],
  },

  likeText: { fontSize: 32, color: "#4CAF50", fontWeight: "bold" },

  nopeBadge: {
    position: "absolute",
    top: 50,
    right: 20,
    borderWidth: 3,
    borderColor: "#F44336",
    backgroundColor: "rgba(244,67,54,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    transform: [{ rotate: "20deg" }],
  },

  nopeText: { fontSize: 32, color: "#F44336", fontWeight: "bold" },
});
