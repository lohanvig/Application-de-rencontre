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
import { playSound } from "../utils/sounds";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SWIPE_THRESHOLD = 120;

// Décalage vertical du current card → le haut de la next card dépasse de ~16px
const CARD_OFFSET_Y = 28;

const SwipeCard = forwardRef(({ profile, onLike, onDislike, isNext, containerHeight }, ref) => {
  const position = useRef(new Animated.ValueXY()).current;
  const [photoIndex, setPhotoIndex] = useState(0);

  // Hauteur = 92% de la zone disponible (assure qu'il n'y a pas de débordement)
  const cardH = containerHeight
    ? Math.floor(containerHeight * 0.92)
    : Math.floor(SCREEN_HEIGHT * 0.62);

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
            setPhotoIndex((i) => {
              const next = Math.max(0, i - 1);
              if (next !== i) playSound("photo");
              return next;
            });
          } else {
            setPhotoIndex((i) => {
              const next = Math.min(photos.length - 1, i + 1);
              if (next !== i) playSound("photo");
              return next;
            });
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

  // ── Next card : scale 0.95, position à y=0 → son haut (~y=12) dépasse le current (y=28)
  const nextCardStyle = {
    transform: [{ scale: 0.95 }],
  };

  // ── Current card : translateY = gesture.dy + CARD_OFFSET_Y (décalé vers le bas)
  const currentCardStyle = {
    transform: [
      { translateX: position.x },
      { translateY: Animated.add(position.y, CARD_OFFSET_Y) },
      { rotate },
    ],
  };

  return (
    <Animated.View
      style={[
        styles.card,
        { height: cardH },
        isNext ? nextCardStyle : currentCardStyle,
      ]}
      {...(!isNext ? panResponder.panHandlers : {})}
    >
      {currentPhoto ? (
        <Image source={{ uri: currentPhoto }} style={styles.image} />
      ) : (
        <View style={styles.noPhoto}>
          <Ionicons name="camera-outline" size={52} color="#D1D5DB" />
          <Text style={styles.noPhotoText}>Pas de photo</Text>
        </View>
      )}

      {/* Barres de navigation photos */}
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

      {/* Badge LIKE */}
      <Animated.View style={[styles.likeBadge, { opacity: likeOpacity }]}>
        <Text style={styles.likeText}>LIKE</Text>
      </Animated.View>

      {/* Badge NOPE */}
      <Animated.View style={[styles.nopeBadge, { opacity: nopeOpacity }]}>
        <Text style={styles.nopeText}>NOPE</Text>
      </Animated.View>

      {/* Overlay info */}
      <View style={styles.infoOverlay} pointerEvents="none">
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {profile.username}{profile.age ? `, ${profile.age}` : ""}
          </Text>
          {profile.distance != null && (
            <View style={styles.distanceBadge}>
              <Ionicons name="location" size={11} color="rgba(255,255,255,0.95)" />
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
    borderRadius: 24,
    overflow: "hidden",
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  noPhoto: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  noPhotoText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  dotsContainer: {
    position: "absolute",
    top: 12,
    left: 10,
    right: 10,
    flexDirection: "row",
    gap: 4,
  },

  dot: { flex: 1, height: 3, borderRadius: 2 },
  dotActive: { backgroundColor: "rgba(255,255,255,0.98)" },
  dotInactive: { backgroundColor: "rgba(255,255,255,0.35)" },

  infoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 22,
    backgroundColor: "rgba(0,0,0,0.42)",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 5,
  },

  name: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  distanceText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "600",
  },

  bio: {
    fontSize: 14,
    color: "rgba(255,255,255,0.88)",
    lineHeight: 20,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  likeBadge: {
    position: "absolute",
    top: 52,
    left: 18,
    borderWidth: 3,
    borderColor: "#22C55E",
    backgroundColor: "rgba(34,197,94,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    transform: [{ rotate: "-18deg" }],
  },

  likeText: { fontSize: 28, color: "#22C55E", fontWeight: "900", letterSpacing: 1 },

  nopeBadge: {
    position: "absolute",
    top: 52,
    right: 18,
    borderWidth: 3,
    borderColor: "#FF4458",
    backgroundColor: "rgba(255,68,88,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    transform: [{ rotate: "18deg" }],
  },

  nopeText: { fontSize: 28, color: "#FF4458", fontWeight: "900", letterSpacing: 1 },
});
