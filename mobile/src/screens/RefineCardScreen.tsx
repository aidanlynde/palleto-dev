import * as Haptics from "expo-haptics";
import { User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { CardDetail } from "./CardResultScreen";
import { CardRefinement, createCardRefinement, InspirationCard, listCardRefinements } from "../services/api";
import { theme } from "../theme";

const suggestedPrompts = [
  "Make this feel more organic and less corporate",
  "Push this toward a luxury fashion direction",
  "Give me softer type and a more editorial read",
  "Make the applications more specific to my project",
  "Find a sharper, more premium angle",
];

type RefineCardScreenProps = {
  card: InspirationCard;
  firebaseUser: User;
  onRefined: (card: InspirationCard) => void;
};

export function RefineCardScreen({ card, firebaseUser, onRefined }: RefineCardScreenProps) {
  const [history, setHistory] = useState<CardRefinement[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [activeRefinementId, setActiveRefinementId] = useState<string | null>(null);

  const activeCard = useMemo(() => {
    const activeRefinement = history.find((refinement) => refinement.id === activeRefinementId);
    return activeRefinement?.refined_card ?? card;
  }, [activeRefinementId, card, history]);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      try {
        const token = await firebaseUser.getIdToken();
        const nextHistory = await listCardRefinements(token, card.id);

        if (isMounted) {
          setHistory(nextHistory);
          setActiveRefinementId(nextHistory[0]?.id ?? null);
        }
      } catch {
        if (isMounted) {
          Alert.alert("Could not load refinements", "Try again in a moment.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [card.id, firebaseUser]);

  async function submitRefinement(nextInstruction: string, presetLabel?: string) {
    const trimmedInstruction = nextInstruction.trim();

    if (!trimmedInstruction || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const token = await firebaseUser.getIdToken();
      const refinement = await createCardRefinement(token, card.id, {
        instruction: trimmedInstruction,
        presetLabel: presetLabel ?? null,
      });

      const nextHistory = [refinement, ...history];
      setHistory(nextHistory);
      setActiveRefinementId(refinement.id);
      setInstruction("");
      onRefined(refinement.refined_card);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Refinement failed", "Try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Refine with AI</Text>
        <Text style={styles.title}>Push this card without restarting the scan.</Text>
        <Text style={styles.body}>
          Ask for a tighter angle, a different tone, or a more project-specific translation.
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelLabel}>Suggested prompts</Text>
        <View style={styles.promptGrid}>
          {suggestedPrompts.map((prompt) => (
            <Pressable
              key={prompt}
              onPress={() => submitRefinement(prompt, prompt)}
              style={({ pressed }) => [styles.promptChip, pressed && styles.pressed]}
            >
              <Text style={styles.promptChipText}>{prompt}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelLabel}>Custom direction</Text>
        <TextInput
          multiline
          onChangeText={setInstruction}
          placeholder="Make this feel more handcrafted and less blocky."
          placeholderTextColor={theme.colors.textSecondary}
          style={styles.input}
          value={instruction}
        />
        <Pressable
          disabled={!instruction.trim() || isSubmitting}
          onPress={() => submitRefinement(instruction)}
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.pressed,
            (!instruction.trim() || isSubmitting) && styles.disabled,
          ]}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Refining..." : "Refine card"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelLabel}>Refinement history</Text>
        {isLoadingHistory ? (
          <Text style={styles.meta}>Loading saved refinements...</Text>
        ) : history.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyRow}>
            <Pressable
              onPress={() => setActiveRefinementId(null)}
              style={({ pressed }) => [
                styles.historyChip,
                activeRefinementId === null && styles.historyChipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.historyChipText, activeRefinementId === null && styles.historyChipTextActive]}>
                Original
              </Text>
            </Pressable>
            {history.map((refinement, index) => (
              <Pressable
                key={refinement.id}
                onPress={() => setActiveRefinementId(refinement.id)}
                style={({ pressed }) => [
                  styles.historyChip,
                  activeRefinementId === refinement.id && styles.historyChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.historyChipText,
                    activeRefinementId === refinement.id && styles.historyChipTextActive,
                  ]}
                >
                  {refinement.preset_label || `Refine ${history.length - index}`}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.meta}>No refinements yet. Start with a prompt above.</Text>
        )}
      </View>

      <CardDetail card={activeCard} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  header: {
    gap: theme.spacing.sm,
  },
  eyebrow: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  body: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  panel: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.surface,
  },
  panelLabel: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  promptGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  promptChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small,
  },
  promptChipText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    minHeight: 108,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: "top",
  },
  submitButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: theme.radius.small,
  },
  submitButtonText: {
    color: theme.colors.background,
    fontSize: 15,
    fontWeight: "800",
  },
  historyRow: {
    gap: theme.spacing.sm,
  },
  historyChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small,
  },
  historyChipActive: {
    backgroundColor: theme.colors.textPrimary,
    borderColor: theme.colors.textPrimary,
  },
  historyChipText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  historyChipTextActive: {
    color: theme.colors.background,
  },
  meta: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.35,
  },
});
