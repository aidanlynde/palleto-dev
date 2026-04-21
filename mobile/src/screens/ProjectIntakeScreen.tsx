import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { ProjectContext, ProjectContextInput } from "../services/projectContext";
import { theme } from "../theme";

type ProjectIntakeScreenProps = {
  initialProject?: ProjectContext | null;
  initialValues?: Partial<ProjectContextInput>;
  onCancel?: () => void;
  onComplete: (project: ProjectContext) => void;
  onSave: (project: ProjectContextInput) => Promise<ProjectContext>;
};

const projectTypes = [
  "Clothing brand",
  "Brand identity",
  "Interior concept",
  "Product design",
  "Campaign",
  "Personal archive"
];

const directionTags = [
  "Minimal",
  "Luxury",
  "Street",
  "Editorial",
  "Organic",
  "Industrial",
  "Technical",
  "Experimental"
];

const priorities = ["Color systems", "Materials", "Typography", "Patterns", "Composition", "Mood"];

export function ProjectIntakeScreen({
  initialProject,
  initialValues,
  onCancel,
  onComplete,
  onSave
}: ProjectIntakeScreenProps) {
  const seedValues = initialProject ?? initialValues;
  const [step, setStep] = useState(0);
  const [description, setDescription] = useState(seedValues?.description ?? "");
  const [projectType, setProjectType] = useState(seedValues?.projectType ?? "");
  const [selectedDirectionTags, setSelectedDirectionTags] = useState<string[]>(
    seedValues?.directionTags ?? []
  );
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(
    seedValues?.priorities ?? []
  );
  const [audience, setAudience] = useState(seedValues?.audience ?? "");
  const [desiredFeeling, setDesiredFeeling] = useState(seedValues?.desiredFeeling ?? "");
  const [avoid, setAvoid] = useState(seedValues?.avoid ?? "");
  const [referenceLinks, setReferenceLinks] = useState(
    seedValues?.referenceLinks?.join("\n") ?? ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const totalSteps = 6;
  const isEditing = Boolean(initialProject);

  const canContinue = useMemo(() => {
    if (step === 0) {
      return description.trim().length >= 8;
    }

    if (step === 1) {
      return Boolean(projectType);
    }

    if (step === 2) {
      return selectedDirectionTags.length > 0;
    }

    if (step === 3) {
      return selectedPriorities.length > 0;
    }

    return true;
  }, [description, projectType, selectedDirectionTags, selectedPriorities, step]);

  function toggleOption(option: string, selected: string[], setSelected: (value: string[]) => void) {
    Haptics.selectionAsync();
    setSelected(
      selected.includes(option)
        ? selected.filter((selectedOption) => selectedOption !== option)
        : [...selected, option]
    );
  }

  async function continueFlow() {
    if (!canContinue || isSaving) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (step < totalSteps - 1) {
      setStep(step + 1);
      return;
    }

    setIsSaving(true);

    try {
      const project = await onSave({
        avoid: avoid.trim() || null,
        audience: audience.trim() || null,
        description: description.trim(),
        desiredFeeling: desiredFeeling.trim() || null,
        directionTags: selectedDirectionTags,
        name: initialProject?.name ?? inferProjectName(description, projectType),
        priorities: selectedPriorities,
        projectType,
        referenceLinks: referenceLinks
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean)
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete(project);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {onCancel ? (
          <View style={styles.topBar}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.progressTrack}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View
              key={index}
              style={[styles.progressDot, index <= step && styles.progressDotActive]}
            />
          ))}
        </View>

        <View style={styles.thread}>
          <AssistantMessage
            eyebrow="Project context"
            message={
              isEditing
                ? "Update what you are building right now. Future scans will read through this brief."
                : "Before you start scanning, tell Palleto what you are working on. The better the context, the sharper every inspiration card gets."
            }
          />

          {step === 0 ? (
            <View style={styles.answerBlock}>
              <Text style={styles.question}>What are you working on right now?</Text>
              <TextInput
                multiline
                onChangeText={setDescription}
                placeholder="A small clothing brand inspired by racing graphics, city signage, and worn-in technical gear."
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.textInput}
                value={description}
              />
            </View>
          ) : null}

          {step >= 1 ? (
            <UserMessage message={description.trim()} />
          ) : null}

          {step === 1 ? (
            <ChoiceStep
              options={projectTypes}
              prompt="What kind of project is it?"
              selected={[projectType]}
              onSelect={(option) => {
                Haptics.selectionAsync();
                setProjectType(option);
              }}
            />
          ) : null}

          {step >= 2 ? <UserMessage message={projectType} /> : null}

          {step === 2 ? (
            <ChoiceStep
              multiSelect
              options={directionTags}
              prompt="What direction are you drawn to?"
              selected={selectedDirectionTags}
              onSelect={(option) =>
                toggleOption(option, selectedDirectionTags, setSelectedDirectionTags)
              }
            />
          ) : null}

          {step >= 3 ? <UserMessage message={selectedDirectionTags.join(", ")} /> : null}

          {step === 3 ? (
            <ChoiceStep
              multiSelect
              options={priorities}
              prompt="What should Palleto help you find?"
              selected={selectedPriorities}
              onSelect={(option) => toggleOption(option, selectedPriorities, setSelectedPriorities)}
            />
          ) : null}

          {step >= 4 ? <UserMessage message={selectedPriorities.join(", ")} /> : null}

          {step === 4 ? (
            <View style={styles.answerBlock}>
              <AssistantMessage
                eyebrow="Project lens"
                message="Who is this for, and what should the work feel like when it is dialed?"
              />
              <TextInput
                onChangeText={setAudience}
                placeholder="Audience or customer"
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.singleLineInput}
                value={audience}
              />
              <TextInput
                multiline
                onChangeText={setDesiredFeeling}
                placeholder="Soft editorial, hand-touched, quiet confidence, more sculptural than corporate."
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.textInput}
                value={desiredFeeling}
              />
            </View>
          ) : null}

          {step >= 5 ? (
            <UserMessage
              message={[audience.trim(), desiredFeeling.trim()].filter(Boolean).join(" • ") || "No extra project lens"}
            />
          ) : null}

          {step === 5 ? (
            <View style={styles.answerBlock}>
              <AssistantMessage
                eyebrow="Guardrails"
                message="Anything Palleto should avoid, or any links that define the world you want?"
              />
              <TextInput
                multiline
                onChangeText={setAvoid}
                placeholder="No generic streetwear, no beige wellness branding, nothing too polished."
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.textInput}
                value={avoid}
              />
              <TextInput
                multiline
                onChangeText={setReferenceLinks}
                placeholder="Paste one reference link per line"
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.textInput}
                value={referenceLinks}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          disabled={!canContinue || isSaving}
          onPress={continueFlow}
          style={({ pressed }) => [
            styles.footerButton,
            pressed && styles.pressed,
            (!canContinue || isSaving) && styles.disabled
          ]}
        >
          <Text style={styles.footerButtonText}>
            {step === totalSteps - 1 ? (isSaving ? "Saving" : "Save project context") : "Continue"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function ChoiceStep({
  multiSelect,
  onSelect,
  options,
  prompt,
  selected
}: {
  multiSelect?: boolean;
  onSelect: (option: string) => void;
  options: string[];
  prompt: string;
  selected: string[];
}) {
  return (
    <View style={styles.answerBlock}>
      <AssistantMessage
        eyebrow={multiSelect ? "Choose any that fit" : "Choose one"}
        message={prompt}
      />
      <View style={styles.optionGrid}>
        {options.map((option) => {
          const isSelected = selected.includes(option);

          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              style={({ pressed }) => [
                styles.option,
                isSelected && styles.optionSelected,
                pressed && styles.pressed
              ]}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function AssistantMessage({ eyebrow, message }: { eyebrow: string; message: string }) {
  return (
    <View style={styles.assistantMessage}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
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

function inferProjectName(description: string, projectType: string) {
  const firstSentence = description.split(/[.!?]/)[0]?.trim();

  if (firstSentence && firstSentence.length <= 42) {
    return firstSentence;
  }

  return projectType;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    gap: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 64,
    paddingBottom: 120
  },
  topBar: {
    flexDirection: "row"
  },
  backButton: {
    paddingVertical: theme.spacing.xs
  },
  backButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "800"
  },
  progressTrack: {
    flexDirection: "row",
    gap: theme.spacing.xs
  },
  progressDot: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.22)"
  },
  progressDotActive: {
    backgroundColor: theme.colors.textPrimary
  },
  thread: {
    gap: theme.spacing.lg
  },
  assistantMessage: {
    alignSelf: "flex-start",
    maxWidth: "92%",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  eyebrow: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  assistantText: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28
  },
  answerBlock: {
    gap: theme.spacing.md
  },
  question: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34
  },
  textInput: {
    minHeight: 136,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small,
    fontSize: 16,
    lineHeight: 23,
    textAlignVertical: "top"
  },
  singleLineInput: {
    minHeight: 52,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small,
    fontSize: 16,
    lineHeight: 22
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
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  option: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.background
  },
  optionSelected: {
    backgroundColor: theme.colors.textPrimary,
    borderColor: theme.colors.textPrimary
  },
  optionText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  optionTextSelected: {
    color: theme.colors.background
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 34,
    backgroundColor: theme.colors.background,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1
  },
  footerButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: theme.radius.small
  },
  footerButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: "800"
  },
  pressed: {
    opacity: 0.72
  },
  disabled: {
    opacity: 0.35
  }
});
