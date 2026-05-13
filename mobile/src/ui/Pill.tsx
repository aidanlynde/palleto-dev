/**
 * Pill · the foundational floating control.
 * Three variants:
 *   default — translucent warm-white pill
 *   dark    — solid ink (use sparingly, max 1 per row)
 *   ghost   — transparent
 *
 *   <Pill onPress={...}>Search</Pill>
 *   <Pill icon="search" />                  // icon-only (square pill)
 *   <Pill dark icon="plus">Scan</Pill>
 *
 * Note: uses a translucent white instead of true blur to stay zero-deps.
 * If you add `expo-blur`, swap the View for `<BlurView intensity={40} tint="light">`.
 */
import React from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { theme } from "../theme";
import { Icon, IconName } from "./Icon";
import { Text } from "./Text";

type Props = {
  children?: React.ReactNode;
  icon?: IconName;
  dark?: boolean;
  ghost?: boolean;
  tight?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

export function Pill({ children, icon, dark, ghost, tight, onPress, style }: Props) {
  const iconOnly = !children;
  const height = tight ? 32 : 38;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.pill,
        { height, paddingHorizontal: iconOnly ? 0 : tight ? 12 : 14, minWidth: iconOnly ? height : undefined },
        dark && s.pillDark,
        ghost && s.pillGhost,
        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        style
      ]}
    >
      {icon ? <Icon name={icon} size={tight ? 14 : 16} color={dark ? "#fff" : theme.ink[1]} /> : null}
      {children ? (
        <Text
          style={{
            fontFamily: theme.font.sansMedium,
            fontSize: tight ? 12 : 13,
            color: dark ? "#fff" : theme.ink[1],
            letterSpacing: 0,
            marginLeft: icon ? 6 : 0
          }}
        >
          {children}
        </Text>
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.palette.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    ...theme.shadow.pill
  },
  pillDark: {
    backgroundColor: theme.ink[1],
    borderColor: "rgba(0,0,0,0.6)",
    ...theme.shadow.lifted
  },
  pillGhost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    shadowOpacity: 0,
    elevation: 0
  }
});
