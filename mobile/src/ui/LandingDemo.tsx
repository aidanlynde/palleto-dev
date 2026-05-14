/**
 * LandingDemo · onboarding step 0 animated tour.
 *
 * Self-contained and dependency-free. Uses the existing Bone UI tokens and
 * the image assets already in the repo to give the landing step a living
 * preview of the product without a video background.
 */
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, View } from "react-native";

import { theme } from "../theme";
import { Body, Display, DisplayItalic, Meta, Text } from "./Text";
import { Button } from "./Button";
import { Pill } from "./Pill";

const DEMO_REFERENCES = [
  {
    source: require("../../assets/onboarding/capture-cathedral.png"),
    title: "Stained light, slow stone",
    palette: ["#3D2A2E", "#7C0F1F", "#CA8B2E", "#385E76", "#E9DFC9"]
  },
  {
    source: require("../../assets/demo/koi-street-reference.png"),
    title: "Wet pavement, bright fish",
    palette: ["#D14B2D", "#1F1B19", "#C9B591", "#5A6E64", "#EFE7D7"]
  },
  {
    source: require("../../assets/demo/garden-objects-reference.png"),
    title: "Tools the color of earth",
    palette: ["#7B4528", "#5A6543", "#A89478", "#E3D7BF", "#1F1A14"]
  }
] as const;

type Props = {
  onPrimary: () => void;
  onSecondary?: () => void;
  onSignIn?: () => void;
  onSkip?: () => void;
};

export function LandingDemo({ onPrimary, onSecondary, onSignIn, onSkip }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % DEMO_REFERENCES.length);
    }, 3800);

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={s.container}>
      <View style={s.topRow}>
        {onSkip ? <Pill tight onPress={onSkip}>Skip</Pill> : <View style={s.topSlot} />}
        {onSignIn ? <Pill tight onPress={onSignIn}>Sign in</Pill> : <View style={s.topSlot} />}
      </View>

      <View style={s.wordmarkRow}>
        <Display size={42} style={s.wordmark}>
          palleto
        </Display>
        <View style={s.dot} />
      </View>

      <View style={s.sceneStage}>
        {DEMO_REFERENCES.map((reference, index) => (
          <ReferenceCard key={reference.title} reference={reference} active={index === activeIndex} />
        ))}
      </View>

      <View style={s.caption}>
        {activeIndex === 0 ? (
          <View style={s.captionInner}>
            <Display size={28} style={s.captionTitle}>
              From a photo
            </Display>
            <DisplayItalic size={28} color={theme.ink[2]} style={s.captionTitleItalic}>
              to a palette
            </DisplayItalic>
            <Body style={s.captionBody}>
              Palleto reads the image, pulls out the signal, and turns it into something you can use.
            </Body>
          </View>
        ) : activeIndex === 1 ? (
          <View style={s.captionInner}>
            <Display size={28} style={s.captionTitle}>
              To a direction
            </Display>
            <DisplayItalic size={28} color={theme.ink[2]} style={s.captionTitleItalic}>
              that fits your project
            </DisplayItalic>
            <Body style={s.captionBody}>
              Every scan ties back to the work you are actually building.
            </Body>
          </View>
        ) : (
          <View style={s.captionInner}>
            <Display size={28} style={s.captionTitle}>
              And a system
            </Display>
            <DisplayItalic size={28} color={theme.ink[2]} style={s.captionTitleItalic}>
              you can share
            </DisplayItalic>
            <Body style={s.captionBody}>
              Save it, refine it, and send a public card to anyone who needs the context.
            </Body>
          </View>
        )}
      </View>

      <View style={s.ctaRow}>
        <Button icon="camera" full onPress={onPrimary}>
          Open camera
        </Button>
        {onSecondary ? (
          <Pressable onPress={onSecondary} style={({ pressed }) => [s.secondaryLink, pressed && { opacity: 0.6 }]}>
            <Text style={s.secondaryLinkText}>See the Koi example instead</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function ReferenceCard({
  active,
  reference
}: {
  active: boolean;
  reference: {
    source: number;
    title: string;
    palette: readonly string[];
  };
}) {
  const op = useRef(new Animated.Value(active ? 1 : 0)).current;
  const ty = useRef(new Animated.Value(active ? 0 : 10)).current;
  const scale = useRef(new Animated.Value(active ? 1 : 0.985)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, {
        toValue: active ? 1 : 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(ty, {
        toValue: active ? 0 : 10,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(scale, {
        toValue: active ? 1 : 0.985,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [active, op, scale, ty]);

  return (
    <Animated.View style={[s.card, { opacity: op, transform: [{ translateY: ty }, { scale }] }]}>
      <Image source={reference.source} style={s.cardImage} resizeMode="cover" />
      <View style={s.cardMeta}>
        <Meta numberOfLines={1}>REFERENCE</Meta>
        <Meta numberOfLines={1}>{reference.title.toUpperCase()}</Meta>
      </View>
      <View style={s.paletteRow}>
        {reference.palette.map((color) => (
          <View key={color} style={[s.paletteSwatch, { backgroundColor: color }]} />
        ))}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 24,
    backgroundColor: theme.palette.bone
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  topSlot: {
    width: 72
  },
  wordmarkRow: {
    marginTop: 14,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8
  },
  wordmark: {
    lineHeight: 42
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#C5683E",
    marginBottom: 8
  },
  sceneStage: {
    flex: 1,
    minHeight: 332,
    justifyContent: "center"
  },
  card: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.palette.paper,
    padding: 10,
    ...theme.shadow.lifted
  },
  cardImage: {
    width: "100%",
    aspectRatio: 0.86,
    borderRadius: 18,
    backgroundColor: theme.palette.putty
  },
  cardMeta: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  paletteRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 6
  },
  paletteSwatch: {
    flex: 1,
    height: 12,
    borderRadius: 999
  },
  caption: {
    minHeight: 114,
    justifyContent: "center",
    paddingTop: 12
  },
  captionInner: {
    alignItems: "center"
  },
  captionTitle: {
    lineHeight: 32
  },
  captionTitleItalic: {
    lineHeight: 32
  },
  captionBody: {
    marginTop: 8,
    maxWidth: 320,
    textAlign: "center",
    fontSize: 13.5,
    lineHeight: 19,
    color: theme.ink[3]
  },
  ctaRow: {
    gap: 8,
    paddingTop: 12
  },
  secondaryLink: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8
  },
  secondaryLinkText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 13,
    color: theme.ink[1],
    letterSpacing: 0
  }
});
