/**
 * Icon · text-glyph icon (zero-dependency).
 *
 * Renders unicode glyphs that read as icons. Adequate for ship-today.
 * If you add `react-native-svg`, replace the body with real SVGs;
 * the `name` prop API stays the same so screens don't change.
 */
import React from "react";
import { Text } from "react-native";

export type IconName =
  | "grid" | "rows" | "palette" | "calendar"
  | "search" | "plus" | "camera" | "image" | "share"
  | "sparkle" | "link" | "chevron" | "back" | "arrowup"
  | "close" | "user" | "folder" | "check" | "aa" | "spool";

const glyphs: Record<IconName, string> = {
  grid:    "▦",
  rows:    "≡",
  palette: "◐",
  calendar:"▤",
  search:  "⌕",
  plus:    "+",
  camera:  "◉",
  image:   "▢",
  share:   "↑",
  sparkle: "✦",
  link:    "↗",
  chevron: "›",
  back:    "‹",
  arrowup: "↗",
  close:   "×",
  user:    "◍",
  folder:  "▢",
  check:   "✓",
  aa:      "Aa",
  spool:   "◰"
};

export function Icon({
  name,
  size = 18,
  color = "#1C1A17"
}: { name: IconName; size?: number; color?: string }) {
  return (
    <Text
      allowFontScaling={false}
      style={{
        fontFamily: undefined, // system, for crisp glyph rendering
        fontSize: size * 1.1,
        lineHeight: size * 1.1,
        color,
        textAlign: "center",
        width: size * 1.2,
        fontWeight: name === "plus" || name === "close" ? "300" : "400"
      }}
    >
      {glyphs[name]}
    </Text>
  );
}
