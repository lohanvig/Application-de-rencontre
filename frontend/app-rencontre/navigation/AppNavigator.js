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
import ChatScreen from "../screens/ChatScreen";

import { WebSocketProvider } from "../context/WebSocketContext";
import { Ionicons } from "@expo/vector-icons";

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ route }) {
  const userId = route?.params?.userId;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FF4458",
        tabBarInactiveTintColor: "gray",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        initialParams={{ userId }}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        initialParams={{ userId }}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        initialParams={{ userId }}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Enveloppe toute la partie authentifiée dans un seul WebSocketProvider
// pour garantir une connexion WS unique partagée entre tabs et ChatScreen.
function AuthenticatedNavigator({ route }) {
  const { userId } = route.params;

  return (
    <WebSocketProvider userId={userId}>
      <AuthStack.Navigator>
        <AuthStack.Screen
          name="Tabs"
          component={MainTabs}
          initialParams={{ userId }}
          options={{ headerShown: false }}
        />
        <AuthStack.Screen
          name="Match"
          component={MatchScreen}
          options={{ presentation: "modal", headerShown: false }}
        />
        <AuthStack.Screen name="ChatScreen" component={ChatScreen} />
      </AuthStack.Navigator>
    </WebSocketProvider>
  );
}

export default function AppNavigator() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootStack.Navigator>
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="Register" component={RegisterScreen} />
          <RootStack.Screen
            name="Main"
            component={AuthenticatedNavigator}
            options={{ headerShown: false }}
          />
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
