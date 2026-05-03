import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { User } from "firebase/auth";

import {
  ProjectBriefDraft,
  ProjectChatMessage,
  respondProjectChat,
  uploadProjectReferenceImage
} from "../services/api";
import { firebaseAuth } from "../services/firebase";
import { ProjectContext, ProjectContextInput } from "../services/projectContext";
import { theme } from "../theme";

type ProjectIntakeScreenProps = {
  initialProject?: ProjectContext | null;
  initialValues?: Partial<ProjectContextInput>;
  onCancel?: () => void;
  onComplete: (project: ProjectContext) => void;
  onSave: (project: ProjectContextInput) => Promise<ProjectContext>;
};

export function ProjectIntakeScreen({
  initialProject,
  initialValues,
  onCancel,
  onComplete,
  onSave
}: ProjectIntakeScreenProps) {
  const seedDraft = useMemo(
    () => buildDraftFromSeed(initialProject ?? initialValues),
    [initialProject, initialValues]
  );
  const seedSignature = JSON.stringify(seedDraft);
  const [draft, setDraft] = useState<ProjectBriefDraft>(seedDraft);
  const [messages, setMessages] = useState<ProjectChatMessage[]>([]);
  const [composer, setComposer] = useState("");
  const [briefSummary, setBriefSummary] = useState("Loading your project brief...");
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isReadyToSave, setIsReadyToSave] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBriefExpanded, setIsBriefExpanded] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const isEditing = Boolean(initialProject);

  const referenceCount = draft.referenceLinks.length + draft.referenceImages.length;
  const disableSend = isBooting || isSending || isUploadingReference || !composer.trim().length;
  const canSave =
    isReadyToSave ||
    Boolean(
      (draft.name?.trim() || draft.projectType?.trim()) &&
        (draft.description?.trim() || draft.desiredFeeling?.trim()) &&
        (draft.priorities.length ||
          draft.directionTags.length ||
          draft.referenceLinks.length ||
          draft.referenceImages.length)
    );

  useEffect(() => {
    setDraft(seedDraft);
    setMessages([]);
    setComposer("");
    setIsBriefExpanded(false);
    setIsReadyToSave(false);
    setSuggestedReplies([]);
    setMissingFields([]);
    void bootstrapConversation(seedDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedSignature]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 60);

    return () => clearTimeout(timeout);
  }, [messages, isSending, suggestedReplies]);

  const saveLabel = useMemo(() => {
    if (isSaving) {
      return "Saving";
    }

    if (isEditing) {
      return "Update project context";
    }

    return "Save project context";
  }, [isEditing, isSaving]);

  async function bootstrapConversation(nextDraft: ProjectBriefDraft) {
    setIsBooting(true);
    setError(null);

    try {
      const token = await getIdToken();
      const response = await respondProjectChat(token, {
        draft: nextDraft,
        history: [],
        message: null
      });

      setDraft(response.draft);
      setBriefSummary(response.briefSummary);
      setSuggestedReplies(response.suggestedReplies);
      setMissingFields(response.missingFields);
      setIsReadyToSave(response.isReadyToSave);
      setMessages([{ role: "assistant", content: response.assistantMessage }]);
    } catch (caughtError) {
      setError("Could not load the project brief conversation.");
    } finally {
      setIsBooting(false);
    }
  }

  async function sendMessage(
    message: string,
    input?: { referenceImages?: string[]; referenceLinks?: string[] }
  ) {
    const trimmed = message.trim();
    if (
      (!trimmed && !(input?.referenceImages?.length ?? 0) && !(input?.referenceLinks?.length ?? 0)) ||
      isSending
    ) {
      return;
    }

    const userMessage = trimmed || "Use this reference image to sharpen the project world.";
    const nextHistory = [...messages, { role: "user" as const, content: userMessage }];

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setComposer("");
    setError(null);
    setMessages(nextHistory);
    setIsSending(true);

    try {
      const token = await getIdToken();
      const response = await respondProjectChat(token, {
        draft,
        history: nextHistory,
        message: userMessage,
        referenceImages: input?.referenceImages ?? [],
        referenceLinks: input?.referenceLinks ?? extractUrlsFromMessage(userMessage)
      });

      setDraft(response.draft);
      setBriefSummary(response.briefSummary);
      setSuggestedReplies(response.suggestedReplies);
      setMissingFields(response.missingFields);
      setIsReadyToSave(response.isReadyToSave);
      setMessages([...nextHistory, { role: "assistant", content: response.assistantMessage }]);
    } catch (caughtError) {
      setError("Could not update the project brief.");
    } finally {
      setIsSending(false);
    }
  }

  async function handlePickReferenceImage() {
    if (isSending || isBooting) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const asset = result.assets[0];
    setError(null);

    try {
      setIsUploadingReference(true);
      const token = await getIdToken();
      const imageUrl = await uploadProjectReferenceImage(token, {
        imageUri: asset.uri,
        mimeType: asset.mimeType
      });
      await sendMessage("Use this reference image to sharpen the project world.", {
        referenceImages: [imageUrl]
      });
    } catch (caughtError) {
      setError("Could not upload that reference image.");
    } finally {
      setIsUploadingReference(false);
    }
  }

  async function handleSave() {
    if (!canSave || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const project = await onSave({
        avoid: draft.avoid,
        audience: draft.audience,
        description: draft.description?.trim() ?? "",
        desiredFeeling: draft.desiredFeeling,
        directionTags: draft.directionTags,
        name: inferProjectName(draft),
        priorities: draft.priorities,
        projectType: draft.projectType?.trim() ?? "",
        referenceImages: draft.referenceImages,
        referenceLinks: draft.referenceLinks
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete(project);
    } catch (caughtError) {
      setError("Could not save the project context.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
      style={styles.container}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="always"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
      >
        <View style={styles.topBar}>
          {onCancel ? (
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Text style={styles.topBarTitle}>Project context</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Active project</Text>
          <Text style={styles.heroTitle}>
            {isEditing
              ? "Refine the brief behind every scan."
              : "Start a conversation about what you are building."}
          </Text>
          <Text style={styles.heroBody}>
            Reply naturally, paste links, or attach reference images. Palleto will keep updating
            the brief as the conversation sharpens.
          </Text>
        </View>

        <Pressable
          onPress={() => setIsBriefExpanded((current) => !current)}
          style={({ pressed }) => [styles.summaryCard, pressed && styles.pressed]}
        >
          <View style={styles.summaryHeader}>
            <View style={styles.summaryHeaderText}>
              <Text style={styles.cardLabel}>Live brief</Text>
              <Text numberOfLines={isBriefExpanded ? undefined : 2} style={styles.summaryText}>
                {briefSummary}
              </Text>
            </View>
            <Text style={styles.summaryToggle}>{isBriefExpanded ? "Hide" : "Open"}</Text>
          </View>
          <View style={styles.metaRow}>
            <MetaPill label={draft.projectType || "Project type pending"} />
            <MetaPill label={referenceCount ? `${referenceCount} references` : "No references yet"} />
            <MetaPill label={missingFields.length ? `${missingFields.length} open points` : "Ready to save"} />
          </View>
          {isBriefExpanded ? <BriefGrid draft={draft} /> : null}
        </Pressable>

        <View style={styles.thread}>
          {messages.map((message, index) =>
            message.role === "assistant" ? (
              <AssistantMessage key={`${message.role}-${index}`} message={message.content} />
            ) : (
              <UserMessage key={`${message.role}-${index}`} message={message.content} />
            )
          )}

          {isSending ? (
            <View style={styles.assistantMessage}>
              <Text style={styles.messageEyebrow}>Palleto</Text>
              <Text style={styles.typingText}>Working on it...</Text>
              <ActivityIndicator color={theme.colors.textPrimary} />
            </View>
          ) : null}
        </View>

        {suggestedReplies.length ? (
          <View style={styles.suggestionsBlock}>
            <Text style={styles.blockTitle}>Try one of these</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.suggestions}>
                {suggestedReplies.map((reply) => (
                  <Pressable
                    key={reply}
                    onPress={() =>
                      isSaveSuggestion(reply) && canSave ? void handleSave() : void sendMessage(reply)
                    }
                    style={({ pressed }) => [styles.suggestionChip, pressed && styles.pressed]}
                  >
                    <Text style={styles.suggestionText}>{reply}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {draft.referenceImages.length ? (
          <View style={styles.referencesBlock}>
            <Text style={styles.blockTitle}>Reference images</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.referenceImageRow}>
                {draft.referenceImages.map((imageUrl) => (
                  <Image key={imageUrl} source={{ uri: imageUrl }} style={styles.referenceImage} />
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {draft.referenceLinks.length ? (
          <View style={styles.referencesBlock}>
            <Text style={styles.blockTitle}>Reference links</Text>
            <View style={styles.referenceLinkList}>
              {draft.referenceLinks.map((link) => (
                <View key={link} style={styles.referenceLink}>
                  <Text numberOfLines={1} style={styles.referenceLinkText}>
                    {link}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.composerShell}>
        <View style={styles.composerActions}>
          <Pressable
            onPress={() => void handlePickReferenceImage()}
            disabled={isSending || isBooting || isUploadingReference}
            style={({ pressed }) => [
              styles.attachButton,
              pressed && styles.pressed,
              (isSending || isBooting || isUploadingReference) && styles.disabled
            ]}
          >
            <Text style={styles.attachButtonText}>
              {isUploadingReference ? "Uploading..." : "Add image"}
            </Text>
          </Pressable>
          <Text style={styles.helperText}>Paste links or answer naturally.</Text>
        </View>

        <View style={styles.composerRow}>
          <TextInput
            multiline
            onChangeText={setComposer}
            placeholder="What are you building, what should it feel like, or what should it avoid?"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.composerInput}
            value={composer}
          />
          <Pressable
            disabled={disableSend}
            onPress={() => void sendMessage(composer)}
            style={({ pressed }) => [
              styles.sendButton,
              pressed && styles.pressed,
              disableSend && styles.disabled
            ]}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </Pressable>
        </View>

        <Pressable
          disabled={!canSave || isSaving}
          onPress={() => void handleSave()}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.pressed,
            (!canSave || isSaving) && styles.disabled
          ]}
        >
          <Text style={styles.saveButtonText}>{saveLabel}</Text>
        </Pressable>
        {!canSave ? (
          <Text style={styles.footerHint}>
            {missingFields.length
              ? `Still open: ${missingFields.join(", ")}`
              : "Keep going until the brief feels specific enough to save."}
          </Text>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

function AssistantMessage({ message }: { message: string }) {
  return (
    <View style={styles.assistantMessage}>
      <Text style={styles.messageEyebrow}>Palleto</Text>
      <Text style={styles.assistantText}>{message}</Text>
    </View>
  );
}

function UserMessage({ message }: { message: string }) {
  return (
    <View style={styles.userMessage}>
      <Text style={styles.userText}>{message}</Text>
    </View>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaPillText}>{label}</Text>
    </View>
  );
}

function BriefGrid({ draft }: { draft: ProjectBriefDraft }) {
  const rows = [
    ["Project", draft.projectType || draft.name || "Still defining the project"],
    ["Use it for", draft.description || "Describe what you are actually building."],
    ["Desired feel", draft.desiredFeeling || "Add the emotional or creative target."],
    ["Avoid", draft.avoid || "No guardrails yet."],
    [
      "What to pull",
      draft.priorities.length ? draft.priorities.join(", ") : "Let the AI infer what matters."
    ]
  ];

  return (
    <View style={styles.briefGrid}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.briefRow}>
          <Text style={styles.briefLabel}>{label}</Text>
          <Text style={styles.briefValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function buildDraftFromSeed(
  seed: ProjectContext | Partial<ProjectContextInput> | null | undefined
): ProjectBriefDraft {
  return {
    audience: seed?.audience ?? null,
    avoid: seed?.avoid ?? null,
    description: seed?.description ?? null,
    desiredFeeling: seed?.desiredFeeling ?? null,
    directionTags: seed?.directionTags ?? [],
    name: seed?.name ?? null,
    priorities: seed?.priorities ?? [],
    projectType: seed?.projectType ?? null,
    referenceImages: seed?.referenceImages ?? [],
    referenceLinks: seed?.referenceLinks ?? []
  };
}

function inferProjectName(draft: ProjectBriefDraft) {
  if (draft.name?.trim()) {
    return draft.name.trim();
  }

  if (draft.description?.trim()) {
    const firstSentence = draft.description.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length <= 42) {
      return firstSentence;
    }
  }

  return draft.projectType?.trim() || "Active project";
}

async function getIdToken() {
  const user = firebaseAuth.currentUser as User | null;

  if (!user) {
    throw new Error("User must be signed in.");
  }

  return user.getIdToken();
}

function extractUrlsFromMessage(message: string) {
  const matches = message.match(/https?:\/\/[^\s]+/g);
  return matches ?? [];
}

function isSaveSuggestion(reply: string) {
  const normalized = reply.trim().toLowerCase();
  return normalized.includes("save") && normalized.includes("project");
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  scroll: {
    flex: 1
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 32,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  topBarTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800"
  },
  topBarSpacer: {
    width: 40
  },
  backButton: {
    minWidth: 40,
    paddingVertical: theme.spacing.xs
  },
  backButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "800"
  },
  hero: {
    gap: theme.spacing.sm
  },
  heroEyebrow: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  heroTitle: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 29
  },
  heroBody: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  summaryCard: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.small,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.md
  },
  summaryHeaderText: {
    flex: 1,
    gap: theme.spacing.sm
  },
  summaryToggle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "800"
  },
  cardLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  summaryText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  metaPill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  metaPillText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "700"
  },
  briefGrid: {
    gap: theme.spacing.sm
  },
  briefRow: {
    gap: 6
  },
  briefLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  briefValue: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 20
  },
  thread: {
    gap: theme.spacing.md,
    paddingTop: theme.spacing.xs
  },
  assistantMessage: {
    alignSelf: "flex-start",
    maxWidth: "88%",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.small,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  messageEyebrow: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  assistantText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 23
  },
  userMessage: {
    alignSelf: "flex-end",
    maxWidth: "86%",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: theme.radius.small
  },
  userText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  typingText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  suggestionsBlock: {
    gap: theme.spacing.sm
  },
  suggestions: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  suggestionChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.surface
  },
  suggestionText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  referencesBlock: {
    gap: theme.spacing.sm
  },
  blockTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800"
  },
  referenceImageRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  referenceImage: {
    width: 108,
    height: 108,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.surface
  },
  referenceLinkList: {
    gap: theme.spacing.sm
  },
  referenceLink: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.small,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  referenceLinkText: {
    color: theme.colors.textPrimary,
    fontSize: 14
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    lineHeight: 20
  },
  composerShell: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 34,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  composerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  attachButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.radius.small,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  attachButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700"
  },
  helperText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.spacing.sm
  },
  composerInput: {
    flex: 1,
    minHeight: 54,
    maxHeight: 120,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.small,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: "top"
  },
  sendButton: {
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.textPrimary
  },
  sendButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: "800"
  },
  saveButton: {
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.textPrimary
  },
  saveButtonText: {
    color: theme.colors.background,
    fontSize: 15,
    fontWeight: "800"
  },
  footerHint: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17
  },
  disabled: {
    opacity: 0.4
  },
  pressed: {
    opacity: 0.8
  }
});
