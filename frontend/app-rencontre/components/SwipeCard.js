import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
    outputRange: ["-8deg", "0deg", "8deg"],
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
          ],
        },
      ]}
      {...(!isNext ? panResponder.panHandlers : {})}
    >
      {currentPhoto ? (
        <Image source={{ uri: currentPhoto }} style={styles.image} />
      ) : (
        <View style={styles.noPhoto}>
          <Ionicons name="camera-outline" size={56} color="#ccc" />
          <Text style={styles.noPhotoText}>Pas de photo</Text>
        </View>
      )}

      {/* Photo progress bars */}
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

      {/* LIKE badge */}
      <Animated.View style={[styles.likeBadge, { opacity: likeOpacity }]}>
        <Text style={styles.likeText}>LIKE</Text>
      </Animated.View>

      {/* NOPE badge */}
      <Animated.View style={[styles.nopeBadge, { opacity: nopeOpacity }]}>
        <Text style={styles.nopeText}>NOPE</Text>
      </Animated.View>

      {/* Scrim + info */}
      <View style={styles.infoOverlay} pointerEvents="none">
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {profile.username}{profile.age ? `, ${profile.age}` : ""}
          </Text>
          {profile.distance != null && (
            <View style={styles.distanceBadge}>
              <Ionicons name="location" size={11} color="rgba(255,255,255,0.9)" />
              <Text style={styles.distanceText}>{profile.distance} km</Text>
            </View>
          )}
        </View>
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
    height: SCREEN_HEIGHT * 0.68,
    borderRadius: 22,
    overflow: "hidden",
    position: "absolute",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  nextCard: {
    transform: [{ scale: 0.94 }],
    top: 18,
  },

  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  noPhoto: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  noPhotoText: {
    fontSize: 15,
    color: "#bbb",
  },

  dotsContainer: {
    position: "absolute",
    top: 12,
    left: 10,
    right: 10,
    flexDirection: "row",
    gap: 4,
  },

  dot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },

  dotActive: { backgroundColor: "rgba(255,255,255,0.95)" },
  dotInactive: { backgroundColor: "rgba(255,255,255,0.35)" },

  infoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 24,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },

  name: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  distanceText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },

  bio: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  likeBadge: {
    position: "absolute",
    top: 52,
    left: 20,
    borderWidth: 3,
    borderColor: "#30D158",
    backgroundColor: "rgba(48,209,88,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    transform: [{ rotate: "-18deg" }],
  },

  likeText: { fontSize: 30, color: "#30D158", fontWeight: "900", letterSpacing: 1 },

  nopeBadge: {
    position: "absolute",
    top: 52,
    right: 20,
    borderWidth: 3,
    borderColor: "#FF4458",
    backgroundColor: "rgba(255,68,88,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    transform: [{ rotate: "18deg" }],
  },

  nopeText: { fontSize: 30, color: "#FF4458", fontWeight: "900", letterSpacing: 1 },
});
