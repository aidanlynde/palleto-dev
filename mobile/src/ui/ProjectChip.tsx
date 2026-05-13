/**
 * ProjectChip · row showing the currently-active project context.
 */
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../theme";
import { Icon } from "./Icon";
import { Display, Meta, Text } from "./Text";

type Props = {
  name: string;
  projectType: string;
  feeling?: string | null;
  onEdit?: () => void;
};

export function ProjectChip({ name, projectType, feeling, onEdit }: Props) {
  return (
    <Pressable onPress={onEdit} style={({ pressed }) => [s.chip, pressed && { opacity: 0.92 }]}>
      <View style={s.dot} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Meta style={{ marginBottom: 2 }}>WORKING ON</Meta>
        <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap" }}>
          <Display size={18} style={{ lineHeight: 20 }}>{name}</Display>
          <Text style={{ fontSize: 12, color: theme.ink[3], marginLeft: 6 }}>·  {projectType}</Text>
        </View>
        {feeling ? (
          <Text style={{ fontSize: 12, color: theme.ink[3], marginTop: 2 }} numberOfLines={1}>
            {feeling}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron" size={16} color={theme.ink[3]} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: theme.palette.paper,
    borderRadius: theme.radius.lg,
    ...theme.shadow.quiet
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.ink[1]
  }
});
