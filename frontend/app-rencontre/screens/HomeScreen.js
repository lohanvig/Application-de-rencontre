import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

import API from "../api/api";
import SwipeCard from "../components/SwipeCard";

export default function HomeScreen({ route, navigation }) {

  const userId = route?.params?.userId;

  const [profiles, setProfiles] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [myPhoto, setMyPhoto] = useState(null);

  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        loadProfiles(),
        loadMyPhoto(),
        setupPushToken()
      ]);
      setLoading(false);
    };
    init();
  }, []);

  // 🔔 LISTENERS NOTIFICATIONS
  useEffect(() => {

    // notif reçue
    notificationListener.current =
      Notifications.addNotificationReceivedListener(notification => {
        console.log("Notification reçue:", notification);
      });

    // clic sur notif
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(async response => {

        console.log("Notification cliquée:", response);

        const data = response.notification.request.content.data;

        if (data?.matchId && data?.senderId) {
          try {
            const userRes = await API.get(`/user/${data.senderId}`);
            navigation.navigate("ChatScreen", {
              matchId: data.matchId,
              currentUserId: userId,
              user: userRes.data
            });
          } catch (err) {
            console.log("Erreur récupération user depuis notif:", err);
          }
        }

      });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };

  }, []);

  // 📱 PUSH TOKEN
  const setupPushToken = async () => {
    try {
      if (!Device.isDevice) return;

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") return;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

      console.log("PUSH TOKEN:", token);

      if (!token) return;

      await API.post("/user/push-token", {
        user_id: userId,
        push_token: token
      });

      console.log("Push token saved ✅");

    } catch (err) {
      console.log("Push token error:", err);
    }
  };

  const loadProfiles = async () => {
    try {
      const response = await API.get(`/profiles/${userId}`);
      setProfiles(response.data.profiles || []);
    } catch (error) {
      console.log("API ERROR:", error);
    }
  };

  const loadMyPhoto = async () => {
    try {
      const res = await API.get(`/user/${userId}`);
      setMyPhoto(res.data.photo_url);
    } catch (error) {
      console.log("PHOTO ERROR:", error);
    }
  };

  const nextProfile = () => {
    setIndex((prev) => prev + 1);
  };

  const like = async (likedUserId) => {
    const currentProfile = profiles[index];

    try {
      const response = await API.post("/like", {
        user_id: userId,
        liked_user_id: likedUserId
      });

      if (response.data.is_match) {
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (index >= profiles.length) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.noMore}>Plus de profils 👀</Text>
      </SafeAreaView>
    );
  }

  const currentProfile = profiles[index];

  return (
    <SafeAreaView style={styles.container}>

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

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F8F9FB"
  },

  cardArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10
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
    position: "absolute",
    bottom: 30,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-evenly"
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