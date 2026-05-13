/**
 * Text primitives. Use these instead of bare <Text> from react-native
 * so all type comes from the same source of truth.
 *
 *   <Display>Library</Display>           // 56, Instrument Serif
 *   <DisplayItalic>no.4</DisplayItalic>  // italic display
 *   <Headline>Saved to library</Headline>// 17, Inter Tight 500
 *   <Body>...</Body>                     // 14.5, Inter Tight 400
 *   <Meta>12.04 · SCAN №024</Meta>       // 10.5, JetBrains Mono, uppercase
 */
import React from "react";
import { StyleSheet, Text as RNText, TextProps, TextStyle } from "react-native";
import { theme } from "../theme";

type Props = TextProps & {
  size?: number;
  weight?: number;
  color?: string;
  style?: TextStyle | TextStyle[];
};

export function Text(p: Props) {
  return (
    <RNText
      {...p}
      style={[
        {
          fontFamily: theme.font.sans,
          fontSize: p.size ?? 15,
          color: p.color ?? theme.ink[1],
          letterSpacing: 0
        },
        p.style as any
      ]}
    />
  );
}

export function Display(p: Props) {
  return (
    <RNText
      {...p}
      style={[
        s.display,
        p.size ? { fontSize: p.size, lineHeight: p.size * 1 } : null,
        p.color ? { color: p.color } : null,
        p.style as any
      ]}
    />
  );
}

export function DisplayItalic(p: Props) {
  return (
    <RNText
      {...p}
      style={[
        s.display,
        { fontFamily: theme.font.displayItalic },
        p.size ? { fontSize: p.size, lineHeight: p.size * 1.05 } : null,
        p.color ? { color: p.color } : null,
        p.style as any
      ]}
    />
  );
}

export function Headline(p: Props) {
  return <RNText {...p} style={[s.headline, p.color ? { color: p.color } : null, p.style as any]} />;
}

export function Body(p: Props) {
  return <RNText {...p} style={[s.body, p.color ? { color: p.color } : null, p.style as any]} />;
}

export function Meta(p: Props) {
  return <RNText {...p} style={[s.meta, p.color ? { color: p.color } : null, p.style as any]} />;
}

const s = StyleSheet.create({
  display: {
    fontFamily: theme.font.display,
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: 0,
    color: theme.ink[1]
  },
  headline: {
    fontFamily: theme.font.sansMedium,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: 0,
    color: theme.ink[1]
  },
  body: {
    fontFamily: theme.font.sans,
    fontSize: 14.5,
    lineHeight: 21,
    color: theme.ink[2]
  },
  meta: {
    fontFamily: theme.font.mono,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: theme.ink[3]
  }
});
