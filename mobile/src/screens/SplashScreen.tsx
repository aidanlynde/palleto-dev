/**
 * SplashScreen — drop-in replacement.
 * Big serif wordmark + animated palette dot.
 *
 * Requires: react-native-svg, react-native-reanimated (both Expo defaults
 * in SDK 52). If you don't have react-native-svg yet:
 *   npx expo install react-native-svg react-native-reanimated
 */
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolateColor
} from "react-native-reanimated";
import Svg, { Circle, Text as SvgText } from "react-native-svg";

import { theme } from "../theme";
import { Body, Meta } from "../ui";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Palette dot cycles through these (mirrors the loader in the prototype)
const PALETTE = ["#C5683E", "#7C0F1F", "#CA8B2E", "#385E76", "#3F6C4A"];

type Props = {
  detail?: string;
  warning?: string | null;
};

export function SplashScreen({ detail, warning }: Props) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 3000 }), -1, false);
  }, [t]);

  const animatedProps = useAnimatedProps(() => {
    const fill = interpolateColor(
      t.value,
      [0, 0.2, 0.4, 0.6, 0.8, 1],
      [...PALETTE, PALETTE[0]]
    );
    // Subtle scale via radius: 8 → 9 → 8
    const r = 8 + Math.sin(t.value * Math.PI * 2) * 0.6;
    return { fill, r };
  });

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 26,
        backgroundColor: theme.palette.bone
      }}
    >
      <Svg width={280} height={120} viewBox="0 0 280 120">
        <SvgText
          x="0"
          y="92"
          fontFamily={theme.font.display}
          fontSize="110"
          fill={theme.ink[1]}
          letterSpacing={0}
        >
          palleto
        </SvgText>
        <AnimatedCircle cx={258} cy={88} animatedProps={animatedProps} />
      </Svg>

      <Meta>A FIELD GUIDE FOR THE EYE</Meta>

      {detail ? (
        <Body
          style={{
            position: "absolute",
            bottom: 80,
            fontSize: 12.5,
            color: theme.ink[3],
            textAlign: "center",
            paddingHorizontal: 40
          }}
        >
          {detail}
        </Body>
      ) : null}

      {warning ? (
        <Body
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 12,
            color: theme.colors.error,
            textAlign: "center",
            paddingHorizontal: 40,
            opacity: 0.9
          }}
        >
          {warning}
        </Body>
      ) : null}
    </View>
  );
}
