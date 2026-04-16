import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { OnboardingSurveyAnswers } from "../services/onboarding";
import { theme } from "../theme";

type OnboardingScreenProps = {
  onComplete: (surveyAnswers: OnboardingSurveyAnswers) => void;
};

type Question = {
  id: string;
  kicker: string;
  options: string[];
  prompt: string;
};

const questions: Question[] = [
  {
    id: "notices",
    kicker: "Taste calibration",
    prompt: "What caught your eye first?",
    options: ["Color", "Texture", "Movement", "Contrast", "Street detail", "Graphic shape"]
  },
  {
    id: "collecting_for",
    kicker: "Creative intent",
    prompt: "What would you use a reference like this for?",
    options: ["Brand identity", "Packaging", "Art direction", "Moodboard", "Product idea", "Personal archive"]
  },
  {
    id: "help_with",
    kicker: "Analysis style",
    prompt: "How should Palleto read references for you?",
    options: ["More editorial", "More practical", "More luxury", "More experimental", "More minimal"]
  }
];

const processingStages = [
  "Reading palette",
  "Studying contrast",
  "Finding texture",
  "Building direction"
];

const palette = [
  { hex: "#F26A21", label: "Signal orange" },
  { hex: "#111111", label: "Tar black" },
  { hex: "#F4F1EA", label: "Chalk white" },
  { hex: "#67675F", label: "Weathered concrete" },
  { hex: "#2D2F2A", label: "Soft shadow" }
];

