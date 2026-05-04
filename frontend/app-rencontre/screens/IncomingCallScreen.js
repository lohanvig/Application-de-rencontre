import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWS } from "../context/WebSocketContext";
import { playSound } from "../utils/sounds";

export default function IncomingCallScreen({ route, navigation }) {
  const { callerId, callerName, callerPhoto, sdpOffer, currentUserId } = route.params;
  const { sendWS } = useWS();

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    playSound("receive");

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const accept = () => {
    navigation.replace("CallScreen", {
      isInitiator: false,
      recipientId: callerId,
      recipientName: callerName,
      recipientPhoto: callerPhoto,
      sdpOffer,
      currentUserId,
    });
  };

  const reject = () => {
    sendWS({ type: "call_reject", recipient_id: callerId });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Appel audio entrant</Text>

      <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: pulse }] }]}>
        {callerPhoto ? (
          <Image source={{ uri: callerPhoto }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>
              {(callerName || "?")[0].toUpperCase()}
            </Text>
          </View>
        )}
      </Animated.View>

      <Text style={styles.name}>{callerName}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.rejectBtn} onPress={reject}>
          <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
          <Text style={styles.actionLabel}>Refuser</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.acceptBtn} onPress={accept}>
          <Ionicons name="call" size={32} color="#fff" />
          <Text style={styles.actionLabel}>Accepter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },

  subtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    marginBottom: 40,
    letterSpacing: 0.5,
  },

  avatarWrapper: {
    marginBottom: 28,
    shadowColor: "#FF4458",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },

  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: "#FF4458",
  },

  avatarFallback: {
    backgroundColor: "#FF4458",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarInitial: {
    fontSize: 56,
    fontWeight: "700",
    color: "#fff",
  },

  name: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 60,
  },

  actions: {
    flexDirection: "row",
    gap: 60,
  },

  rejectBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
  },

  acceptBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#4CD964",
    justifyContent: "center",
    alignItems: "center",
  },

  actionLabel: {
    color: "#fff",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "600",
    position: "absolute",
    bottom: -22,
    alignSelf: "center",
    width: 80,
    textAlign: "center",
  },
});
