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
import { Display, Meta, Text } from "./Text";

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
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {colors.map((c, i) => (
          <Pressable
            key={`${c.hex}-${i}`}
            onPress={() => onCopy(c.hex)}
            style={({ pressed }) => [
              s.bigSwatch,
              { backgroundColor: c.hex },
              pressed && { opacity: 0.85 }
            ]}
          >
            <View style={s.hexPill}>
              <Text style={s.hexText}>
                {copied === c.hex.toUpperCase() ? "COPIED" : c.hex.replace("#", "").toUpperCase()}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {colors.map((c, i) => (
          <View key={`label-${i}`} style={{ flex: 1, paddingHorizontal: 2 }}>
            <Display size={14} style={{ lineHeight: 16 }}>
              {c.label ?? ""}
            </Display>
            <Meta>{c.role ?? ""}</Meta>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bigSwatch: {
    flex: 1,
    height: 88,
    borderRadius: 14,
    justifyContent: "flex-end",
    padding: 8
  },
  hexPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.32)"
  },
  hexText: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    color: "rgba(255,255,255,0.95)",
    letterSpacing: 0.6
  }
});
