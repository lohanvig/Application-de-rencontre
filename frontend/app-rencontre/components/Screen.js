import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

export default function Screen({ children, style }) {

  const tabBarHeight = useBottomTabBarHeight();

  return (
    <SafeAreaView
      style={[
        {
          flex: 1,
          paddingBottom: tabBarHeight,
          backgroundColor: "#F8F9FB"
        },
        style
      ]}
    >
      {children}
    </SafeAreaView>
  );
}