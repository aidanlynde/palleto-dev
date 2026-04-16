import * as Haptics from "expo-haptics";
import { User } from "firebase/auth";
import { useEffect, useState } from "react";
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
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>Analyzing reference</Text>
        <Text style={styles.title}>{error ? "Something broke" : stages[stageIndex]}</Text>
        {error ? (
          <>
            <Text style={styles.error}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryButtonText}>Try another image</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={theme.colors.textPrimary} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background
  },
  image: {
    flex: 1,
    width: "100%",
    minHeight: 360,
    borderRadius: theme.radius.small
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
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38
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
