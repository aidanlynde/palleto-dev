/**
 * RefineCardScreen — chat interface for refining an inspiration card.
 *
 * Every message the user sends triggers a card refinement (the existing
 * createCardRefinement API). The refinement history is rendered as a
 * chat thread: user instruction on the right, AI response + mini card
 * preview on the left. Feels like ChatGPT but every AI turn produces a
 * tangible card output.
 *
 * Key behaviours:
 *  - History loads on mount; existing refinements populate the thread
 *  - Quick-action chips (prompt library) appear above the composer
 *  - "Branching from" indicator shows which version the next prompt builds on
 *  - Tap any AI card bubble to set it as the active preview
 *  - Processing overlay appears during AI generation (Bone-styled)
 */
import * as Haptics from "expo-haptics";
import { User } from "firebase/auth";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
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
import { trackEvent } from "../services/analytics";
import { theme } from "../theme";
import { Body, Display, DisplayItalic, Meta, Pill, Text } from "../ui";

/* ──────────────────────────────────────────────────────────────
   Prompt suggestions shown as chips above the composer
   ────────────────────────────────────────────────────────────── */
const QUICK_PROMPTS = [
  "Make this feel more organic and less corporate",
  "Find a sharper, more premium angle",
  "Make the applications more specific to my project",
  "Push this toward a luxury fashion direction",
  "Give me softer type and a more editorial read",
  "Make the type direction more collectible and less generic",
];

const PROCESSING_STAGES = [
  "Re-reading the scan",
  "Shifting the creative angle",
  "Updating the card",
  "Saving this version",
];

