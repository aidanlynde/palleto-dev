/**
 * ProcessingScreen — drop-in replacement.
 * Reskinned for bone with palette-emerging progress.
 * Public surface (props, behaviors, side-effects) preserved exactly.
 */
import * as Haptics from "expo-haptics";
import { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import ImageColors from "react-native-image-colors";
import {
  Animated,
  Easing,
  Image,
  LayoutChangeEvent,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";

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

const FALLBACK_PALETTE = ["#3D2A2E", "#7C0F1F", "#CA8B2E", "#385E76", "#E9DFC9"];

const SCAN_BAND_HEIGHT = 58;

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
  const { height, width } = useWindowDimensions();
  const [imageFrameHeight, setImageFrameHeight] = useState(360);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progressPalette, setProgressPalette] = useState<string[]>(FALLBACK_PALETTE);
  const isVeryShort = height < 620;
  const isShort = height < 700;
  const isNarrow = width < 370;
  const polaroidWidth = Math.min(
    width - (isNarrow ? 32 : 40),
    isVeryShort ? 236 : isShort ? 286 : 340
  );
  const displaySize = isVeryShort ? 23 : isShort ? 25 : 28;
  const displayLineHeight = displaySize + 9;

  // Extract dominant colors from the image to drive the swatch animation
  useEffect(() => {
    ImageColors.getColors(imageUri, { fallback: FALLBACK_PALETTE[0], cache: true, key: imageUri })
      .then((result) => {
        let colors: string[];
        if (result.platform === "ios") {
          colors = [result.primary, result.secondary, result.detail, result.background, result.primary];
        } else if (result.platform === "android") {
          colors = [
            result.vibrant ?? result.dominant ?? FALLBACK_PALETTE[0],
            result.darkVibrant ?? result.muted ?? FALLBACK_PALETTE[1],
            result.dominant ?? result.average ?? FALLBACK_PALETTE[2],
            result.lightVibrant ?? result.lightMuted ?? FALLBACK_PALETTE[3],
            result.muted ?? result.average ?? FALLBACK_PALETTE[4]
          ];
        } else {
          colors = FALLBACK_PALETTE;
        }
        setProgressPalette(colors.filter(Boolean).slice(0, 5) as string[]);
      })
      .catch(() => {/* keep FALLBACK_PALETTE */});
  }, [imageUri]);

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

  const onImageFrameLayout = (event: LayoutChangeEvent) => {
    setImageFrameHeight(event.nativeEvent.layout.height);
  };

  return (
    <View
      style={[
        s.container,
        {
          paddingHorizontal: isNarrow ? 16 : 20,
          paddingTop: isVeryShort ? 34 : isShort ? 46 : 72,
          paddingBottom: isVeryShort ? 16 : isShort ? 20 : 32,
          gap: isVeryShort ? 8 : isShort ? 12 : 18
        }
      ]}
    >
      {/* Stepper */}
      <View style={[s.stepper, isShort && s.stepperCompact]}>
        {STAGES.map((_, i) => (
          <View
            key={i}
            style={[s.stepperBar, i <= stageIndex && s.stepperBarActive]}
          />
        ))}
      </View>

      {/* Polaroid frame around image */}
      <View style={[s.polaroid, { width: polaroidWidth }]}>
        <View style={s.imageFrame} onLayout={onImageFrameLayout}>
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
                        outputRange: [
                          -SCAN_BAND_HEIGHT,
                          imageFrameHeight + SCAN_BAND_HEIGHT
                        ]
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

      {/* Emerging palette — colors extracted from the scanned image */}
      <View style={s.palette}>
        {progressPalette.map((c, i) => (
          <View
            key={i}
            style={[
              s.swatch,
              isVeryShort && s.swatchVeryCompact,
              i <= stageIndex - 1
                ? { backgroundColor: c }
                : { backgroundColor: "rgba(28,26,23,0.06)" }
            ]}
          />
        ))}
      </View>

      {/* Copy */}
      <View style={[s.copy, isShort && s.copyCompact]}>
        {error ? (
          <>
            <Meta>SOMETHING BROKE</Meta>
            <Display size={displaySize} style={[s.stageTitle, { lineHeight: displayLineHeight }]}>
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
            <Display size={displaySize} style={[s.stageTitle, { lineHeight: displayLineHeight }]}>
              {STAGES[stageIndex]}
              <DisplayItalic
                size={displaySize}
                color={theme.ink[3]}
                style={{ lineHeight: displayLineHeight }}
              >
                …
              </DisplayItalic>
            </Display>
            <View
              style={[
                s.stageList,
                isShort && s.stageListCompact,
                isVeryShort && s.stageListVeryCompact
              ]}
            >
              {STAGES.map((stage, i) => (
                <Text
                  key={stage}
                  numberOfLines={1}
                  style={[
                    s.stageItem,
                    {
                      fontFamily: i === stageIndex ? theme.font.sansMedium : theme.font.sans,
                      color:
                        i < stageIndex
                          ? theme.ink[3]
                          : i === stageIndex
                            ? theme.ink[1]
                            : theme.ink[4]
                    },
                    isShort && s.stageItemCompact,
                    isVeryShort && s.stageItemVeryCompact
                  ]}
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
    backgroundColor: theme.palette.bone,
    alignItems: "stretch"
  },
  stepper: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 6
  },
  stepperCompact: {
    marginBottom: 0
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
    alignSelf: "center",
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
    height: SCAN_BAND_HEIGHT,
    backgroundColor: "rgba(255,252,245,0.22)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(28,26,23,0.24)",
    shadowColor: theme.ink[1],
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 }
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
    gap: 6,
    flexShrink: 0
  },
  swatch: {
    flex: 1,
    height: 32,
    borderRadius: 8
  },
  swatchVeryCompact: {
    height: 28
  },
  copy: {
    flex: 1,
    minHeight: 0,
    marginTop: 2
  },
  copyCompact: {
    flex: 0,
    marginTop: 0
  },
  stageTitle: {
    marginTop: 4,
    paddingTop: 4,
    paddingBottom: 2
  },
  stageList: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 6,
    marginTop: 14
  },
  stageListCompact: {
    rowGap: 4,
    marginTop: 10
  },
  stageListVeryCompact: {
    rowGap: 3,
    marginTop: 8
  },
  stageItem: {
    width: "47%",
    fontSize: 13,
    lineHeight: 17
  },
  stageItemCompact: {
    fontSize: 12.5,
    lineHeight: 16
  },
  stageItemVeryCompact: {
    fontSize: 12,
    lineHeight: 15
  }
});
