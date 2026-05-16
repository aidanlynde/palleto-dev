import React, { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";

import { theme } from "../theme";
import { Body } from "../ui";

const PALETTE = ["#C5683E", "#7C0F1F", "#CA8B2E", "#385E76", "#3F6C4A"];

// Dot overlay over the static dot baked into the 1024×1024 PNG at imageWidth=360.
// Values derived from exact pixel centroid of the terracotta dot in the PNG:
// center=(816.5, 567.5)px, radius=14.5px → scaled by 360/1024.
const IMAGE_SIZE = 360;
const DOT_CX = 287;
const DOT_CY = 200;
const DOT_R = 5;

type Props = {
  detail?: string;
  warning?: string | null;
};

export function SplashScreen({ detail, warning }: Props) {
  const t = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 350 });
    t.value = withRepeat(withTiming(1, { duration: 3000 }), -1, false);
  }, [t, opacity]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const dotStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      t.value,
      [0, 0.2, 0.4, 0.6, 0.8, 1],
      [...PALETTE, PALETTE[0]]
    )
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.imageWrapper}>
        <Image
          source={require("../../assets/brand/palleto-native-splash.png")}
          style={styles.image}
        />
        {/* Animated dot overlays the static dot in the PNG */}
        <Animated.View style={[styles.dot, dotStyle]} />
      </View>

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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.palette.bone
  },
  imageWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE
  },
  dot: {
    position: "absolute",
    left: DOT_CX - DOT_R,
    top: DOT_CY - DOT_R,
    width: DOT_R * 2,
    height: DOT_R * 2,
    borderRadius: DOT_R
  }
});
