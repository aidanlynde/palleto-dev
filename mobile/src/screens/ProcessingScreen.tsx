/**
 * ProcessingScreen — drop-in replacement.
 * Reskinned for bone with palette-emerging progress.
 * Public surface (props, behaviors, side-effects) preserved exactly.
 */
import * as Haptics from "expo-haptics";
import { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";

import { InspirationCard, uploadCard, uploadPreviewCard } from "../services/api";
import { trackEvent } from "../services/analytics";
import { ProjectContext } from "../services/projectContext";
import { theme } from "../theme";
import {
  Body,
  Button,
  Display,
  DisplayItalic,
  Meta,
  Text
} from "../ui";

type ProcessingScreenProps = {
  firebaseUser: User | null;
  imageUri: string;
  mimeType?: string | null;
  onCardCreated: (card: InspirationCard) => void;
  onRetry: () => void;
  projectContext: ProjectContext | null;
  sourceType: "camera" | "library";
};

const STAGES = [
  "Reading palette",
  "Finding texture",
  "Mapping composition",
  "Building direction",
  "Pulling references",
  "Writing your card"
];

// Stand-in palette that resolves as scan progresses. The real palette
// replaces it on completion (via onCardCreated → CardResultScreen).
const PROGRESS_PALETTE = [
  "#3D2A2E",
  "#7C0F1F",
  "#CA8B2E",
  "#385E76",
  "#E9DFC9"
];

export function ProcessingScreen({
  firebaseUser,
  imageUri,
  mimeType,
  onCardCreated,
  onRetry,
  projectContext,
  sourceType
}: ProcessingScreenProps) {
  const submittedUri = useRef<string | null>(null);
  const scan = useRef(new Animated.Value(0)).current;
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Stage cycle
  useEffect(() => {
    const id = setInterval(
      () => setStageIndex((i) => (i + 1) % STAGES.length),
      1300
    );
    return () => clearInterval(id);
  }, []);

  // Scan band animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 1, duration: 1450, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scan, { toValue: 0, duration: 1450, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })
      ])
    );
    if (!error) loop.start();
    return () => loop.stop();
  }, [error, scan]);

  // Upload
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (submittedUri.current === imageUri) return;
      submittedUri.current = imageUri;
      try {
        const card = firebaseUser
          ? await uploadCard({
              idToken: await firebaseUser.getIdToken(),
              imageUri,
              mimeType,
              projectContext,
              sourceType
            })
          : await uploadPreviewCard({ imageUri, mimeType, sourceType });
        if (mounted) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onCardCreated(card);
        }
      } catch {
        if (mounted) {
          submittedUri.current = null;
          trackEvent("create_failed", { source_type: sourceType });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError("Card generation failed. Check backend storage configuration and try again.");
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [firebaseUser, imageUri, mimeType, onCardCreated, projectContext, sourceType]);

  return (
    <View style={s.container}>
      {/* Stepper */}
      <View style={s.stepper}>
        {STAGES.map((_, i) => (
          <View
            key={i}
            style={[s.stepperBar, i <= stageIndex && s.stepperBarActive]}
          />
        ))}
      </View>

      {/* Polaroid frame around image */}
      <View style={s.polaroid}>
        <View style={s.imageFrame}>
          <Image source={{ uri: imageUri }} style={s.image} resizeMode="cover" />
          <View style={s.imageTint} pointerEvents="none" />
          {!error ? (
            <Animated.View
              pointerEvents="none"
              style={[
                s.scanBand,
                {
                  transform: [
                    {
                      translateY: scan.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-40, 480]
                      })
                    }
                  ]
                }
              ]}
            />
          ) : null}
        </View>
        <View style={s.polaroidMeta}>
          <Meta>SCANNING</Meta>
          <Meta>{String(stageIndex + 1).padStart(2, "0")} / 0{STAGES.length}</Meta>
        </View>
      </View>

      {/* Emerging palette */}
      <View style={s.palette}>
        {PROGRESS_PALETTE.map((c, i) => (
          <View
            key={i}
            style={[
              s.swatch,
              i <= stageIndex - 1
                ? { backgroundColor: c }
                : { backgroundColor: "rgba(28,26,23,0.06)" }
            ]}
          />
        ))}
      </View>

      {/* Copy */}
      <View style={s.copy}>
        {error ? (
          <>
            <Meta>SOMETHING BROKE</Meta>
            <Display size={28} style={{ marginTop: 6 }}>
              We lost the scan
            </Display>
            <Body style={{ marginTop: 10, color: theme.colors.error }}>{error}</Body>
            <Button variant="secondary" onPress={onRetry} style={{ marginTop: 16, alignSelf: "flex-start" }}>
              Try another image
            </Button>
          </>
        ) : (
          <>
            <Meta>STAGE {String(stageIndex + 1).padStart(2, "0")}</Meta>
            <Display size={28} style={{ marginTop: 6 }}>
              {STAGES[stageIndex]}
              <DisplayItalic size={28} color={theme.ink[3]}>…</DisplayItalic>
            </Display>
            <View style={{ marginTop: 14, gap: 6 }}>
              {STAGES.map((stage, i) => (
                <Text
                  key={stage}
                  style={{
                    fontFamily: i === stageIndex ? theme.font.sansMedium : theme.font.sans,
                    fontSize: 13.5,
                    color:
                      i < stageIndex
                        ? theme.ink[3]
                        : i === stageIndex
                          ? theme.ink[1]
                          : theme.ink[4]
                  }}
                >
                  {i < stageIndex ? "✓  " : i === stageIndex ? "•  " : "·  "}
                  {stage}
                </Text>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 32,
    backgroundColor: theme.palette.bone,
    gap: 18
  },
  stepper: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 6
  },
  stepperBar: {
    flex: 1,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: "rgba(28,26,23,0.12)"
  },
  stepperBarActive: {
    backgroundColor: theme.ink[1]
  },
  polaroid: {
    padding: 10,
    paddingBottom: 10,
    backgroundColor: theme.palette.paper,
    borderRadius: theme.radius.md,
    ...theme.shadow.lifted
  },
  imageFrame: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: theme.palette.putty
  },
  image: {
    width: "100%",
    height: "100%"
  },
  imageTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(28,26,23,0.05)"
  },
  scanBand: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: "rgba(28,26,23,0.10)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(28,26,23,0.28)"
  },
  polaroidMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 4,
    paddingTop: 8
  },
  palette: {
    flexDirection: "row",
    gap: 6
  },
  swatch: {
    flex: 1,
    height: 36,
    borderRadius: 8
  },
  copy: {
    flex: 1,
    marginTop: 6
  }
});
