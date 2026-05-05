import { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { playSound } from "../utils/sounds";
import { colors } from "../styles/theme";

export default function MatchScreen({ route, navigation }) {
  const { userPhoto, match, matchId, currentUserId } = route.params;

  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    playSound("match");

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Decorative circles */}
      <View style={styles.circleOuter} />
      <View style={styles.circleInner} />

      <Animated.View style={[styles.content, { opacity, transform: [{ translateY: slideUp }] }]}>
        <View style={styles.iconWrapper}>
          <Ionicons name="heart" size={36} color="#fff" />
        </View>

        <Text style={styles.title}>It's a Match!</Text>
        <Text style={styles.subtitle}>
          Toi et <Text style={styles.subtitleBold}>{match.username}</Text> vous vous plaisez 🎉
        </Text>

        <Animated.View style={[styles.photosRow, { transform: [{ scale }] }]}>
          <View style={styles.photoWrapper}>
            {userPhoto ? (
              <Image source={{ uri: userPhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>Moi</Text>
              </View>
            )}
          </View>

          <View style={styles.heartSeparator}>
            <Ionicons name="heart" size={28} color="#fff" />
          </View>

          <View style={styles.photoWrapper}>
            <Image source={{ uri: match.photo_url }} style={styles.avatar} />
          </View>
        </Animated.View>

        <TouchableOpacity
          style={styles.messageBtn}
          onPress={() =>
            navigation.navigate("ChatScreen", { matchId, user: match, currentUserId })
          }
          activeOpacity={0.88}
        >
          <Ionicons name="chatbubble" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.messageText}>Envoyer un message</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.keepBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.keepText}>Continuer à swiper</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FF4458",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  circleOuter: {
    position: "absolute",
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -180,
    alignSelf: "center",
  },

  circleInner: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -60,
    alignSelf: "center",
  },

  content: {
    alignItems: "center",
    paddingHorizontal: 28,
    width: "100%",
  },

  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  title: {
    fontSize: 42,
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  subtitle: {
    color: "rgba(255,255,255,0.85)",
    marginTop: 10,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },

  subtitleBold: {
    fontWeight: "700",
    color: "#fff",
  },

  photosRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 36,
    gap: 16,
  },

  photoWrapper: {
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  avatar: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.9)",
  },

  avatarFallback: {
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarInitial: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  heartSeparator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 50,
    width: "100%",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  messageText: {
    color: "#FF4458",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.2,
  },

  keepBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },

  keepText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
    fontWeight: "500",
  },
});