const cardTags = ["street ritual", "graphic movement", "urban folklore", "high-contrast mark-making"];
const textureTags = ["rough pavement", "sprayed edge", "worn stencil", "chalky contrast"];
const fontDirections = ["compressed grotesk", "ink-trap sans", "utility mono"];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingSurveyAnswers>({});
  const [processingIndex, setProcessingIndex] = useState(0);

  const totalSteps = 7;
  const currentQuestion = questions[step - 2];
  const isQuestionStep = Boolean(currentQuestion);
  const selectedAnswers = currentQuestion ? answers[currentQuestion.id] ?? [] : [];
  const canContinue = !isQuestionStep || selectedAnswers.length > 0;

  const summaryLine = useMemo(() => {
    const intent = answers.collecting_for?.slice(0, 2).join(" and ") || "creative direction";
    const notices = answers.notices?.slice(0, 3).join(", ") || "color, texture, and contrast";
    const style = answers.help_with?.[0]?.toLowerCase() || "editorial";

    return `Tuned for ${intent}. Prioritizing ${notices}. Reading references with a ${style} lens.`;
  }, [answers]);

  useEffect(() => {
    if (step !== 5) {
      return;
    }

    setProcessingIndex(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const interval = setInterval(() => {
      setProcessingIndex((current) => {
        const next = current + 1;

        if (next < processingStages.length) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return next;
        }

        clearInterval(interval);
        setTimeout(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setStep(6);
        }, 450);
        return current;
      });
    }, 760);

    return () => clearInterval(interval);
  }, [step]);

  function toggleAnswer(option: string) {
    if (!currentQuestion) {
      return;
    }

    Haptics.selectionAsync();

    setAnswers((current) => {
      const currentAnswers = current[currentQuestion.id] ?? [];
      const nextAnswers = currentAnswers.includes(option)
        ? currentAnswers.filter((answer) => answer !== option)
        : [...currentAnswers, option];

      return {
        ...current,
        [currentQuestion.id]: nextAnswers
      };
    });
  }

  function continueFlow() {
    if (!canContinue) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (step === 6) {
      onComplete(answers);
      return;
    }

    setStep(step + 1);
  }

  if (step === 0) {
    return (
      <ImageBackground
        source={require("../../assets/onboarding/capture-studio.png")}
        style={styles.fullscreen}
        resizeMode="cover"
      >
        <View style={styles.imageScrim}>
          <View>
            <Image
              source={require("../../assets/brand/palleto-logo-transparent.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.introCopy}>
            <Text style={styles.kicker}>Palleto</Text>
            <Text style={styles.heroTitle}>For the references you notice before anyone else.</Text>
            <Text style={styles.heroBody}>
              Capture the color, texture, type, material, and mood hiding in everyday life.
            </Text>
          </View>
          <FooterButton label="Begin" onPress={continueFlow} />
        </View>
      </ImageBackground>
    );
  }

  if (step === 1) {
    return (
      <ImageBackground
        source={require("../../assets/demo/koi-street-reference.png")}
        style={styles.fullscreen}
        resizeMode="cover"
      >
        <View style={styles.captureScrim}>
          <Progress current={2} total={totalSteps} />
          <View style={styles.captureChrome}>
            <Text style={styles.captureLabel}>Street reference</Text>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
              <View style={styles.scanLine} />
            </View>
            <Text style={styles.captureHint}>Imagine you spotted this walking home.</Text>
          </View>
          <FooterButton label="Capture reference" onPress={continueFlow} />
        </View>
      </ImageBackground>
    );
  }

  if (isQuestionStep && currentQuestion) {
    return (
      <ImageBackground
        source={require("../../assets/demo/koi-street-reference.png")}
        style={styles.fullscreen}
        resizeMode="cover"
      >
        <View style={styles.questionScrim}>
          <Progress current={step + 1} total={totalSteps} />
          <View style={styles.questionPanel}>
            <Text style={styles.kicker}>{currentQuestion.kicker}</Text>
            <Text style={styles.questionTitle}>{currentQuestion.prompt}</Text>
            <Text style={styles.questionHint}>Choose what fits. Palleto uses this to tune the read.</Text>
            <View style={styles.optionGrid}>
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswers.includes(option);

                return (
                  <Pressable
                    key={option}
                    onPress={() => toggleAnswer(option)}
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
          <FooterButton disabled={!canContinue} label="Continue" onPress={continueFlow} />
        </View>
      </ImageBackground>
    );
  }

  if (step === 5) {
    return (
      <View style={styles.processingContainer}>
        <Progress current={6} total={totalSteps} />
        <Image
          source={require("../../assets/demo/koi-street-reference.png")}
          style={styles.processingImage}
          resizeMode="cover"
        />
        <View style={styles.processingCopy}>
          <Text style={styles.kicker}>Analyzing reference</Text>
          <Text style={styles.processingTitle}>{processingStages[processingIndex]}</Text>
          <View style={styles.stageList}>
            {processingStages.map((stage, index) => (
              <Text
                key={stage}
                style={[styles.stageText, index <= processingIndex && styles.stageTextActive]}
              >
                {stage}
              </Text>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.cardContainer} contentContainerStyle={styles.cardContent}>
      <Progress current={7} total={totalSteps} />
      <View style={styles.demoHeader}>
        <Text style={styles.kicker}>Generated card</Text>
        <Text style={styles.cardIntro}>This is what every scan becomes.</Text>
      </View>

      <View style={styles.card}>
        <Image
          source={require("../../assets/demo/koi-street-reference.png")}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Street Koi Signal</Text>
          <Text style={styles.cardDirection}>
            A high-contrast reference built from pavement grit, stencil-like forms, and a sharp
            hit of orange. It feels graphic, kinetic, and slightly ceremonial, useful for identity
            systems, packaging marks, editorial layouts, or street-level visual campaigns.
          </Text>

          <SectionLabel label="Palette" />
          <View style={styles.paletteRow}>
            {palette.map((color) => (
              <View key={color.hex} style={styles.paletteItem}>
                <View style={[styles.swatch, { backgroundColor: color.hex }]} />
                <Text style={styles.swatchLabel}>{color.label}</Text>
              </View>
            ))}
          </View>

          <SectionLabel label="Texture" />
          <TagRow tags={textureTags} />

          <SectionLabel label="Vibe" />
          <TagRow tags={cardTags} />

          <SectionLabel label="Type direction" />
          <TagRow tags={fontDirections} />
        </View>
      </View>

      <View style={styles.summaryPanel}>
        <Text style={styles.summaryTitle}>Your inspiration system is ready.</Text>
        <Text style={styles.summaryText}>{summaryLine}</Text>
      </View>

      <FooterButton label="Save my library" onPress={continueFlow} />
    </ScrollView>
  );
}

function Progress({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.progressTrack}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[styles.progressDot, index < current && styles.progressDotActive]}
        />
      ))}
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function TagRow({ tags }: { tags: string[] }) {
  return (
    <View style={styles.tagRow}>
      {tags.map((tag) => (
        <View key={tag} style={styles.tag}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}

function FooterButton({
  disabled,
  label,
  onPress
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.footerButton,
        pressed && styles.pressed,
        disabled && styles.disabled
      ]}
    >
      <Text style={styles.footerButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  imageScrim: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 64,
    paddingBottom: 40,
    backgroundColor: "rgba(0,0,0,0.34)"
  },
  logo: {
    width: 52,
    height: 52
  },
  introCopy: {
    gap: theme.spacing.md
  },
  kicker: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  heroTitle: {
    color: theme.colors.textPrimary,
    fontSize: 38,
    fontWeight: "800",
    lineHeight: 42
  },
  heroBody: {
    maxWidth: 330,
    color: theme.colors.textPrimary,
    fontSize: 16,
    lineHeight: 24
  },
  captureScrim: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 64,
    paddingBottom: 40,
    backgroundColor: "rgba(0,0,0,0.18)"
  },
  captureChrome: {
    gap: theme.spacing.lg
  },
  captureLabel: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    overflow: "hidden",
    color: theme.colors.textPrimary,
    backgroundColor: "rgba(0,0,0,0.58)",
    borderColor: "rgba(255,255,255,0.28)",
    borderWidth: 1,
    borderRadius: theme.radius.small,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  captureHint: {
    maxWidth: 250,
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28
  },
  scanFrame: {
    alignSelf: "center",
    width: 260,
    height: 340,
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1
  },
  corner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: theme.colors.textPrimary
  },
  cornerTopLeft: {
    top: -1,
    left: -1,
    borderTopWidth: 2,
    borderLeftWidth: 2
  },
  cornerTopRight: {
    top: -1,
    right: -1,
    borderTopWidth: 2,
    borderRightWidth: 2
  },
  cornerBottomLeft: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 2,
    borderLeftWidth: 2
  },
  cornerBottomRight: {
    right: -1,
    bottom: -1,
    borderRightWidth: 2,
    borderBottomWidth: 2
  },
  scanLine: {
    position: "absolute",
    top: "48%",
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.72)"
  },
  questionScrim: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 64,
    paddingBottom: 40,
    backgroundColor: "rgba(0,0,0,0.42)"
  },
  questionPanel: {
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  questionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 31,
    fontWeight: "800",
    lineHeight: 36
  },
  questionHint: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm
  },
  option: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: theme.radius.small,
    backgroundColor: "rgba(255,255,255,0.04)"
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
  processingContainer: {
    flex: 1,
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 64,
    paddingBottom: 40,
    backgroundColor: theme.colors.background
  },
  processingImage: {
    flex: 1,
    width: "100%",
    minHeight: 360,
    borderRadius: theme.radius.small
  },
  processingCopy: {
    gap: theme.spacing.md
  },
  processingTitle: {
    color: theme.colors.textPrimary,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38
  },
  stageList: {
    gap: theme.spacing.sm
  },
  stageText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 20
  },
  stageTextActive: {
    color: theme.colors.textPrimary
  },
  cardContainer: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  cardContent: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 64,
    paddingBottom: 40
  },
  demoHeader: {
    gap: theme.spacing.sm
  },
  cardIntro: {
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36
  },
  card: {
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  cardImage: {
    width: "100%",
    height: 330
  },
  cardBody: {
    gap: theme.spacing.md,
    padding: theme.spacing.md
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34
  },
  cardDirection: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 23
  },
  sectionLabel: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  paletteRow: {
    gap: theme.spacing.sm
  },
  paletteItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  swatch: {
    width: 42,
    height: 24,
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderRadius: 4
  },
  swatchLabel: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "700"
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  tag: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  tagText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700"
  },
  summaryPanel: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  summaryTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26
  },
  summaryText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22
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
