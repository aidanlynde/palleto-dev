import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { InspirationCard } from "../services/api";
import {
  createEmptyOnboardingSurveyAnswers,
  OnboardingSurveyAnswers
} from "../services/onboarding";
import { theme } from "../theme";

const koiImageSource = require("../../assets/demo/koi-street-reference.png");

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

const koiImageUrl = Image.resolveAssetSource(koiImageSource).uri;

export function OnboardingScreen({ onComplete, onSkip }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingSurveyAnswers>(
    createEmptyOnboardingSurveyAnswers()
  );
  const [processingIndex, setProcessingIndex] = useState(0);

  const totalSteps = 9;
  const currentQuestion = step >= 1 && step <= questions.length ? questions[step - 1] : null;
  const selectedAnswers = currentQuestion ? answers[currentQuestion.id] : [];
  const canContinue = !currentQuestion || selectedAnswers.length > 0;
  const demoCard = useMemo(() => buildDemoCard(answers), [answers]);

  useEffect(() => {
    if (step !== questions.length + 2) {
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
          setStep(questions.length + 3);
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
      <ScrollView
        style={styles.questionScreen}
        contentContainerStyle={styles.questionScreenContent}
        keyboardShouldPersistTaps="handled"
      >
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

        <FooterButton disabled={!canContinue} label="Continue" onPress={continueFlow} />
      </ScrollView>
    );
  }

  if (step === questions.length + 1) {
    return (
      <ImageBackground source={koiImageSource} style={styles.fullscreen} resizeMode="cover">
        <View style={styles.scanScrim}>
          <Progress current={questions.length + 2} total={totalSteps} />
          <View style={styles.scanTopBlock}>
            <Text style={styles.kicker}>First scan</Text>
            <Text style={styles.scanTitle}>Imagine you caught this walking home.</Text>
            <Text style={styles.scanBody}>
              Snap the koi, keep moving, and let Palleto turn it into something you can actually use.
            </Text>
          </View>

          <View style={styles.scanSpacer} />

          <FooterButton label="Scan this reference" onPress={continueFlow} />
        </View>
      </ImageBackground>
    );
  }

  if (step === questions.length + 2) {
    return (
      <View style={styles.processingContainer}>
        <Progress current={questions.length + 3} total={totalSteps} />
        <View style={styles.processingImageFrame}>
          <Image source={koiImageSource} style={styles.processingImage} resizeMode="contain" />
        </View>
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
      <Progress current={totalSteps} total={totalSteps} />
      <View style={styles.previewHeader}>
        <Text style={styles.kicker}>Your first scan</Text>
        <Text style={styles.previewTitle}>This is the kind of card Palleto will generate from a real capture.</Text>
        <Text style={styles.previewBody}>
          Same palette treatment, same links, same creative translation, same share-ready artifact.
        </Text>
      </View>

      <PreviewScanCard card={demoCard} />

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

function PreviewScanCard({ card }: { card: InspirationCard }) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  function toggleSection(section: string) {
    setExpandedSection((current) => (current === section ? null : section));
  }

  async function copyHex(hex: string) {
    const normalizedHex = `#${hex.replace(/[^0-9a-f]/gi, "").slice(0, 6).toUpperCase()}`;
    await Clipboard.setStringAsync(normalizedHex);
    setCopiedHex(normalizedHex);
    Haptics.selectionAsync();
    setTimeout(() => {
      setCopiedHex((current) => (current === normalizedHex ? null : current));
    }, 1400);
  }

  return (
    <View style={styles.previewCard}>
      <Image source={koiImageSource} style={styles.previewCardImage} resizeMode="cover" />
      <View style={styles.previewCardBody}>
        <Text style={styles.previewCardTitle}>{card.title}</Text>
        <Text style={styles.previewCardRead}>{card.one_line_read}</Text>
        <Text numberOfLines={4} style={styles.previewCardDirection}>
          {card.creative_direction}
        </Text>

        <CollapsibleSection
          expanded={expandedSection === "palette"}
          onPress={() => toggleSection("palette")}
          subtitle={`${card.palette.length} colors with copyable hex`}
          title="Palette"
        >
          <View style={styles.previewPaletteGrid}>
            {card.palette.map((color) => (
              <Pressable
                key={color.hex}
                onPress={() => copyHex(color.hex)}
                style={({ pressed }) => [
                  styles.previewPaletteCard,
                  pressed && styles.pressed
                ]}
              >
                <View style={[styles.previewPaletteBlock, { backgroundColor: color.hex }]}>
                  <Text style={styles.previewPaletteBlockHex}>{color.hex.toUpperCase()}</Text>
                </View>
                <View style={styles.previewPaletteMeta}>
                  <Text style={styles.previewPaletteLabel}>{color.label}</Text>
                  <Text style={styles.previewPaletteRole}>{color.role}</Text>
                  <Text style={styles.previewPaletteHint}>
                    {copiedHex === color.hex.toUpperCase() ? "Copied" : "Tap to copy"}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.previewPaletteStatus, copiedHex && styles.previewPaletteStatusActive]}>
            {copiedHex ? `Copied ${copiedHex}` : "Tap any color to copy the hex"}
          </Text>
        </CollapsibleSection>

        <CollapsibleSection
          expanded={expandedSection === "links"}
          onPress={() => toggleSection("links")}
          subtitle="Real references with previews"
          title="Related inspiration"
        >
          <View style={styles.previewLinksList}>
            {card.related_links.map((link, index) => (
              <Pressable
                key={link.url}
                onPress={() => Linking.openURL(link.url)}
                style={({ pressed }) => [styles.previewLinkItem, pressed && styles.pressed]}
              >
                {link.thumbnail_url ? (
                  <Image
                    source={{ uri: link.thumbnail_url }}
                    style={styles.previewLinkImage}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={styles.previewLinkCopy}>
                  <Text style={styles.previewLinkTitle}>{link.title}</Text>
                  {link.reason ? <Text style={styles.previewLinkReason}>{link.reason}</Text> : null}
                  <Text style={styles.previewLinkProvider}>{link.provider}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </CollapsibleSection>

        <CollapsibleSection
          expanded={expandedSection === "translation"}
          onPress={() => toggleSection("translation")}
          subtitle="What to steal and how to use it"
          title="Creative translation"
        >
          <View style={styles.previewTranslationPanel}>
            <View style={styles.previewTranslationHero}>
              <Image source={koiImageSource} style={styles.previewTranslationHeroImage} resizeMode="cover" />
              <View style={styles.previewTranslationHeroShade} />
              <View style={styles.previewTranslationHeroCopy}>
                <Text style={styles.previewTranslationEyebrow}>What to steal</Text>
                <Text style={styles.previewTranslationTitle}>{card.project_lens.summary}</Text>
              </View>
            </View>

            <View style={styles.previewTranslationBody}>
              <View style={styles.previewProjectUseHeader}>
                <Text style={styles.previewTranslationEyebrow}>Use it for</Text>
                <Text style={styles.previewProjectUseTitle}>{card.project_lens.project_type}</Text>
              </View>

              <View style={styles.previewApplicationList}>
                {card.project_lens.applications.map((application, index) => (
                  <View key={application} style={styles.previewApplicationRow}>
                    <Text style={styles.previewApplicationIndex}>
                      {String(index + 1).padStart(2, "0")}
                    </Text>
                    <Text style={styles.previewApplicationText}>{application}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </CollapsibleSection>

        <CollapsibleSection
          expanded={expandedSection === "type"}
          onPress={() => toggleSection("type")}
          subtitle="Typography direction from the same scan"
          title="Type direction"
        >
          <View style={styles.previewTypeList}>
            {card.type_direction.map((direction) => (
              <View key={direction.style} style={styles.previewTypeItem}>
                <Text style={[styles.previewTypePreview, previewTypeStyle(direction.style)]}>
                  {direction.style}
                </Text>
                <Text style={styles.previewTypeStyle}>{direction.style}</Text>
                <Text style={styles.previewTypeUse}>{direction.use}</Text>
              </View>
            ))}
          </View>
        </CollapsibleSection>

        <CollapsibleSection
          expanded={expandedSection === "share"}
          onPress={() => toggleSection("share")}
          subtitle="A share card that turns into a public web link"
          title="Share preview"
        >
          <View style={styles.previewShareCard}>
            <Image source={koiImageSource} style={styles.previewShareImage} resizeMode="cover" />
            <View style={styles.previewShareBody}>
              <Text style={styles.previewShareBrand}>PALLETO</Text>
              <Text style={styles.previewShareTitle}>{card.title}</Text>
              <Text style={styles.previewShareRead} numberOfLines={3}>
                {card.one_line_read}
              </Text>
              <View style={styles.previewSharePalette}>
                {card.palette.map((color) => (
                  <View
                    key={`preview-share-${color.hex}`}
                    style={[styles.previewShareSwatch, { backgroundColor: color.hex }]}
                  />
                ))}
              </View>
              <Text style={styles.previewShareMeta}>www.palleto-labs.com/s/your-card</Text>
              <Text style={styles.previewShareCaption}>
                When you share, the card becomes the link preview and opens a clean web page for anyone without the app.
              </Text>
            </View>
          </View>
        </CollapsibleSection>

        <CollapsibleSection
          expanded={expandedSection === "refine"}
          onPress={() => toggleSection("refine")}
          subtitle="A paid layer for deeper creative work"
          title="Refine with AI"
        >
          <View style={styles.previewRefineCard}>
            <View style={styles.previewRefineBadge}>
              <Text style={styles.previewRefineBadgeText}>Paid feature</Text>
            </View>
            <Text style={styles.previewRefineHero}>Keep talking to the scan until the idea gets sharp.</Text>
            <Text style={styles.previewRefineLead}>
              Ask for alternate directions, stronger type, better applications, or a cleaner point of view without starting over.
            </Text>
            <View style={styles.previewRefinePromptList}>
              {[
                "Make this feel more organic and less corporate",
                "Push this toward a luxury fashion direction",
                "Give me stronger type options for this project"
              ].map((prompt) => (
                <View key={prompt} style={styles.previewRefinePrompt}>
                  <Text style={styles.previewRefinePromptText}>{prompt}</Text>
                </View>
              ))}
            </View>
            <View style={styles.previewRefineButton}>
              <Text style={styles.previewRefineButtonText}>Refine with AI</Text>
            </View>
          </View>
        </CollapsibleSection>
      </View>
    </View>
  );
}

function CollapsibleSection({
  children,
  expanded,
  onPress,
  subtitle,
  title
}: {
  children: ReactNode;
  expanded: boolean;
  onPress: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.previewSection}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.previewSectionHeader, pressed && styles.pressed]}>
        <View style={styles.previewSectionHeading}>
          <Text style={styles.previewSectionTitle}>{title}</Text>
          <Text style={styles.previewSectionSubtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.previewSectionToggle}>{expanded ? "Hide" : "Open"}</Text>
      </Pressable>
      {expanded ? <View style={styles.previewSectionContent}>{children}</View> : null}
    </View>
  );
}

function buildDemoCard(answers: OnboardingSurveyAnswers): InspirationCard {
  const projectType = mapProjectType(answers.work_for[0] || "Brand identity");
  const bigIdea = answers.useful_scan[0] || "A clear big idea I can steal";
  const leanToward = answers.lean_toward[0] || "Editorial and cultured";
  const avoid = answers.avoid[0] || "Corporate and sterile";
  const typeDirections = buildTypeDirections(answers.lean_toward);

  return {
    id: "demo-onboarding-card",
    image_url: koiImageUrl,
    source_type: "camera",
    title: "Street Koi Signal",
    one_line_read:
      "A street-found graphic system built from pavement grit, symbolic animal forms, and one sharp orange interruption.",
    creative_direction: `This reference works because it turns an ordinary sidewalk into a graphic mark with memory. The koi forms feel handmade and symbolic, while the black, white, and orange palette gives the image instant poster energy. Push it toward ${leanToward.toLowerCase()} without letting it drift into ${avoid.toLowerCase()}.`,
    palette: [
      { hex: "#F26A21", label: "Signal orange", role: "accent" },
      { hex: "#111111", label: "Tar black", role: "anchor" },
      { hex: "#F4F1EA", label: "Chalk white", role: "relief" },
      { hex: "#67675F", label: "Weathered concrete", role: "field" },
      { hex: "#2D2F2A", label: "Soft shadow", role: "depth" }
    ],
    visual_dna: {
      composition: "Two offset forms create diagonal movement and a quiet negative-space tension.",
      contrast: "Hard black and white separation with one saturated orange interruption.",
      shape_language: "Organic koi silhouettes, tapered motion, and stencil-like edge behavior.",
      texture: "Rough pavement grain, sprayed pigment, chalky wear, and soft outdoor shadow."
    },
    design_moves: [
      "Use one saturated accent as the emotional charge instead of overfilling the palette.",
      "Let rough surface texture stay visible instead of cleaning the mark up.",
      "Pair symbolic illustrated form with more disciplined typography."
    ],
    project_lens: {
      applications: buildApplications(projectType),
      project_type: projectType,
      summary: `${bigIdea.replace(/^A /, "").replace(/^a /, "")}. Treat the koi as a repeatable symbol system, not just an image motif.`
    },
    type_direction: typeDirections,
    search_language: [
      "koi symbolism graphic design",
      "urban stencil poster reference",
      "pavement texture identity",
      "signal orange visual system",
      "handmade street mark"
    ],
    related_links: [
      {
        provider: "Behance",
        reason: "A tight brand-identity lane for symbolic koi forms, controlled color, and disciplined framing.",
        thumbnail_url: "https://mir-s3-cdn-cf.behance.net/project_modules/1400/798b5e166466327.6418ee5226e7e.png",
        title: "Koi. Restaurant Brand Identity",
        url: "https://www.behance.net/gallery/166466327/Koi-Restaurant-Brand-Identity"
      },
      {
        provider: "Behance",
        reason: "A cleaner second lane for koi symbolism translated into more restrained identity and poster treatments.",
        thumbnail_url: "https://mir-s3-cdn-cf.behance.net/project_modules/source/028faa202074787.667fbb8bcc30e.gif",
        title: "KOI RESTAURANT Brand Identity",
        url: "https://www.behance.net/gallery/202074787/KOI-RESTAURANT-Brand-Identity"
      },
      {
        provider: "MaterialDriven",
        reason: "A strong reference for translating rough material cues and tactile surfaces into emotionally charged graphic systems.",
        thumbnail_url: "https://images.squarespace-cdn.com/content/v1/570a8015f699bb7295b31415/1512576487629-4R5I94QUH1B6VYV5VFSU/6.jpg",
        title: "Tactile and Emotive Graphic Design from Design&Practice",
        url: "https://www.materialdriven.com/blog/2017/12/6/tactile-and-emotive-graphic-design-from-designpractice"
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

function previewTypeStyle(style: string) {
  const lowered = style.toLowerCase();

  if (lowered.includes("serif")) {
    return styles.previewTypePreviewSerif;
  }

  if (lowered.includes("italic")) {
    return styles.previewTypePreviewItalic;
  }

  if (lowered.includes("grotesk")) {
    return styles.previewTypePreviewGrotesk;
  }

  if (lowered.includes("mono")) {
    return styles.previewTypePreviewMono;
  }

  return styles.previewTypePreviewSans;
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
    paddingVertical: theme.spacing.xs,
    opacity: 0.36
  },
  skipButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700"
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
    backgroundColor: theme.colors.background
  },
  questionScreenContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: 34,
    gap: theme.spacing.lg
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
  processingImageFrame: {
    width: "100%",
    aspectRatio: 0.75,
    overflow: "hidden",
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.surface
  },
  processingImage: {
    width: "100%",
    height: "100%"
  },
  processingTitle: {
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34
  },
  scanScrim: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: 34,
    backgroundColor: "rgba(0,0,0,0.18)"
  },
  scanTopBlock: {
    alignItems: "flex-start",
    gap: theme.spacing.xs,
    maxWidth: 290
  },
  scanTitle: {
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34
  },
  scanBody: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4
  },
  scanSpacer: {
    flex: 1,
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
  previewCard: {
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  previewCardImage: {
    width: "100%",
    height: 228
  },
  previewCardBody: {
    gap: theme.spacing.md,
    padding: theme.spacing.md
  },
  previewCardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32
  },
  previewCardRead: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22
  },
  previewCardDirection: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21
  },
  previewSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md
  },
  previewSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing.md
  },
  previewSectionHeading: {
    flex: 1,
    gap: 3
  },
  previewSectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  previewSectionSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  previewSectionToggle: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "800"
  },
  previewSectionContent: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md
  },
  previewPaletteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  previewPaletteCard: {
    width: "48.5%",
    gap: theme.spacing.sm,
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  previewPaletteBlock: {
    justifyContent: "flex-end",
    height: 72,
    padding: theme.spacing.xs,
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderRadius: 4
  },
  previewPaletteBlockHex: {
    alignSelf: "flex-start",
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 3,
    color: theme.colors.textPrimary,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: "900"
  },
  previewPaletteMeta: {
    gap: 2
  },
  previewPaletteLabel: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  previewPaletteRole: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  previewPaletteHint: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700"
  },
  previewPaletteStatus: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700"
  },
  previewPaletteStatusActive: {
    color: theme.colors.textPrimary
  },
  previewLinksList: {
    gap: theme.spacing.sm
  },
  previewLinkItem: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small
  },
  previewLinkImage: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.small
  },
  previewLinkCopy: {
    flex: 1,
    gap: 3
  },
  previewLinkTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18
  },
  previewLinkReason: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18
  },
  previewLinkProvider: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  previewTranslationPanel: {
    overflow: "hidden",
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  previewTranslationHero: {
    minHeight: 208,
    overflow: "hidden",
    backgroundColor: theme.colors.surface
  },
  previewTranslationHeroImage: {
    position: "absolute",
    width: "100%",
    minHeight: 208,
    transform: [{ scale: 1.06 }]
  },
  previewTranslationHeroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.44)"
  },
  previewTranslationHeroCopy: {
    justifyContent: "flex-end",
    minHeight: 208,
    gap: theme.spacing.xs,
    padding: theme.spacing.md
  },
  previewTranslationEyebrow: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  previewTranslationTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25
  },
  previewTranslationBody: {
    gap: theme.spacing.md,
    padding: theme.spacing.md
  },
  previewProjectUseHeader: {
    gap: 2
  },
  previewProjectUseTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23
  },
  previewApplicationList: {
    gap: theme.spacing.sm
  },
  previewApplicationRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  previewApplicationIndex: {
    width: 24,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800"
  },
  previewApplicationText: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  previewTypeList: {
    gap: theme.spacing.sm
  },
  previewTypeItem: {
    gap: 3,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.background
  },
  previewTypePreview: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    lineHeight: 28
  },
  previewTypeStyle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800"
  },
  previewTypeUse: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  previewShareCard: {
    overflow: "hidden",
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  previewShareImage: {
    width: "100%",
    height: 188
  },
  previewShareBody: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md
  },
  previewShareBrand: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  previewShareTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27
  },
  previewShareRead: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  previewSharePalette: {
    flexDirection: "row",
    height: 12
  },
  previewShareSwatch: {
    flex: 1
  },
  previewShareMeta: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "800"
  },
  previewShareCaption: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  previewRefineLead: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21
  },
  previewRefineCard: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.background
  },
  previewRefineBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.textPrimary
  },
  previewRefineBadgeText: {
    color: theme.colors.background,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  previewRefineHero: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24
  },
  previewRefinePromptList: {
    gap: theme.spacing.sm
  },
  previewRefinePrompt: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small
  },
  previewRefinePromptText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  previewRefineButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: theme.spacing.xs,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: theme.radius.small
  },
  previewRefineButtonText: {
    color: theme.colors.background,
    fontSize: 15,
    fontWeight: "800"
  },
  previewTypePreviewSerif: {
    fontFamily: "Georgia",
    fontStyle: "normal"
  },
  previewTypePreviewItalic: {
    fontFamily: "Georgia",
    fontStyle: "italic"
  },
  previewTypePreviewGrotesk: {
    letterSpacing: 0.3,
    fontWeight: "700"
  },
  previewTypePreviewMono: {
    fontFamily: "Courier",
    letterSpacing: 0.2
  },
  previewTypePreviewSans: {
    letterSpacing: 0,
    fontWeight: "600"
  },
  pressed: {
    opacity: 0.72
  },
  disabled: {
    opacity: 0.35
  }
});
