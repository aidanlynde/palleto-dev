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
  id: keyof OnboardingSurveyAnswers;
  kicker: string;
  options: string[];
  prompt: string;
};

const questions: Question[] = [
  {
    id: "looking_for",
    kicker: "Taste calibration",
    prompt: "What do you usually want to pull out of a reference first?",
    options: [
      "Color systems",
      "Materials and texture",
      "Typography direction",
      "Composition",
      "Mood and tone",
      "Graphic forms"
    ]
  },
  {
    id: "help_with",
    kicker: "Creative intent",
    prompt: "What kind of work are you usually shaping?",
    options: [
      "Clothing brand",
      "Brand identity",
      "Campaign world",
      "Interior concept",
      "Product design",
      "Personal archive"
    ]
  },
  {
    id: "must_feel_like",
    kicker: "Positive cues",
    prompt: "When Palleto translates inspiration for you, what should it feel like?",
    options: [
      "Organic and hand-touched",
      "Quiet luxury",
      "Editorial and cultured",
      "Raw and lived-in",
      "Technical and precise",
      "Playful and expressive"
    ]
  },
  {
    id: "must_not_feel_like",
    kicker: "Negative cues",
    prompt: "What should it stay away from?",
    options: [
      "Corporate and sterile",
      "Blocky and utilitarian",
      "Over-designed and noisy",
      "Too trend-driven",
      "Soft wellness minimalism",
      "Generic streetwear"
    ]
  }
];

const processingStages = [
  "Reading palette",
  "Studying contrast",
  "Finding texture",
  "Building direction"
];

const palette = [
  { hex: "#F26A21", label: "Signal orange", role: "accent" },
  { hex: "#111111", label: "Tar black", role: "anchor" },
  { hex: "#F4F1EA", label: "Chalk white", role: "relief" },
  { hex: "#67675F", label: "Weathered concrete", role: "field" },
  { hex: "#2D2F2A", label: "Soft shadow", role: "depth" }
];

const visualDna = [
  {
    label: "Contrast",
    value: "Hard black and white separation with one saturated orange interruption."
  },
  {
    label: "Shape",
    value: "Organic koi silhouettes, tapered motion, stencil-like edge behavior."
  },
  {
    label: "Texture",
    value: "Rough pavement grain, sprayed pigment, chalky wear, soft outdoor shadow."
  },
  {
    label: "Composition",
    value: "Two offset forms create diagonal movement and a quiet negative-space tension."
  }
];

const projectApplications: Record<string, string[]> = {
  "Brand identity": [
    "Mascot-adjacent mark system with one aggressive accent color.",
    "Hang tags, stickers, and launch graphics built from rough pavement crops.",
    "Symbolic identity world that avoids clean heritage nostalgia."
  ],
  Packaging: [
    "Stamped seals, box tape, and label closures with one orange hit.",
    "Matte concrete-gray substrates with black illustration and white utility type.",
    "Limited-run packaging that feels street-found and collectible."
  ],
  "Art direction": [
    "Campaign imagery with diagonal motion and high-contrast animal symbolism.",
    "Poster compositions that let one color carry the entire visual charge.",
    "A reference system for urban folklore, movement, and imperfect mark-making."
  ],
  "Campaign world": [
    "Campaign imagery with diagonal motion and high-contrast animal symbolism.",
    "Poster compositions that let one color carry the entire visual charge.",
    "A reference system for urban folklore, movement, and imperfect mark-making."
  ],
  Moodboard: [
    "A board direction around graphic street marks, pavement texture, and signal color.",
    "Pair with worn signage, stencil typography, asphalt, and cropped animal forms.",
    "Use as a counterweight to cleaner studio references."
  ],
  "Product idea": [
    "Surface graphics for bags, cases, decks, or small accessories.",
    "A product drop where the accent color becomes the recognition system.",
    "Embossed or printed texture that keeps the sidewalk energy intact."
  ],
  "Personal archive": [
    "A saved reference for high-contrast street graphics and found symbolism.",
    "Useful when a future project needs movement without polish.",
    "A reminder to preserve the environment around the mark, not just the motif."
  ]
};