/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */
type Props = {
  card: InspirationCard;
  firebaseUser: User;
  onBack?: () => void;
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

type ChatMsg =
  | { kind: "greeting" }
  | { kind: "user"; text: string; key: string }
  | { kind: "refinement"; version: VersionItem; key: string };

/* ──────────────────────────────────────────────────────────────
   Main component
   ────────────────────────────────────────────────────────────── */
export function RefineCardScreen({ card, firebaseUser, onBack, onRefined }: Props) {
  const [baseCard] = useState(card);
  const [history, setHistory] = useState<CardRefinement[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [composer, setComposer] = useState("");
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [processingStageIndex, setProcessingStageIndex] = useState(0);
  const [pendingInstruction, setPendingInstruction] = useState<string | null>(null);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const canSend = !isSubmitting && composer.trim().length > 0;

  /* ── Load history ── */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await firebaseUser.getIdToken();
        const items = await listCardRefinements(token, baseCard.id);
        if (mounted) {
          setHistory(items);
          if (items.length) setActiveVersionId(items[items.length - 1].id);
        }
      } catch {
        if (mounted) Alert.alert("Could not load history", "Try again in a moment.");
      } finally {
        if (mounted) setIsLoadingHistory(false);
      }
    })();
    return () => { mounted = false; };
  }, [baseCard.id, firebaseUser]);

  /* ── Processing stage ticker ── */
  useEffect(() => {
    if (!isSubmitting) { setProcessingStageIndex(0); return; }
    const id = setInterval(
      () => setProcessingStageIndex(i => Math.min(i + 1, PROCESSING_STAGES.length - 1)),
      720
    );
    return () => clearInterval(id);
  }, [isSubmitting]);

  /* ── Auto-scroll when thread grows ── */
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [history, isSubmitting]);


  /* ── Versions derived from history ── */
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
      summary: "The first card generated from this scan.",
    };
    return [
      original,
      ...history.map(r => ({
        basedOnLabel: r.based_on_refinement_id
          ? history.find(h => h.id === r.based_on_refinement_id)?.label ?? "Original"
          : "Original",
        changedSections: r.changed_sections,
        createdAt: r.created_at,
        id: r.id,
        instruction: r.instruction,
        isOriginal: false,
        label: r.label,
        refinedCard: r.refined_card,
        summary: r.summary,
      })),
    ];
  }, [baseCard, history]);

  const activeVersion = versions.find(v => v.id === activeVersionId) ?? versions[0];
  const previewVersion = versions.find(v => v.id === previewVersionId) ?? activeVersion;
  const latestVersion = versions[versions.length - 1];

  /* ── Chat thread derived from history ── */
  const messages = useMemo<ChatMsg[]>(() => {
    const msgs: ChatMsg[] = [{ kind: "greeting" }];
    for (const r of history) {
      if (r.instruction) {
        msgs.push({ kind: "user", text: r.instruction, key: `u-${r.id}` });
      }
      const v = versions.find(v => v.id === r.id);
      if (v) {
        msgs.push({ kind: "refinement", version: v, key: `r-${r.id}` });
      }
    }
    return msgs;
  }, [history, versions]);

  /* ── Submit refinement ── */
  async function submit(instruction: string, presetLabel?: string) {
    const trimmed = instruction.trim();
    if (!trimmed || isSubmitting) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setComposer("");
    setIsSubmitting(true);
    setPendingInstruction(trimmed);
    trackEvent("refinement_started", {
      base: activeVersionId ? "version" : "original",
      card_id: baseCard.id,
      preset: presetLabel ?? "custom",
    });

    try {
      const token = await firebaseUser.getIdToken();
      const refinement = await createCardRefinement(token, baseCard.id, {
        instruction: trimmed,
        presetLabel: presetLabel ?? null,
        baseRefinementId: activeVersionId,
      });
      const next = [...history, refinement];
      setHistory(next);
      setActiveVersionId(refinement.id);
      onRefined(refinement.refined_card);
      trackEvent("refinement_completed", {
        card_id: baseCard.id,
        changed_section_count: refinement.changed_sections.length,
        preset: presetLabel ?? "custom",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      trackEvent("refinement_failed", { card_id: baseCard.id });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Refinement failed", "Try again in a moment.");
    } finally {
      setPendingInstruction(null);
      setIsSubmitting(false);
    }
  }

  /* ── UI ── */
  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* ── Header ── */}
      <View style={s.header}>
        {onBack ? <Pill icon="back" onPress={onBack} /> : <View style={{ width: 38 }} />}
        <Text style={s.headerTitle} numberOfLines={1}>
          {baseCard.title}
        </Text>
        <Pill tight onPress={() => { if (!showPreview) setPreviewVersionId(activeVersion.id); setShowPreview(v => !v); }}>
          <Text style={s.versionPillText}>
            {showPreview ? "Hide card" : activeVersion.isOriginal ? "Original" : activeVersion.label}
          </Text>
        </Pill>
      </View>

      {/* ── Card context pill ── */}
      <Pressable
        style={({ pressed }) => [s.contextCard, pressed && { opacity: 0.85 }]}
        onPress={() => setCardExpanded(e => !e)}
      >
        <View style={s.contextCardInner}>
          <View style={s.contextThumb}>
            <Image source={{ uri: baseCard.image_url }} style={s.contextThumbImg} resizeMode="cover" />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Meta>CARD CONTEXT</Meta>
            <Text style={s.contextTitle} numberOfLines={1}>{baseCard.title}</Text>
            <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
              {baseCard.palette.slice(0, 5).map(p => (
                <View key={p.hex} style={[s.contextSwatch, { backgroundColor: p.hex }]} />
              ))}
            </View>
          </View>
          <View style={{ transform: [{ rotate: cardExpanded ? "270deg" : "90deg" }] }}>
            <Text style={{ fontSize: 14, color: theme.ink[3] }}>›</Text>
          </View>
        </View>
        {cardExpanded ? (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.palette.line }}>
            <Meta style={{ marginBottom: 8 }}>BRANCHING FROM: {activeVersion.label.toUpperCase()}</Meta>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {versions.map(v => (
                <Pressable
                  key={v.id ?? "orig"}
                  onPress={() => { setActiveVersionId(v.id); setCardExpanded(false); }}
                  style={({ pressed }) => [
                    s.branchPill,
                    v.id === activeVersionId && s.branchPillActive,
                    pressed && { opacity: 0.75 }
                  ]}
                >
                  <Text style={[s.branchPillText, v.id === activeVersionId && s.branchPillTextActive]}>
                    {v.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </Pressable>

      {/* ── Inline card preview ── */}
      {showPreview ? (
        <ScrollView style={s.previewScroll} contentContainerStyle={s.previewContent} showsVerticalScrollIndicator={false}>
          <CardDetail card={previewVersion.refinedCard} />
        </ScrollView>
      ) : (
        <>
          {/* ── Chat thread ── */}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={s.thread}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {isLoadingHistory ? (
              <View style={s.loadingRow}>
                <ActivityIndicator color={theme.ink[3]} size="small" />
                <Meta>Loading history…</Meta>
              </View>
            ) : (
              messages.map((msg, i) => {
                if (msg.kind === "greeting") {
                  return (
                    <AssistantBubble key="greeting">
                      Here's your card. Tell me what direction you want to push it — tone,
                      type, applications, palette — or describe a whole new angle.
                    </AssistantBubble>
                  );
                }
                if (msg.kind === "user") {
                  return <UserBubble key={msg.key} content={msg.text} />;
                }
                return (
                  <RefinementBubble
                    key={msg.key}
                    version={msg.version}
                    isActive={msg.version.id === activeVersionId}
                    onSetActive={() => {
                      setActiveVersionId(msg.version.id);
                      setPreviewVersionId(msg.version.id);
                      setShowPreview(true);
                    }}
                  />
                );
              })
            )}

            {isSubmitting ? <TypingIndicator /> : null}
          </ScrollView>

          {/* ── Chips — outside thread, pinned above composer, rises with keyboard ── */}
          {!isSubmitting ? (
            <View style={s.chipBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.chips}
                keyboardShouldPersistTaps="handled"
              >
                {QUICK_PROMPTS.map(p => (
                  <Pressable
                    key={p}
                    onPress={() => void submit(p, p)}
                    style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]}
                  >
                    <RNText style={s.chipText} numberOfLines={1}>{p}</RNText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* ── Composer ── */}
          <View style={s.composerBar}>
            <Pressable style={s.branchLine} onPress={() => setCardExpanded(e => !e)}>
              <Meta>Branching from: </Meta>
              <Meta style={{ color: "#C5683E" }}>{activeVersion.label} ›</Meta>
            </Pressable>
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={composer}
                onChangeText={setComposer}
                placeholder="Push it somewhere specific…"
                placeholderTextColor={theme.ink[4]}
                multiline
                returnKeyType="default"
                blurOnSubmit={false}
              />
              <Pressable
                onPress={() => void submit(composer)}
                disabled={!canSend}
                style={({ pressed }) => [
                  s.sendBtn,
                  canSend && s.sendBtnActive,
                  pressed && canSend && { opacity: 0.8 }
                ]}
              >
                <Text style={[s.sendArrow, canSend && s.sendArrowActive]}>↑</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {/* ── Processing overlay ── */}
      {isSubmitting ? (
        <View style={s.overlay}>
          <View style={s.overlayCard}>
            <View style={s.overlayImageFrame}>
              <Image
                source={{ uri: activeVersion.refinedCard.image_url }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>
            <Meta style={{ marginTop: 4 }}>REFINING WITH AI</Meta>
            <Display size={26} style={{ lineHeight: 30, marginTop: 4 }}>
              {PROCESSING_STAGES[processingStageIndex]}
              <DisplayItalic size={26} color={theme.ink[3]} style={{ lineHeight: 30 }}>…</DisplayItalic>
            </Display>
            {pendingInstruction ? (
              <Body style={{ color: theme.ink[3], fontSize: 13 }} numberOfLines={3}>
                {pendingInstruction}
              </Body>
            ) : null}
            <View style={{ gap: 8, marginTop: 4 }}>
              {PROCESSING_STAGES.map((stage, i) => (
                <Text
                  key={stage}
                  style={[s.stageText, i <= processingStageIndex && s.stageTextActive]}
                >
                  {i < processingStageIndex ? "✓  " : i === processingStageIndex ? "•  " : "·  "}
                  {stage}
                </Text>
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

/* ──────────────────────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────────────────────── */

function AssistantBubble({ children }: { children: ReactNode }) {
  return (
    <View style={s.assistantRow}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>P</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Meta style={{ marginBottom: 5 }}>Palleto</Meta>
        <Body style={s.assistantText}>{children}</Body>
      </View>
    </View>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <View style={s.userRow}>
      <View style={s.userBubble}>
        <Text style={s.userText}>{content}</Text>
      </View>
    </View>
  );
}

function RefinementBubble({
  version,
  isActive,
  onSetActive,
}: {
  version: VersionItem;
  isActive: boolean;
  onSetActive: () => void;
}) {
  return (
    <View style={s.assistantRow}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>P</Text>
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        <Meta style={{ marginBottom: 2 }}>Palleto</Meta>
        {version.summary ? (
          <Body style={s.assistantText}>
            {version.summary}
          </Body>
        ) : null}

        {/* Mini card result */}
        <Pressable
          onPress={onSetActive}
          style={({ pressed }) => [s.miniCard, isActive && s.miniCardActive, pressed && { opacity: 0.85 }]}
        >
          <View style={s.miniCardRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Meta style={{ color: isActive ? "#C5683E" : theme.ink[3] }}>
                {isActive ? "ACTIVE VERSION" : "NEW VERSION"}
              </Meta>
              <Text style={s.miniCardLabel}>{version.label}</Text>
              <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
                {version.refinedCard.palette.slice(0, 5).map(p => (
                  <View key={p.hex} style={[s.miniSwatch, { backgroundColor: p.hex }]} />
                ))}
              </View>
            </View>
            {version.changedSections.length ? (
              <View style={{ gap: 4, alignItems: "flex-end" }}>
                {version.changedSections.slice(0, 3).map(sec => (
                  <View key={sec} style={s.changedChip}>
                    <Text style={s.changedChipText}>{labelForSection(sec)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <Text style={s.miniCardCta}>{isActive ? "Viewing ›" : "View card ›"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={s.assistantRow}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>P</Text>
      </View>
      <View>
        <Meta style={{ marginBottom: 8 }}>Palleto</Meta>
        <TypingDots />
      </View>
    </View>
  );
}

function TypingDots() {
  const refs = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    const anims = refs.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: 1, duration: 280, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 280, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.delay((3 - i) * 160),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={{ flexDirection: "row", gap: 5, paddingVertical: 4 }}>
      {refs.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7, height: 7, borderRadius: 3.5,
            backgroundColor: theme.ink[3],
            opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
            transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
          }}
        />
      ))}
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
function labelForSection(section: string) {
  const map: Record<string, string> = {
    creative_direction: "Direction",
    design_moves: "Moves",
    one_line_read: "Read",
    palette: "Palette",
    project_lens: "Applications",
    related_links: "References",
    search_language: "Search",
    type_direction: "Type",
    visual_dna: "Visual DNA",
  };
  return map[section] ?? section;
}

/* ──────────────────────────────────────────────────────────────
   Styles
   ────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.palette.bone,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    gap: 10,
  },
  headerTitle: {
    flex: 1,
    fontFamily: theme.font.sansMedium,
    fontSize: 15,
    color: theme.ink[1],
    textAlign: "center",
  },
  versionPillText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 12,
    color: theme.ink[1],
  },

  /* Context card */
  contextCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    backgroundColor: theme.palette.paper,
    borderRadius: theme.radius.lg,
    ...theme.shadow.quiet,
  },
  contextCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contextThumb: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
    backgroundColor: theme.palette.putty,
  },
  contextThumbImg: {
    width: "100%",
    height: "100%",
  },
  contextTitle: {
    fontFamily: theme.font.sansMedium,
    fontSize: 13,
    color: theme.ink[1],
  },
  contextSwatch: {
    flex: 1,
    height: 6,
    borderRadius: 2,
  },
  branchPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.palette.line,
    backgroundColor: theme.palette.putty,
  },
  branchPillActive: {
    backgroundColor: theme.ink[1],
    borderColor: theme.ink[1],
  },
  branchPillText: {
    fontFamily: theme.font.sans,
    fontSize: 12,
    color: theme.ink[2],
  },
  branchPillTextActive: {
    color: theme.palette.linen,
  },

  /* Preview */
  previewScroll: {
    flex: 1,
  },
  previewContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 48,
  },

  /* Thread */
  thread: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 20,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 20,
  },
  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    maxWidth: "92%",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.ink[1],
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  avatarText: {
    fontFamily: theme.font.display,
    fontSize: 13,
    color: theme.palette.linen,
  },
  assistantText: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.ink[1],
  },
  userRow: {
    alignItems: "flex-end",
  },
  userBubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.ink[1],
    borderRadius: 20,
    borderBottomRightRadius: 5,
  },
  userText: {
    fontFamily: theme.font.sans,
    fontSize: 15,
    lineHeight: 21,
    color: theme.palette.linen,
  },

  /* Mini refinement card */
  miniCard: {
    padding: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.palette.paper,
    borderWidth: 1,
    borderColor: theme.palette.line,
    gap: 8,
    ...theme.shadow.quiet,
  },
  miniCardActive: {
    borderColor: "#C5683E",
    backgroundColor: "#FFF9F5",
  },
  miniCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  miniCardLabel: {
    fontFamily: theme.font.sansMedium,
    fontSize: 13,
    color: theme.ink[1],
  },
  miniSwatch: {
    flex: 1,
    height: 6,
    borderRadius: 2,
  },
  miniCardCta: {
    fontFamily: theme.font.sansMedium,
    fontSize: 12,
    color: theme.ink[3],
    textAlign: "right",
  },
  changedChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: theme.palette.putty,
  },
  changedChipText: {
    fontFamily: theme.font.sans,
    fontSize: 10,
    color: theme.ink[3],
  },

  /* Chips — pinned above composer, View wrapper constrains height so no dead space */
  chipBar: {
    height: 46,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.palette.line,
    backgroundColor: theme.palette.bone,
    justifyContent: "center",
  },
  chips: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    maxWidth: 220,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: theme.palette.paper,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.palette.line,
    ...theme.shadow.quiet,
  },
  chipText: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    lineHeight: 17,
    color: theme.ink[1],
  },

  /* Branch line inside composer — no separate gap block */
  branchLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  /* Composer */
  composerBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 34,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.palette.line,
    backgroundColor: theme.palette.bone,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.palette.paper,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.palette.line,
    fontFamily: theme.font.sans,
    fontSize: 15,
    lineHeight: 21,
    color: theme.ink[1],
    textAlignVertical: "top",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(28,26,23,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  sendBtnActive: {
    backgroundColor: theme.ink[1],
  },
  sendArrow: {
    fontSize: 16,
    color: theme.ink[4],
    lineHeight: 18,
  },
  sendArrowActive: {
    color: theme.palette.linen,
  },

  /* Processing overlay */
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(242,238,228,0.94)",
    justifyContent: "center",
    padding: 24,
  },
  overlayCard: {
    gap: 12,
    padding: 20,
    backgroundColor: theme.palette.paper,
    borderRadius: theme.radius.xl,
    ...theme.shadow.floating,
  },
  overlayImageFrame: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: theme.radius.md,
    overflow: "hidden",
    backgroundColor: theme.palette.putty,
  },
  stageText: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    lineHeight: 17,
    color: theme.ink[4],
  },
  stageTextActive: {
    color: theme.ink[1],
    fontFamily: theme.font.sansMedium,
  },
});
