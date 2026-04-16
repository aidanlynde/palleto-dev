import { useState } from "react";
import {
  ImageBackground,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { OnboardingSurveyAnswers } from "../services/onboarding";
import { theme } from "../theme";

type OnboardingScreenProps = {
  onComplete: (surveyAnswers: OnboardingSurveyAnswers) => void;
};

type Slide = {
  body: string;
  image: ImageSourcePropType;
  kicker: string;
  title: string;
};

type SurveyQuestion = {
  id: string;
  options: string[];
  prompt: string;
  multiSelect?: boolean;
};

const slides: Slide[] = [
  {
    kicker: "Capture",
    title: "Save what catches your eye.",
    body: "Color, texture, signage, spaces, packaging, light, and small visual moments before they disappear.",
    image: require("../../assets/onboarding/capture-studio.png")
  },
  {
    kicker: "Interpret",
    title: "Turn reference into direction.",
    body: "Palleto reads the image and translates it into palette, material, mood, type, and visual language.",
    image: require("../../assets/onboarding/capture-cathedral.png")
  },
  {
    kicker: "Collect",
    title: "Keep the references that matter.",
    body: "Every scan becomes a structured inspiration card you can revisit, organize, and build from.",
    image: require("../../assets/onboarding/capture-architecture.png")
  },
  {
    kicker: "Share",
    title: "Make the reference usable.",
    body: "Turn raw inspiration into a polished card with palette, texture, mood, type direction, and context.",
    image: require("../../assets/onboarding/capture-tile.png")
  }
];

const questions: SurveyQuestion[] = [
  {
    id: "collecting_for",
    prompt: "What are you usually collecting inspiration for?",
    multiSelect: true,
    options: [
      "Brand identity",
      "Interiors",
      "Fashion",
      "Product design",
      "Content",
      "Art direction",
      "Personal library"
    ]
  },
  {
    id: "notices",
    prompt: "What do you notice first in the real world?",
    multiSelect: true,
    options: ["Color", "Texture", "Typography", "Materials", "Light", "Composition", "Objects"]
  },
  {
    id: "help_with",
    prompt: "How should Palleto help?",
    multiSelect: true,
    options: [
      "Remember what I saw",
      "Create direction",
      "Build moodboards faster",
      "Find patterns in my taste",
      "Share ideas"
    ]
  },
  {
    id: "save_frequency",
    prompt: "How often do you save visual references?",
    options: ["Constantly", "A few times a week", "Starting a project", "I want to start"]
  }
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingSurveyAnswers>({});

  const isSurveyStep = step >= slides.length;
  const surveyIndex = step - slides.length;
  const question = questions[surveyIndex];
  const totalSteps = slides.length + questions.length;
  const selectedAnswers = question ? answers[question.id] ?? [] : [];
  const canContinue = !isSurveyStep || selectedAnswers.length > 0;

  function toggleAnswer(option: string) {
    if (!question) {
      return;
    }

    setAnswers((current) => {
      const currentAnswers = current[question.id] ?? [];
      const nextAnswers = question.multiSelect
        ? currentAnswers.includes(option)
          ? currentAnswers.filter((answer) => answer !== option)
          : [...currentAnswers, option]
        : [option];

      return {
        ...current,
        [question.id]: nextAnswers
      };
    });
  }

  function continueFlow() {
    if (!canContinue) {
      return;
    }

    if (step === totalSteps - 1) {
      onComplete(answers);
      return;
    }

    setStep(step + 1);
  }

  if (isSurveyStep && question) {
    return (
      <View style={styles.surveyContainer}>
        <Progress current={step + 1} total={totalSteps} />
        <View>
          <Text style={styles.kicker}>Make it yours</Text>
          <Text style={styles.surveyTitle}>{question.prompt}</Text>
          <Text style={styles.surveyHint}>
            {question.multiSelect ? "Choose any that fit." : "Choose one."}
          </Text>
        </View>

        <View style={styles.optionGrid}>
          {question.options.map((option) => {
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

        <FooterButton
          disabled={!canContinue}
          label={step === totalSteps - 1 ? "Enter Palleto" : "Continue"}
          onPress={continueFlow}
        />
      </View>
    );
  }

  const slide = slides[step];

  return (
    <ImageBackground source={slide.image} style={styles.imageSlide} resizeMode="cover">
      <View style={styles.scrim}>
        <Progress current={step + 1} total={totalSteps} />
        <View style={styles.slideCopy}>
          <Text style={styles.kicker}>{slide.kicker}</Text>
          <Text style={styles.slideTitle}>{slide.title}</Text>
          <Text style={styles.slideBody}>{slide.body}</Text>
        </View>
        <FooterButton label="Continue" onPress={continueFlow} />
      </View>
    </ImageBackground>
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
  imageSlide: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  scrim: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 72,
    paddingBottom: 40,
    backgroundColor: "rgba(0,0,0,0.28)"
  },
  progressTrack: {
    flexDirection: "row",
    gap: theme.spacing.xs
  },
  progressDot: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.28)"
  },
  progressDotActive: {
    backgroundColor: theme.colors.textPrimary
  },
  slideCopy: {
    gap: theme.spacing.md
  },
  kicker: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  slideTitle: {
    color: theme.colors.textPrimary,
    fontSize: 38,
    fontWeight: "800",
    lineHeight: 42
  },
  slideBody: {
    maxWidth: 330,
    color: theme.colors.textPrimary,
    fontSize: 16,
    lineHeight: 24
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
  surveyContainer: {
    flex: 1,
    justifyContent: "space-between",
    gap: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 72,
    paddingBottom: 40,
    backgroundColor: theme.colors.background
  },
  surveyTitle: {
    marginTop: theme.spacing.lg,
    color: theme.colors.textPrimary,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38
  },
  surveyHint: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  option: {
    minHeight: 44,
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
    fontSize: 15,
    fontWeight: "700"
  },
  optionTextSelected: {
    color: theme.colors.background
  },
  pressed: {
    opacity: 0.72
  },
  disabled: {
    opacity: 0.35
  }
});