const fallbackApplications = [
  "Identity marks, packaging stamps, editorial openers, or street-level campaign graphics.",
  "A reference for making rough surfaces feel intentional and designed.",
  "A compact visual system built from one motif, one accent, and one texture field."
];

const relatedInspiration = [
  {
    provider: "Are.na",
    title: "Street marks and found symbols",
    reason: "A board direction for rough public graphics, pavement texture, and symbolic marks."
  },
  {
    provider: "Pinterest",
    title: "Koi graphic identity references",
    reason: "Useful for translating animal symbolism into labels, posters, and surface graphics."
  },
  {
    provider: "Archive",
    title: "Pavement texture and stencil language",
    reason: "A material lane for keeping rough surfaces visible instead of over-polished."
  }
];

const typeDirections = [
  {
    style: "Compressed grotesk",
    use: "For street-poster urgency, product names, and campaign headlines."
  },
  {
    style: "Ink-trap sans",
    use: "For sharper cultural edge without losing legibility."
  },
  {
    style: "Utility mono",
    use: "For captions, archive labels, specs, and drop information."
  }
];

const searchLanguage = [
  "koi symbolism",
  "urban stencil",
  "signal orange identity",
  "pavement texture",
  "high contrast street mark",
  "Japanese fish motif"
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingSurveyAnswers>({
    help_with: [],
    looking_for: [],
    must_feel_like: [],
    must_not_feel_like: [],
  });
  const [processingIndex, setProcessingIndex] = useState(0);

  const totalSteps = 8;
  const currentQuestion = questions[step - 2];
  const isQuestionStep = Boolean(currentQuestion);
  const selectedAnswers = currentQuestion ? answers[currentQuestion.id] ?? [] : [];
  const canContinue = !isQuestionStep || selectedAnswers.length > 0;

  const summaryLine = useMemo(() => {
    const projectType = answers.help_with?.[0] || "Brand identity";
    const lookingFor = answers.looking_for?.slice(0, 3).join(", ") || "color, texture, and type";
    const feel = answers.must_feel_like?.slice(0, 2).join(" + ") || "editorial and specific";
    const avoid = answers.must_not_feel_like?.slice(0, 2).join(" + ") || "generic outputs";

    return `Tuned for ${projectType}. Prioritizing ${lookingFor}. Pushing toward ${feel} while avoiding ${avoid}.`;
  }, [answers]);
  const selectedProject = answers.help_with?.[0] || "Brand identity";
  const activeApplications = projectApplications[selectedProject] ?? fallbackApplications;

  useEffect(() => {
    if (step !== 6) {
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
          setStep(7);
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

    if (step === 7) {
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
        <Text style={styles.questionHint}>Choose what fits. This becomes the brief behind every scan.</Text>
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

  if (step === 6) {
    return (
      <View style={styles.processingContainer}>
        <Progress current={7} total={totalSteps} />
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
      <Progress current={8} total={totalSteps} />
      <View style={styles.demoHeader}>
        <Text style={styles.kicker}>Generated card</Text>
        <Text style={styles.cardIntro}>This is what every scan becomes.</Text>
        <Text style={styles.cardIntroBody}>
          Palleto turns a reference into a visual system, then adapts the read to what you are
          building.
        </Text>
      </View>

      <View style={styles.card}>
        <Image
          source={require("../../assets/demo/koi-street-reference.png")}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Street Koi Signal</Text>
          <Text style={styles.oneLineRead}>
            A street-found graphic system built from pavement grit, animal symbolism, and one
            sharp orange interruption.
          </Text>
          <Text style={styles.cardDirection}>
            This reference works because it turns an ordinary sidewalk into a graphic mark. The koi
            forms feel symbolic and handmade, while the black, white, and orange palette gives the
            image instant poster energy. Use this direction when you want something urban, tactile,
            and expressive without becoming messy.
          </Text>

          <SectionLabel label="Palette" />
          <View style={styles.paletteRow}>
            {palette.map((color) => (
              <View key={color.hex} style={styles.paletteCard}>
                <View style={[styles.swatch, { backgroundColor: color.hex }]} />
                <View style={styles.paletteCopy}>
                  <Text style={styles.swatchLabel}>{color.label}</Text>
                  <Text style={styles.swatchRole}>{color.role}</Text>
                </View>
              </View>
            ))}
          </View>

          <SectionLabel label="Related inspiration" />
          <View style={styles.relatedList}>
            {relatedInspiration.map((link) => (
              <View key={link.title} style={styles.relatedTile}>
                <View style={styles.relatedCopy}>
                  <Text style={styles.relatedTitle}>{link.title}</Text>
                  <Text style={styles.relatedReason}>{link.reason}</Text>
                  <Text style={styles.relatedProvider}>{link.provider} / open link</Text>
                </View>
              </View>
            ))}
          </View>

          <SectionLabel label="Creative translation" />
          <View style={styles.translationPanel}>
            <ImageBackground
              source={require("../../assets/demo/koi-street-reference.png")}
              style={styles.translationHero}
              imageStyle={styles.translationHeroImage}
              resizeMode="cover"
            >
              <View style={styles.translationHeroShade} />
              <View style={styles.translationHeroCopy}>
                <Text style={styles.translationEyebrow}>What to steal</Text>
                <Text style={styles.translationTitle}>
                  Street-found animal symbolism turned into a compact graphic system.
                </Text>
              </View>
            </ImageBackground>

            <View style={styles.translationBody}>
              <View style={styles.projectUseHeader}>
                <Text style={styles.translationEyebrow}>Use it for</Text>
                <Text style={styles.projectUseTitle}>{selectedProject}</Text>
              </View>

              <View style={styles.moveList}>
                {activeApplications.slice(0, 4).map((application, index) => (
                  <View key={application} style={styles.moveRow}>
                    <Text style={styles.moveNumber}>{String(index + 1).padStart(2, "0")}</Text>
                    <Text style={styles.moveText}>{application}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.systemNotes}>
                {visualDna.map((item) => (
                  <View key={item.label} style={styles.systemNote}>
                    <Text style={styles.systemNoteLabel}>
                      {item.label === "Shape" ? "Form" : item.label}
                    </Text>
                    <Text style={styles.systemNoteValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <SectionLabel label="Type direction" />
          <View style={styles.typeList}>
            {typeDirections.map((direction) => (
              <View key={direction.style} style={styles.typeItem}>
                <Text style={styles.typeStyle}>{direction.style}</Text>
                <Text style={styles.typeUse}>{direction.use}</Text>
              </View>
            ))}
          </View>

          <SectionLabel label="Search language" />
          <TagRow tags={searchLanguage} />
        </View>
      </View>

      <View style={styles.summaryPanel}>
        <Text style={styles.summaryTitle}>Your inspiration system is ready.</Text>
        <Text style={styles.summaryText}>{summaryLine}</Text>
      </View>

      <FooterButton label="Start my library" onPress={continueFlow} />
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
  cardIntroBody: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22
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
  oneLineRead: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24
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
  paletteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  swatch: {
    width: 48,
    height: 36,
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderRadius: 4
  },
  paletteCopy: {
    flex: 1,
    gap: 2
  },
  swatchLabel: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  swatchRole: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  relatedList: {
    gap: theme.spacing.sm
  },
  relatedTile: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  relatedCopy: {
    gap: theme.spacing.xs
  },
  relatedTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800"
  },
  relatedReason: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  relatedProvider: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  translationPanel: {
    overflow: "hidden",
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  translationHero: {
    minHeight: 260,
    justifyContent: "flex-end"
  },
  translationHeroImage: {
    transform: [{ scale: 1.08 }]
  },
  translationHeroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)"
  },
  translationHeroCopy: {
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    paddingTop: 72
  },
  translationEyebrow: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  translationTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28
  },
  translationBody: {
    gap: theme.spacing.md,
    padding: theme.spacing.md
  },
  projectUseHeader: {
    gap: 2
  },
  projectUseTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25
  },
  moveList: {
    gap: theme.spacing.sm
  },
  moveRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs
  },
  moveNumber: {
    width: 28,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 21
  },
  moveText: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21
  },
  systemNotes: {
    gap: theme.spacing.sm
  },
  systemNote: {
    gap: 2,
    paddingTop: theme.spacing.sm,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1
  },
  systemNoteLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  systemNoteValue: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  typeList: {
    gap: theme.spacing.sm
  },
  typeItem: {
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  typeStyle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800"
  },
  typeUse: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
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
