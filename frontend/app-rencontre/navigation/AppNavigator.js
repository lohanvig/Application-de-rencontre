import { useEffect, createRef } from "react";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import MatchesScreen from "../screens/MatchesScreen";
import LikesScreen from "../screens/LikesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MatchScreen from "../screens/MatchScreen";
import ChatScreen from "../screens/ChatScreen";
import FiltersScreen from "../screens/FiltersScreen";
import CallScreen from "../screens/CallScreen";
import IncomingCallScreen from "../screens/IncomingCallScreen";

import { WebSocketProvider } from "../context/WebSocketContext";
import { Ionicons } from "@expo/vector-icons";

// Ref globale pour naviguer depuis n'importe où (ex : appel entrant depuis le contexte WS)
export const navigationRef = createRef();

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function LoadingScreen({ navigation }) {
  useEffect(() => {
    AsyncStorage.getItem("userId").then((id) => {
      navigation.replace(id ? "Main" : "Login", id ? { userId: id } : undefined);
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FF4458" }}>
      <ActivityIndicator color="#fff" size="large" />
    </View>
  );
}

function MainTabs({ route }) {
  const userId = route?.params?.userId;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FF4458",
        tabBarInactiveTintColor: "#AEAEB2",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#EBEBEB",
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        initialParams={{ userId }}
        options={{
          tabBarLabel: "Découvrir",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Likes"
        component={LikesScreen}
        initialParams={{ userId }}
        options={{
          tabBarLabel: "Likes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-circle" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        initialParams={{ userId }}
        options={{
          tabBarLabel: "Messages",
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
          tabBarLabel: "Profil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

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
        <AuthStack.Screen
          name="Filters"
          component={FiltersScreen}
          options={{ title: "Filtres", presentation: "modal" }}
        />
        <AuthStack.Screen
          name="CallScreen"
          component={CallScreen}
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <AuthStack.Screen
          name="IncomingCall"
          component={IncomingCallScreen}
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
      </AuthStack.Navigator>
    </WebSocketProvider>
  );
}

export default function AppNavigator() {
  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Loading" component={LoadingScreen} />
          <RootStack.Screen name="Login" component={LoginScreen} options={{ headerShown: true }} />
          <RootStack.Screen name="Register" component={RegisterScreen} options={{ headerShown: true }} />
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
