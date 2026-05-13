/**
 * Chip · small inline tag. Pill shape.
 *
 *   <Chip>gothic minimalism</Chip>
 *   <Chip mono>№ 024</Chip>
 *   <Chip dot>Active</Chip>
 */
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { theme } from "../theme";
import { Text } from "./Text";

type Props = {
  children: React.ReactNode;
  mono?: boolean;
  dot?: boolean;
  dark?: boolean;
  style?: ViewStyle;
};

export function Chip({ children, mono, dot, dark, style }: Props) {
  return (
    <View style={[s.chip, dark && s.dark, style]}>
      {dot ? <View style={[s.dotEl, dark && { backgroundColor: "#fff" }]} /> : null}
      <Text
        style={{
          fontFamily: mono ? theme.font.mono : theme.font.sansMedium,
          fontSize: mono ? 10.5 : 12,
          color: dark ? "#fff" : theme.ink[1],
          letterSpacing: mono ? 0.7 : -0.1,
          textTransform: mono ? "uppercase" : "none"
        }}
      >
        {children}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    height: 28,
    paddingHorizontal: 10,
    gap: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.palette.paper,
    borderWidth: 1,
    borderColor: theme.palette.line
  },
  dark: {
    backgroundColor: theme.ink[1],
    borderColor: "transparent"
  },
  dotEl: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.ink[1]
  }
});
