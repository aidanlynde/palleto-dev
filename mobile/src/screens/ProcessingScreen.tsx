import * as Haptics from "expo-haptics";
import { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { InspirationCard, uploadCard, uploadPreviewCard } from "../services/api";
import { trackEvent } from "../services/analytics";
import { ProjectContext } from "../services/projectContext";
import { theme } from "../theme";

type ProcessingScreenProps = {
  firebaseUser: User | null;
  imageUri: string;
  mimeType?: string | null;
  onCardCreated: (card: InspirationCard) => void;
  onRetry: () => void;
  projectContext: ProjectContext | null;
  sourceType: "camera" | "library";
};

const stages = [
  "Reading palette",
  "Finding texture",
  "Mapping composition",
  "Building direction",
  "Pulling reference lanes",
  "Writing your card"
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
  const submittedImageUri = useRef<string | null>(null);
  const scanProgress = useRef(new Animated.Value(0)).current;
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((current) => (current + 1) % stages.length);
    }, 1300);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanProgress, {
          duration: 1450,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.timing(scanProgress, {
          duration: 1450,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0,
          useNativeDriver: true
        })
      ])
    );

    if (!error) {
      animation.start();
    }

    return () => animation.stop();
  }, [error, scanProgress]);

  useEffect(() => {
    let isMounted = true;

    async function createCard() {
      if (submittedImageUri.current === imageUri) {
        return;
      }

      submittedImageUri.current = imageUri;

      try {
        const card = firebaseUser
          ? await uploadCard({
              idToken: await firebaseUser.getIdToken(),
              imageUri,
              mimeType,
              projectContext,
              sourceType
            })
          : await uploadPreviewCard({
              imageUri,
              mimeType,
              sourceType
            });

        if (isMounted) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onCardCreated(card);
        }
      } catch {
        if (isMounted) {
          submittedImageUri.current = null;
          trackEvent("create_failed", { source_type: sourceType });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError("Card generation failed. Check backend storage configuration and try again.");
        }
      }
    }

    createCard();

    return () => {
      isMounted = false;
    };
  }, [firebaseUser, imageUri, mimeType, onCardCreated, projectContext, sourceType]);

  return (
    <View style={styles.container}>
      <View style={styles.progressTrack}>
        {stages.map((_, index) => (
          <View
            key={index}
            style={[styles.progressDot, index === stageIndex && styles.progressDotActive]}
          />
        ))}
      </View>

      <View style={styles.imageFrame}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
        {!error ? (
          <View pointerEvents="none" style={styles.scanOverlay}>
            <Animated.View
              style={[
                styles.scanBand,
                {
                  transform: [
                    {
                      translateY: scanProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-92, 620]
                      })
                    }
                  ]
                }
              ]}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.copy}>
        <Text style={styles.eyebrow}>Building your scan</Text>
        <Text style={styles.title}>{error ? "Something broke" : stages[stageIndex]}</Text>
        {error ? (
          <>
            <Text style={styles.error}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryButtonText}>Try another image</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.stageList}>
              {visibleStages(stageIndex).map(({ active, stage }) => (
                <Text
                  key={stage}
                  style={[styles.stageText, active && styles.stageTextActive]}
                >
                  {stage}
                </Text>
              ))}
            </View>
            <ActivityIndicator color={theme.colors.textPrimary} />
          </>
        )}
      </View>
    </View>
  );
}

function visibleStages(activeIndex: number) {
  return stages.map((stage, index) => ({
    active: index === activeIndex,
    stage
  }));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: 34,
    backgroundColor: theme.colors.background
  },
  progressTrack: {
    flexDirection: "row",
    gap: theme.spacing.xs
  },
  progressDot: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  progressDotActive: {
    backgroundColor: theme.colors.textPrimary
  },
  imageFrame: {
    width: "100%",
    aspectRatio: 0.75,
    overflow: "hidden",
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.surface
  },
  image: {
    width: "100%",
    height: "100%"
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.08)"
  },
  scanBand: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 92,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.42)",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  copy: {
    gap: theme.spacing.md
  },
  eyebrow: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34
  },
  stageList: {
    gap: theme.spacing.sm
  },
  stageText: {
    color: "rgba(255,255,255,0.26)",
    fontSize: 15,
    fontWeight: "700"
  },
  stageTextActive: {
    color: theme.colors.textPrimary
  },
  error: {
    color: theme.colors.error,
    fontSize: 15,
    lineHeight: 22
  },
  retryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  retryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800"
  }
});
