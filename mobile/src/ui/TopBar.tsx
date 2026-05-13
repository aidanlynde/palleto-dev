/**
 * TopBar · floating utility bar (pills + segmented control or meta).
 * Used as the universal screen header instead of a hard nav bar.
 *
 *   <TopBar left={<Pill icon="back" onPress={...} />} right={<Pill icon="share" />}>
 *     <Meta>12.04 · SCAN №024</Meta>
 *   </TopBar>
 */
import React from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  left?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode; // center
};

export function TopBar({ left, right, children }: Props) {
  return (
    <View style={s.wrap} pointerEvents="box-none">
      <View style={s.slot}>{left}</View>
      <View style={s.center}>{children}</View>
      <View style={[s.slot, { alignItems: "flex-end" }]}>{right}</View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 30
  },
  slot: { minWidth: 38 },
  center: { flex: 1, alignItems: "center" }
});
