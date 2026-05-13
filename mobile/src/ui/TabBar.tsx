/**
 * TabBar · floating bottom bar with a center FAB.
 * Two text tabs (Library, Profile) flanking a dark plus pill.
 */
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../theme";
import { Icon } from "./Icon";
import { Text } from "./Text";

type Tab = "library" | "profile";

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
  onScan: () => void;
};

export function TabBar({ active, onChange, onScan }: Props) {
  return (
    <View style={s.wrap} pointerEvents="box-none">
      <View style={s.bar}>
        <TabButton label="Library" active={active === "library"} onPress={() => onChange("library")} />
        <Pressable
          onPress={onScan}
          style={({ pressed }) => [s.fab, pressed && { transform: [{ scale: 0.96 }] }]}
        >
          <Icon name="plus" size={22} color="#fff" />
        </Pressable>
        <TabButton label="Profile" active={active === "profile"} onPress={() => onChange("profile")} />
      </View>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.tab}>
      <Text
        style={{
          fontFamily: theme.font.sansMedium,
          fontSize: 13,
          letterSpacing: 0,
          color: active ? theme.ink[1] : theme.ink[3]
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 28,
    alignItems: "center"
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: theme.palette.glass,
    borderRadius: theme.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    ...theme.shadow.pill
  },
  tab: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.ink[1],
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
    ...theme.shadow.fab
  }
});
