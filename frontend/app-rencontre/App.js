import React from "react";
import AppNavigator from "./navigation/AppNavigator";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";


export default function App() {
  return <AppNavigator />;
}

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log("PUSH TOKEN:", token);

  return token;
}