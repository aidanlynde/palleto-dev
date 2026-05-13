/**
 * Button · primary / secondary / ghost. Always pill-shaped.
 *
 *   <Button onPress={...}>Refine</Button>                  // primary by default
 *   <Button variant="secondary" icon="share">Share</Button>
 */
import React from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { theme } from "../theme";
import { Icon, IconName } from "./Icon";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  icon?: IconName;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  full?: boolean;
};

export function Button({ children, variant = "primary", icon, onPress, disabled, style, full }: Props) {
  const fg =
    variant === "primary" ? "#fff" :
    variant === "destructive" ? theme.colors.error :
    theme.ink[1];

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        full && { flex: 1 },
        variant === "primary" && s.primary,
        variant === "secondary" && s.secondary,
        variant === "ghost" && s.ghost,
        variant === "destructive" && s.destructive,
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
        disabled && { opacity: 0.4 },
        style
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {icon ? <Icon name={icon} size={16} color={fg} /> : null}
        <Text
          style={{
            fontFamily: theme.font.sansMedium,
            fontSize: 15,
            color: fg,
            letterSpacing: 0
          }}
        >
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    height: 50,
    paddingHorizontal: 22,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  primary: {
    backgroundColor: theme.ink[1],
    ...theme.shadow.lifted
  },
  secondary: {
    backgroundColor: theme.palette.paper,
    borderWidth: 1,
    borderColor: theme.palette.line,
    ...theme.shadow.quiet
  },
  ghost: {
    backgroundColor: "transparent"
  },
  destructive: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.error
  }
});
