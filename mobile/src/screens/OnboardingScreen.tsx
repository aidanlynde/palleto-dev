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

import { CardDetail } from "./CardResultScreen";
import { InspirationCard } from "../services/api";
import {
  createEmptyOnboardingSurveyAnswers,
  OnboardingSurveyAnswers
} from "../services/onboarding";
import { theme } from "../theme";

type OnboardingScreenProps = {
  onComplete: (surveyAnswers: OnboardingSurveyAnswers) => void;
  onSkip?: () => void;
};

type Question = {
  id: keyof OnboardingSurveyAnswers;
  kicker: string;
  options: string[];
  prompt: string;
};

const questions: Question[] = [
  {
    id: "work_for",
    kicker: "How You Use It",
    prompt: "What kind of work are you collecting inspiration for most often?",
    options: [
      "Clothing brand",
      "Brand identity",
      "Campaign and art direction",
      "Interior or spatial direction",
      "Product or object design",
      "Personal archive"
    ]
  },
  {
    id: "extract_from_reference",
    kicker: "What You Extract",
    prompt: "When you save a reference, what are you usually trying to pull out of it?",
    options: [
      "Color systems",
      "Texture and material language",
      "Typography direction",
      "Composition and framing",
      "Mood and emotional tone",
      "How it could translate into a project"
    ]
  },
  {
    id: "useful_scan",
    kicker: "What Makes It Useful",
    prompt: "What would make a scan immediately useful instead of just interesting?",
    options: [
      "A clear big idea I can steal",
      "Project-specific applications",
      "Stronger type direction",
      "Better reference links",
      "A share-ready summary",
      "A cleaner next creative move"
    ]
  },
  {
    id: "lean_toward",
    kicker: "What To Lean Toward",
    prompt: "When Palleto translates references for you, what should it lean toward?",
    options: [
      "Organic and hand-touched",
      "Quiet luxury",
      "Editorial and cultured",
      "Raw and lived-in",
      "Technical and precise",
      "Minimal and restrained"
    ]
  },
  {
    id: "avoid",
    kicker: "What To Avoid",
    prompt: "What should the AI stay away from when it turns a reference into direction?",
    options: [
      "Corporate and sterile",
      "Blocky and utilitarian",
      "Generic streetwear",
      "Over-designed and noisy",
      "Soft wellness minimalism",
      "Too trend-driven"
    ]
  }
];

const processingStages = [
  "Reading visual signal",
  "Translating into project direction",
  "Pulling references and type lanes",
  "Building your first scan"
];

const demoImageUrl =
  "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80";

const relatedPreviewImages = [
  "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=640&q=80",
  "https://images.unsplash.com/photo-1515405295579-ba7b45403062?auto=format&fit=crop&w=640&q=80",
  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=640&q=80"
];

