import * as Haptics from "expo-haptics";
import { User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { CardDetail } from "./CardResultScreen";
import {
  CardRefinement,
  createCardRefinement,
  InspirationCard,
  listCardRefinements,
} from "../services/api";
import { theme } from "../theme";

const promptGroups = [
  {
    title: "Tone",
    prompts: [
      "Make this feel more organic and less corporate",
      "Find a sharper, more premium angle",
    ],
  },
  {
    title: "Project fit",
    prompts: [
      "Make the applications more specific to my project",
      "Push this toward a luxury fashion direction",
    ],
  },
  {
    title: "Typography",
    prompts: [
      "Give me softer type and a more editorial read",
      "Make the type direction more collectible and less generic",
    ],
  },
];

const processingStages = [
  "Re-reading the scan",
  "Shifting the creative angle",
  "Updating the card",
  "Saving this version",
];

type RefineCardScreenProps = {
  card: InspirationCard;
  firebaseUser: User;
  onRefined: (card: InspirationCard) => void;
};

type VersionItem = {
  basedOnLabel: string | null;
  changedSections: string[];
  createdAt: string;
  id: string | null;
  instruction: string | null;
  isOriginal: boolean;
  label: string;
  refinedCard: InspirationCard;
  summary: string | null;
};

export function RefineCardScreen({ card, firebaseUser, onRefined }: RefineCardScreenProps) {
  const [baseCard] = useState(card);
  const [history, setHistory] = useState<CardRefinement[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [activeRefinementId, setActiveRefinementId] = useState<string | null>(null);
  const [processingStageIndex, setProcessingStageIndex] = useState(0);
  const [pendingInstruction, setPendingInstruction] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      try {
        const token = await firebaseUser.getIdToken();
        const nextHistory = await listCardRefinements(token, baseCard.id);

        if (isMounted) {
          setHistory(nextHistory);
          setActiveRefinementId(nextHistory.length ? nextHistory[nextHistory.length - 1].id : null);
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
  }, [baseCard.id, firebaseUser]);

  useEffect(() => {
    if (!isSubmitting) {
      setProcessingStageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setProcessingStageIndex((current) =>
        Math.min(current + 1, processingStages.length - 1)
      );
    }, 720);

    return () => clearInterval(interval);
  }, [isSubmitting]);

  const versions = useMemo<VersionItem[]>(() => {
    const original: VersionItem = {
      basedOnLabel: null,
      changedSections: [],
      createdAt: baseCard.created_at,
      id: null,
      instruction: null,
      isOriginal: true,
      label: "Original",
      refinedCard: baseCard,
      summary: "The first card generated from the scan.",
    };

    return [
      original,
      ...history.map((refinement) => ({
        basedOnLabel: refinement.based_on_refinement_id
          ? history.find((item) => item.id === refinement.based_on_refinement_id)?.label || "Original"
          : "Original",
        changedSections: refinement.changed_sections,
        createdAt: refinement.created_at,
        id: refinement.id,
        instruction: refinement.instruction,
        isOriginal: false,
        label: refinement.label,
        refinedCard: refinement.refined_card,
        summary: refinement.summary,
      })),
    ];
  }, [baseCard, history]);

  const activeVersion =
    versions.find((version) => version.id === activeRefinementId) ?? versions[0];
  const latestVersionId = versions[versions.length - 1]?.id ?? null;
  const latestVersion =
    versions.find((version) => version.id === latestVersionId) ?? versions[0];

  async function submitRefinement(nextInstruction: string, presetLabel?: string) {
    const trimmedInstruction = nextInstruction.trim();

    if (!trimmedInstruction || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setPendingInstruction(trimmedInstruction);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const token = await firebaseUser.getIdToken();
      const refinement = await createCardRefinement(token, baseCard.id, {
        instruction: trimmedInstruction,
        presetLabel: presetLabel ?? null,
        baseRefinementId: activeRefinementId,
      });

      const nextHistory = [...history, refinement];
      setHistory(nextHistory);
      setActiveRefinementId(refinement.id);
      setInstruction("");
      onRefined(refinement.refined_card);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Refinement failed", "Try again in a moment.");
    } finally {
      setPendingInstruction(null);
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
      style={styles.container}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Refine with AI</Text>
          <Text style={styles.title}>Turn one scan into a versioned creative thread.</Text>
          <Text style={styles.body}>
            Refine from the original card or branch from any saved version without losing the trail.
          </Text>
        </View>

        <View style={styles.activePanel}>
          <View style={styles.activePanelHeader}>
            <View style={styles.activePanelTitleBlock}>
              <Text style={styles.panelLabel}>Active version</Text>
              <Text style={styles.activeVersionTitle}>{activeVersion.label}</Text>
              <Text style={styles.activeVersionMeta}>
                {activeVersion.isOriginal
                  ? "This is the first card generated from the scan."
                  : `Built from ${activeVersion.basedOnLabel || "Original"}`}
              </Text>
            </View>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>
                {activeVersion.isOriginal ? "Base card" : `Based on ${activeVersion.basedOnLabel}`}
              </Text>
            </View>
          </View>
          <Text style={styles.activeVersionSummary}>
            {activeVersion.summary || "No summary yet."}
          </Text>
          <View style={styles.activeActions}>
            {!activeVersion.isOriginal ? (
              <Pressable
                onPress={() => setActiveRefinementId(null)}
                style={({ pressed }) => [styles.activeActionChip, pressed && styles.pressed]}
              >
                <Text style={styles.activeActionChipText}>Branch from Original</Text>
              </Pressable>
            ) : null}
            {activeVersion.id !== latestVersion.id ? (
              <Pressable
                onPress={() => setActiveRefinementId(latestVersion.id)}
                style={({ pressed }) => [styles.activeActionChip, pressed && styles.pressed]}
              >
                <Text style={styles.activeActionChipText}>Jump to Latest</Text>
              </Pressable>
            ) : null}
          </View>
          {activeVersion.instruction ? (
            <View style={styles.promptSummary}>
              <Text style={styles.promptSummaryLabel}>Applied prompt</Text>
              <Text style={styles.promptSummaryText}>{activeVersion.instruction}</Text>
            </View>
          ) : null}
          {activeVersion.changedSections.length ? (
            <View style={styles.changedSectionRow}>
              {activeVersion.changedSections.map((section) => (
                <View key={section} style={styles.changedSectionChip}>
                  <Text style={styles.changedSectionChipText}>{labelForSection(section)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Versions</Text>
          <Text style={styles.meta}>
            {history.length
              ? `${history.length} saved refinements plus the original card.`
              : "The original card stays pinned here as the base version."}
          </Text>
          {isLoadingHistory ? (
            <Text style={styles.meta}>Loading saved refinements...</Text>
          ) : (
            <View style={styles.versionList}>
              {versions.map((version) => {
                const isActive = version.id === activeRefinementId || (version.isOriginal && activeRefinementId === null);

                return (
                  <Pressable
                    key={version.id ?? "original"}
                    onPress={() => setActiveRefinementId(version.id)}
                    style={({ pressed }) => [
                      styles.versionCard,
                      isActive && styles.versionCardActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.versionCardHeader}>
                      <View style={styles.versionTitleBlock}>
                        <Text style={[styles.versionLabel, isActive && styles.versionLabelActive]}>
                          {version.label}
                        </Text>
                        <Text style={[styles.versionMeta, isActive && styles.versionMetaActive]}>
                          {version.isOriginal
                            ? "Original scan"
                            : version.basedOnLabel
                              ? `From ${version.basedOnLabel}`
                              : "Refinement"}
                        </Text>
                      </View>
                      {version.id === latestVersionId ? (
                        <View style={[styles.latestChip, isActive && styles.latestChipActive]}>
                          <Text style={[styles.latestChipText, isActive && styles.latestChipTextActive]}>
                            Latest
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text
                      numberOfLines={2}
                      style={[styles.versionSummary, isActive && styles.versionSummaryActive]}
                    >
                      {version.summary || version.instruction || "Saved version"}
                    </Text>
                    {version.changedSections.length ? (
                      <View style={styles.versionChangedRow}>
                        {version.changedSections.slice(0, 3).map((section) => (
                          <View
                            key={`${version.id ?? "original"}-${section}`}
                            style={[
                              styles.versionChangedChip,
                              isActive && styles.versionChangedChipActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.versionChangedChipText,
                                isActive && styles.versionChangedChipTextActive,
                              ]}
                            >
                              {labelForSection(section)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {version.instruction ? (
                      <Text
                        numberOfLines={2}
                        style={[styles.versionInstruction, isActive && styles.versionInstructionActive]}
                      >
                        {version.instruction}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Prompt library</Text>
          <Text style={styles.meta}>
            New refinements branch from {activeVersion.label.toLowerCase()}.
          </Text>
          <View style={styles.promptGroups}>
            {promptGroups.map((group) => (
              <View key={group.title} style={styles.promptGroup}>
                <Text style={styles.promptGroupTitle}>{group.title}</Text>
                <View style={styles.promptGrid}>
                  {group.prompts.map((prompt) => (
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
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Custom direction</Text>
          <Text style={styles.meta}>
            Ask for tighter type, stronger applications, a new tone, or a different angle.
          </Text>
          <TextInput
            multiline
            onChangeText={setInstruction}
            placeholder="Push this toward a softer, hand-touched identity with stronger type options."
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
              {isSubmitting ? "Refining..." : `Refine from ${activeVersion.label}`}
            </Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Preview</Text>
          <Text style={styles.meta}>You are previewing {activeVersion.label.toLowerCase()}.</Text>
        </View>
        <CardDetail card={activeVersion.refinedCard} />
      </ScrollView>

      {isSubmitting ? (
        <View style={styles.processingOverlay}>
          <View style={styles.processingPanel}>
            <View style={styles.processingImageFrame}>
              <Image
                source={{ uri: activeVersion.refinedCard.image_url }}
                style={styles.processingImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.eyebrow}>Refining with AI</Text>
            <Text style={styles.processingTitle}>{processingStages[processingStageIndex]}</Text>
            <Text style={styles.processingBasedOn}>Branching from {activeVersion.label}</Text>
            <Text style={styles.processingPrompt} numberOfLines={3}>
              {pendingInstruction}
            </Text>
            <View style={styles.processingStageList}>
              {processingStages.map((stage, index) => (
                <Text
                  key={stage}
                  style={[
                    styles.processingStageText,
                    index <= processingStageIndex && styles.processingStageTextActive,
                  ]}
                >
                  {stage}
                </Text>
              ))}
            </View>
            <ActivityIndicator color={theme.colors.textPrimary} />
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function labelForSection(section: string) {
  const labels: Record<string, string> = {
    creative_direction: "Creative angle",
    design_moves: "Moves",
    one_line_read: "Core read",
    palette: "Palette",
    project_lens: "Applications",
    related_links: "References",
    search_language: "Search terms",
    type_direction: "Type",
    visual_dna: "Visual DNA",
  };

  return labels[section] || section;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    paddingBottom: 56,
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
  activePanel: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small,
    backgroundColor: "#0E0E0E",
  },
  activePanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing.md,
  },
  activePanelTitleBlock: {
    gap: theme.spacing.xs,
    flex: 1,
  },
  panelLabel: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  activeVersionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },
  activeVersionMeta: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  statusChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small,
  },
  statusChipText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  activeVersionSummary: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  activeActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  activeActionChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    borderRadius: theme.radius.small,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  activeActionChipText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  promptSummary: {
    gap: 6,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  promptSummaryLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  promptSummaryText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  changedSectionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  changedSectionChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  changedSectionChipText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  versionList: {
    gap: theme.spacing.sm,
  },
  versionCard: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.background,
  },
  versionCardActive: {
    borderColor: theme.colors.textPrimary,
    backgroundColor: "#101010",
  },
  versionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  versionTitleBlock: {
    flex: 1,
    gap: 4,
  },
  versionLabel: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  versionLabelActive: {
    color: theme.colors.textPrimary,
  },
  versionMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  versionMetaActive: {
    color: theme.colors.textPrimary,
  },
  versionSummary: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  versionSummaryActive: {
    color: theme.colors.textPrimary,
  },
  latestChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.small,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  latestChipActive: {
    borderColor: theme.colors.textPrimary,
    backgroundColor: theme.colors.textPrimary,
  },
  latestChipText: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  latestChipTextActive: {
    color: theme.colors.background,
  },
  versionChangedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  versionChangedChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.small,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  versionChangedChipActive: {
    borderColor: theme.colors.textPrimary,
  },
  versionChangedChipText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  versionChangedChipTextActive: {
    color: theme.colors.textPrimary,
  },
  versionInstruction: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  versionInstructionActive: {
    color: theme.colors.textSecondary,
  },
  meta: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  promptGroups: {
    gap: theme.spacing.md,
  },
  promptGroup: {
    gap: theme.spacing.sm,
  },
  promptGroupTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
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
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    padding: theme.spacing.lg,
    backgroundColor: "rgba(0,0,0,0.88)",
  },
  processingPanel: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.small,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  processingImageFrame: {
    width: "100%",
    aspectRatio: 0.75,
    overflow: "hidden",
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.surface,
  },
  processingImage: {
    width: "100%",
    height: "100%",
  },
  processingTitle: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
  },
  processingPrompt: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  processingBasedOn: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  processingStageList: {
    gap: theme.spacing.sm,
  },
  processingStageText: {
    color: "rgba(255,255,255,0.26)",
    fontSize: 15,
    fontWeight: "700",
  },
  processingStageTextActive: {
    color: theme.colors.textPrimary,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.35,
  },
});
