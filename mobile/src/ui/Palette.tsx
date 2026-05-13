/**
 * Palette primitives.
 *   <PaletteRow colors={...} />        // tiny strip — for library tiles
 *   <PaletteGrid colors={...} />       // medium squares — for list rows
 *   <PaletteHero colors={...} onCopy />// big with labels + hex — card detail
 */
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../theme";
import { Body, Meta, Text } from "./Text";

export type SwatchColor = { hex: string; role?: string; label?: string };

export function PaletteRow({ colors, height = 12 }: { colors: SwatchColor[]; height?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {colors.map((c, i) => (
        <View
          key={`${c.hex}-${i}`}
          style={{
            flex: 1,
            height,
            backgroundColor: c.hex,
            borderRadius: 4
          }}
        />
      ))}
    </View>
  );
}

export function PaletteGrid({ colors }: { colors: SwatchColor[] }) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {colors.map((c, i) => (
        <View
          key={`${c.hex}-${i}`}
          style={{
            flex: 1,
            height: 56,
            backgroundColor: c.hex,
            borderRadius: 10
          }}
        />
      ))}
    </View>
  );
}

export function PaletteHero({ colors }: { colors: SwatchColor[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function onCopy(hex: string) {
    const norm = hex.toUpperCase();
    await Clipboard.setStringAsync(norm);
    setCopied(norm);
    Haptics.selectionAsync();
    setTimeout(() => setCopied((c) => (c === norm ? null : c)), 1400);
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {colors.map((c, i) => (
          <Pressable
            key={`${c.hex}-${i}`}
            onPress={() => onCopy(c.hex)}
            style={({ pressed }) => [
              s.swatchCard,
              pressed && { opacity: 0.85 }
            ]}
          >
            <View style={[s.swatchBlock, { backgroundColor: c.hex }]} />
            <View style={s.swatchCopy}>
              <Body numberOfLines={1} style={s.swatchLabel}>
                {c.label || c.role || "Color"}
              </Body>
              <Meta numberOfLines={1}>{copied === c.hex.toUpperCase() ? "COPIED" : c.hex.toUpperCase()}</Meta>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  swatchCard: {
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 132,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    backgroundColor: theme.palette.putty,
    borderWidth: 1,
    borderColor: theme.palette.line
  },
  swatchBlock: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)"
  },
  swatchCopy: {
    flex: 1,
    minWidth: 0
  },
  swatchLabel: {
    marginBottom: 2,
    color: theme.ink[1],
    lineHeight: 18
  },
  hexText: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    color: "rgba(255,255,255,0.95)",
    letterSpacing: 0
  }
});
