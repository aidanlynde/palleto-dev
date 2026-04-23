import * as Haptics from "expo-haptics";
import { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { InspirationCard, uploadCard } from "../services/api";
import { ProjectContext } from "../services/projectContext";
import { theme } from "../theme";

type ProcessingScreenProps = {
  firebaseUser: User;
  imageUri: string;
  mimeType?: string | null;
  onCardCreated: (card: InspirationCard) => void;
  onRetry: () => void;
  projectContext: ProjectContext | null;
  sourceType: "camera" | "library";
};

const stages = ["Reading palette", "Finding texture", "Building direction", "Saving card"];

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
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, stages.length - 1));
    }, 850);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function createCard() {
      if (submittedImageUri.current === imageUri) {
        return;
      }

      submittedImageUri.current = imageUri;

      try {
        const idToken = await firebaseUser.getIdToken();
        const card = await uploadCard({
          idToken,
          imageUri,
          mimeType,
          projectContext,
          sourceType
        });

        if (isMounted) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onCardCreated(card);
        }
      } catch {
        if (isMounted) {
          submittedImageUri.current = null;
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
            style={[styles.progressDot, index <= stageIndex && styles.progressDotActive]}
          />
        ))}
      </View>

      <View style={styles.imageFrame}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
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
              {stages.map((stage, index) => (
                <Text
                  key={stage}
                  style={[styles.stageText, index <= stageIndex && styles.stageTextActive]}
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
