import React from "react";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import MatchesScreen from "../screens/MatchesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MatchScreen from "../screens/MatchScreen";

import { Ionicons } from "@expo/vector-icons";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ route }) {

  const { userId } = route.params;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FF4458",
        tabBarInactiveTintColor: "gray"
      }}
    >

      <Tab.Screen
        name="Home"
        component={HomeScreen}
        initialParams={{ userId }}
      />

      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        initialParams={{ userId }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        initialParams={{ userId }}
      />

    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>

          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />

          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="Match"
            component={MatchScreen}
            options={{ presentation: "modal", headerShown: false }}
          />

        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}