/**
 * SectionCard · the basic content container.
 *
 *   <SectionCard eyebrow="PALETTE">
 *     <PaletteHero colors={...} />
 *   </SectionCard>
 *
 *   <SectionCard eyebrow="VISUAL DNA" title="What to steal">
 *     ...
 *   </SectionCard>
 */
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { theme } from "../theme";
import { Display, Meta } from "./Text";

type Props = {
  eyebrow?: string;
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
};

export function SectionCard({ eyebrow, title, children, style, padding = 18 }: Props) {
  return (
    <View style={[s.card, { padding }, style]}>
      {eyebrow ? <Meta style={{ marginBottom: title ? 4 : 12 }}>{eyebrow}</Meta> : null}
      {title ? <Display size={22} style={{ marginBottom: 14 }}>{title}</Display> : null}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.palette.paper,
    borderRadius: theme.radius.lg,
    ...theme.shadow.quiet
  }
});