export function OnboardingScreen({ onComplete, onSkip }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingSurveyAnswers>(
    createEmptyOnboardingSurveyAnswers()
  );
  const [processingIndex, setProcessingIndex] = useState(0);

  const totalSteps = 8;
  const currentQuestion = step >= 1 && step <= questions.length ? questions[step - 1] : null;
  const selectedAnswers = currentQuestion ? answers[currentQuestion.id] : [];
  const canContinue = !currentQuestion || selectedAnswers.length > 0;
  const demoCard = useMemo(() => buildDemoCard(answers), [answers]);
  const summaryLine = useMemo(() => buildSummaryLine(answers), [answers]);

  useEffect(() => {
    if (step !== questions.length + 1) {
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
          setStep(questions.length + 2);
        }, 450);
        return current;
      });
    }, 720);

    return () => clearInterval(interval);
  }, [step]);

  function toggleAnswer(option: string) {
    if (!currentQuestion) {
      return;
    }

    Haptics.selectionAsync();

    setAnswers((current) => {
      const currentAnswers = current[currentQuestion.id];
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

    if (step === totalSteps - 1) {
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
        <View style={styles.heroScrim}>
          <TopRow onSkip={onSkip} />
          <View style={styles.heroContent}>
            <Image
              source={require("../../assets/brand/palleto-logo-transparent.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.kicker}>Palleto</Text>
            <Text style={styles.heroTitle}>Turn references from the wild into usable creative direction.</Text>
            <Text style={styles.heroBody}>
              Capture something real, get an immediate read, and refine it later when you have time.
            </Text>
          </View>
          <FooterButton label="Begin" onPress={continueFlow} />
        </View>
      </ImageBackground>
    );
  }

  if (currentQuestion) {
    return (
      <View style={styles.questionScreen}>
        <TopRow onSkip={onSkip} />
        <View style={styles.questionHeader}>
          <Progress current={step + 1} total={totalSteps} />
          <Text style={styles.kicker}>{currentQuestion.kicker}</Text>
          <Text style={styles.questionTitle}>{currentQuestion.prompt}</Text>
          <Text style={styles.questionHint}>Choose what fits. This becomes the brief behind your scans.</Text>
        </View>

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

        <View style={styles.summaryPanel}>
          <Text style={styles.summaryEyebrow}>So far</Text>
          <Text style={styles.summaryText}>{summaryLine}</Text>
        </View>

        <FooterButton disabled={!canContinue} label="Continue" onPress={continueFlow} />
      </View>
    );
  }

  if (step === questions.length + 1) {
    return (
      <View style={styles.processingContainer}>
        <TopRow onSkip={onSkip} />
        <Progress current={questions.length + 2} total={totalSteps} />
        <Image source={{ uri: demoImageUrl }} style={styles.processingImage} resizeMode="cover" />
        <Text style={styles.kicker}>Building your first scan</Text>
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
    );
  }

  return (
    <ScrollView style={styles.previewContainer} contentContainerStyle={styles.previewContent}>
      <TopRow onSkip={onSkip} />
      <Progress current={totalSteps} total={totalSteps} />
      <View style={styles.previewHeader}>
        <Text style={styles.kicker}>Your first scan</Text>
        <Text style={styles.previewTitle}>This is the kind of card Palleto will generate from a real capture.</Text>
        <Text style={styles.previewBody}>
          Same palette treatment, same links, same creative translation, same share-ready artifact.
        </Text>
      </View>

      <CardDetail card={demoCard} />

      <View style={styles.summaryPanel}>
        <Text style={styles.summaryEyebrow}>What this is tuned for</Text>
        <Text style={styles.summaryText}>{summaryLine}</Text>
      </View>

      <FooterButton label="Create my first scan" onPress={continueFlow} />
    </ScrollView>
  );
}

function TopRow({ onSkip }: { onSkip?: () => void }) {
  return (
    <View style={styles.topRow}>
      <View />
      {onSkip ? (
        <Pressable onPress={onSkip} style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
      ) : (
        <View />
      )}
    </View>
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

function buildSummaryLine(answers: OnboardingSurveyAnswers) {
  const work = answers.work_for[0] || "creative work";
  const extract = answers.extract_from_reference.slice(0, 3).join(", ") || "clear design signal";
  const useful = answers.useful_scan.slice(0, 2).join(" + ") || "a usable next move";
  const avoid = answers.avoid.slice(0, 2).join(" + ") || "generic output";

  return `Built for ${work}. Prioritizing ${extract}. Useful means ${useful}. Avoiding ${avoid}.`;
}

function buildDemoCard(answers: OnboardingSurveyAnswers): InspirationCard {
  const projectType = mapProjectType(answers.work_for[0] || "Brand identity");
  const bigIdea = answers.useful_scan[0] || "A clear big idea I can steal";
  const leanToward = answers.lean_toward[0] || "Editorial and cultured";
  const avoid = answers.avoid[0] || "Corporate and sterile";
  const typeDirections = buildTypeDirections(answers.lean_toward);

  return {
    id: "demo-onboarding-card",
    image_url: demoImageUrl,
    source_type: "camera",
    title: "Found Ornament System",
    one_line_read:
      "A faded street-side surface becomes a repeatable language of framed color, worn texture, and ornamental rhythm.",
    creative_direction: `This kind of reference becomes powerful when it stops being just a photo and starts acting like a system. Pull the framed edges, the weathered surface, and the restrained warm-cool palette into something that feels ${leanToward.toLowerCase()} without slipping into ${avoid.toLowerCase()}.`,
    palette: [
      { hex: "#1C1B1A", label: "Ink black", role: "anchor" },
      { hex: "#F4EFE6", label: "Stone white", role: "relief" },
      { hex: "#D97A3C", label: "Burnt apricot", role: "warm accent" },
      { hex: "#6FA7CF", label: "Icy cyan", role: "cool accent" },
      { hex: "#8A5771", label: "Dusty plum", role: "depth" }
    ],
    visual_dna: {
      composition: "A framed field holds the eye inside a bordered surface instead of letting the image drift outward.",
      contrast: "Pale negative space, dusty color, and a few darker anchors create a restrained but tactile hierarchy.",
      shape_language: "Rounded border intervals, soft rectangles, hand-shaped interruptions, and repeatable edge logic.",
      texture: "Weathered pigment, chalky wear, paper-like abrasion, and visible hand-touched surface irregularity."
    },
    design_moves: [
      "Use a contained border system instead of a floating composition.",
      "Keep one warm accent and one cool accent doing most of the work.",
      "Let age and abrasion stay visible rather than cleaning every edge."
    ],
    project_lens: {
      applications: buildApplications(projectType),
      project_type: projectType,
      summary: `${bigIdea.replace(/^A /, "").replace(/^a /, "")}. Treat this reference like a portable visual system, not a one-off mood image.`
    },
    type_direction: typeDirections,
    search_language: [
      "ornamental textile collage",
      "scalloped border design",
      "worn painted surface",
      "editorial material palette",
      "framed decorative composition"
    ],
    related_links: [
      {
        provider: "Are.na",
        reason: "A board lane for framed ornament, layered surface, and decorative composition.",
        thumbnail_url: relatedPreviewImages[0],
        title: "Ornament and framed surface references",
        url: "https://www.are.na/search?q=ornament%20framed%20surface"
      },
      {
        provider: "Pinterest",
        reason: "Useful for pulling textile borders, decorative framing, and repeatable edge language.",
        thumbnail_url: relatedPreviewImages[1],
        title: "Scalloped border textile references",
        url: "https://www.pinterest.com/search/pins/?q=scalloped%20border%20textile%20design"
      },
      {
        provider: "Google Images",
        reason: "A broader lane for layered painted surfaces and collage-like material texture.",
        thumbnail_url: relatedPreviewImages[2],
        title: "Layered abstract framed painting textile",
        url: "https://www.google.com/search?tbm=isch&q=layered%20abstract%20framed%20painting%20textile"
      }
    ],
    created_at: "2026-04-22T00:00:00.000Z",
    updated_at: "2026-04-22T00:00:00.000Z"
  };
}

function buildApplications(projectType: string) {
  if (projectType === "Clothing brand") {
    return [
      "Seasonal graphic language for tees, labels, and woven trims.",
      "Border treatment for hangtags, lookbook covers, and campaign frames.",
      "A color and texture lane for washed garments, posters, and packaging."
    ];
  }

  if (projectType === "Campaign") {
    return [
      "Poster framing system for hero stills and launch assets.",
      "A repeatable visual lane for campaign copy, credits, and title cards.",
      "A surface and color approach for set details, invites, and promo stills."
    ];
  }

  if (projectType === "Interior concept") {
    return [
      "Material palette for wall finishes, printed matter, and soft furnishings.",
      "Decorative border logic for signage, menus, and room collateral.",
      "A warm-cool accent system that keeps the space layered instead of flat."
    ];
  }

  return [
    "A compact identity system built from one border logic, one surface attitude, and a few controlled colors.",
    "A direction for packaging, graphics, or editorial assets that needs more soul than polish.",
    "A useful reference when a project needs a strong big idea, not just another moodboard image."
  ];
}

function buildTypeDirections(leanToward: string[]) {
  const joined = leanToward.join(" ").toLowerCase();

  if (joined.includes("organic") || joined.includes("editorial") || joined.includes("luxury")) {
    return [
      {
        style: "Soft editorial serif",
        use: "For hero headlines, brand marks, and cultured framing language."
      },
      {
        style: "Humanist sans",
        use: "For supporting hierarchy that still feels shaped by the hand."
      },
      {
        style: "Refined italic accent",
        use: "For notes, seasonal cues, or story text with a little movement."
      }
    ];
  }

  if (joined.includes("technical") || joined.includes("minimal")) {
    return [
      {
        style: "Structured neo-grotesk",
        use: "For headlines and hierarchy that need precision without deadness."
      },
      {
        style: "Utility mono",
        use: "For specs, captions, and archival details."
      },
      {
        style: "Narrow grotesk",
        use: "For secondary structure and compressed layouts."
      }
    ];
  }

  return [
    {
      style: "Compressed grotesk",
      use: "For strong headlines and compact identity language."
    },
    {
      style: "Humanist sans",
      use: "For supporting hierarchy and product-facing text."
    },
    {
      style: "Soft italic accent",
      use: "For notes, story text, and a more expressive secondary voice."
    }
  ];
}

function mapProjectType(value: string) {
  if (value === "Campaign and art direction") {
    return "Campaign";
  }

  if (value === "Product or object design") {
    return "Product design";
  }

  if (value === "Interior or spatial direction") {
    return "Interior concept";
  }

  return value || "Brand identity";
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1
  },
  heroScrim: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: 34,
    backgroundColor: "rgba(0,0,0,0.46)"
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  skipButton: {
    paddingVertical: theme.spacing.xs
  },
  skipButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800"
  },
  heroContent: {
    gap: theme.spacing.md
  },
  logo: {
    width: 64,
    height: 64
  },
  kicker: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  heroTitle: {
    color: theme.colors.textPrimary,
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 44
  },
  heroBody: {
    maxWidth: 360,
    color: theme.colors.textSecondary,
    fontSize: 17,
    lineHeight: 25
  },
  questionScreen: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: 34,
    backgroundColor: theme.colors.background
  },
  questionHeader: {
    gap: theme.spacing.md
  },
  progressTrack: {
    flexDirection: "row",
    gap: theme.spacing.xs
  },
  progressDot: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.16)"
  },
  progressDotActive: {
    backgroundColor: theme.colors.textPrimary
  },
  questionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34
  },
  questionHint: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22
  },
  optionGrid: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl
  },
  option: {
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.surface
  },
  optionSelected: {
    backgroundColor: theme.colors.textPrimary,
    borderColor: theme.colors.textPrimary
  },
  optionText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22
  },
  optionTextSelected: {
    color: theme.colors.background
  },
  summaryPanel: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.surface
  },
  summaryEyebrow: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  summaryText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    lineHeight: 22
  },
  footerButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    marginTop: "auto",
    backgroundColor: theme.colors.textPrimary,
    borderRadius: theme.radius.small
  },
  footerButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: "800"
  },
  processingContainer: {
    flex: 1,
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: 34,
    backgroundColor: theme.colors.background
  },
  processingImage: {
    width: "100%",
    aspectRatio: 0.84,
    borderRadius: theme.radius.small
  },
  processingTitle: {
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
  previewContainer: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  previewContent: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: 34
  },
  previewHeader: {
    gap: theme.spacing.sm
  },
  previewTitle: {
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34
  },
  previewBody: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22
  },
  pressed: {
    opacity: 0.72
  },
  disabled: {
    opacity: 0.35
  }
});
