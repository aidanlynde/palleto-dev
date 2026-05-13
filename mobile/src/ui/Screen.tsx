/**
 * Screen · standard background wrapper with paper texture.
 * ScrollScreen · same but scrolls.
 */
import React from "react";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { theme } from "../theme";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
};

export function Screen({ children, style }: Props) {
  return <View style={[s.bg, style]}>{children}</View>;
}

export function ScrollScreen({ children, style, contentContainerStyle }: Props) {
  return (
    <View style={[s.bg, style]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[{ paddingTop: 110, paddingHorizontal: 16, paddingBottom: 130 }, contentContainerStyle]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: theme.palette.bone
  }
});
