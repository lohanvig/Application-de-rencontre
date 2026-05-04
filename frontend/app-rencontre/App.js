import React, { useEffect } from "react";
import { Platform } from "react-native";
import AppNavigator from "./navigation/AppNavigator";
import * as Notifications from "expo-notifications";
import { initAudio } from "./utils/sounds";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF4458",
  });
}

export default function App() {
  useEffect(() => { initAudio(); }, []);
  return <AppNavigator />;
}