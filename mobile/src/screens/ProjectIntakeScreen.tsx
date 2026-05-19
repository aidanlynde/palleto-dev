/**
 * ProjectIntakeScreen — AI chat interface for building a project brief.
 *
 * Can operate in two modes:
 *   projectId  — loads an existing project from the backend and resumes the chat
 *   (none)     — creates a new project on mount then enters the chat
 *
 * Feels like a real AI chat (ChatGPT / Claude style):
 *   - Assistant messages: left-aligned plain text, small "Palleto" label
 *   - User messages: right-aligned dark pill bubbles
 *   - Typing indicator: three-dot pulse while AI responds
 *   - Suggested replies: horizontal chips above the composer
 *   - Composer: full-width input + send arrow + image-attach icon
 *   - Brief card: collapsible summary pinned above the thread
 */
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View
} from "react-native";

import {
  activateProject,
  createProject,
  deactivateProject,
  getProject,
  ProjectDetail,
  sendProjectChat,
  uploadProjectReferenceImage
} from "../services/api";
import { firebaseAuth } from "../services/firebase";
import { theme } from "../theme";
import { Body, Display, Icon, Meta, Pill, Text } from "../ui";

type Props = {
  projectId?: string | null;
  onBack: () => void;
  onActivated?: () => void;
};

type Message = { role: "user" | "assistant"; content: string };

export function ProjectIntakeScreen({ projectId, onBack, onActivated }: Props) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isReadyToSave, setIsReadyToSave] = useState(false);
  const [composer, setComposer] = useState("");
  const [isBooting, setIsBooting] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [briefExpanded, setBriefExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Allow typing during boot — send is only blocked while an AI response is in-flight
  const canSend = !isSending && composer.trim().length > 0;
  const title = project?.name || project?.projectType || "New project";

  useEffect(() => {
    void boot();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages, isSending, suggestedReplies]);

  async function boot() {
    setError(null);
    if (projectId) {
      // Resume existing conversation — load from backend
      setIsBooting(true);
      try {
        const token = await getToken();
        const p = await getProject(token, projectId);
        setProject(p);
        setMessages(p.chatHistory as Message[]);
        setIsReadyToSave(Boolean(p.description && p.projectType && p.desiredFeeling));
      } catch {
        setError("Couldn't load the conversation. Check your connection and try again.");
      } finally {
        setIsBooting(false);
      }
    } else {
      // New conversation — show a static greeting immediately, no backend call.
      // The project is created lazily when the user sends their first message.
      setMessages([{
        role: "assistant",
        content: "Tell me about what you're building. What's the project and what should it feel like when it's dialed in?"
      }]);
      setIsBooting(false);
    }
  }

  async function send(text: string, opts?: { referenceImages?: string[]; referenceLinks?: string[] }) {
    const trimmed = text.trim();
    if (!trimmed && !opts?.referenceImages?.length) return;
    if (isSending) return;

    const userMsg = trimmed || "Use this reference image to sharpen the project world.";
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setComposer("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsSending(true);
    setSuggestedReplies([]);
    setError(null);

    try {
      const token = await getToken();
      let currentProject = project;

      // Lazy creation: first message on a new conversation creates the project
      if (!currentProject) {
        const created = await createProject(token);
        currentProject = created.project;
        setProject(currentProject);
        // Don't show the bootstrap greeting — we already showed the static one
      }

      const result = await sendProjectChat(token, currentProject.id, {
        message: userMsg,
        referenceImages: opts?.referenceImages,
        referenceLinks: extractUrls(userMsg),
      });
      setProject(result.project);
      setMessages(prev => [...prev, { role: "assistant", content: result.assistantMessage }]);
      setSuggestedReplies(result.suggestedReplies);
      setMissingFields(result.missingFields);
      setIsReadyToSave(result.isReadyToSave);
    } catch {
      setError("Couldn't send your message. Try again.");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsSending(false);
    }
  }

  async function handlePickImage() {
    if (isSending || isBooting || !project) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1
    });
    if (result.canceled || !result.assets.length) return;
    try {
      const token = await getToken();
      const url = await uploadProjectReferenceImage(token, {
        imageUri: result.assets[0].uri,
        mimeType: result.assets[0].mimeType
      });
      await send("Use this reference image to sharpen the project world.", { referenceImages: [url] });
    } catch {
      setError("Couldn't upload the image.");
    }
  }

  async function handleActivate() {
    if (!project || isActivating) return;
    setIsActivating(true);
    try {
      const token = await getToken();
      const updated = await activateProject(token, project.id);
      setProject(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onActivated?.();
    } catch {
      setError("Couldn't activate this project.");
    } finally {
      setIsActivating(false);
    }
  }

  async function handleDeactivate() {
    if (!project || isActivating) return;
    setIsActivating(true);
    try {
      const token = await getToken();
      await deactivateProject(token);
      setProject(prev => prev ? { ...prev, isActive: false } : prev);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onActivated?.();
    } catch {
      setError("Couldn't deactivate this project.");
    } finally {
      setIsActivating(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <Pill icon="back" onPress={onBack} />
        <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
        {project?.isActive ? (
          <Pill tight onPress={handleDeactivate} style={s.activePill}>
            <Text style={s.activePillText}>{isActivating ? "Saving…" : "Active ×"}</Text>
          </Pill>
        ) : isReadyToSave ? (
          <Pill tight onPress={handleActivate}>
            <Text style={{ fontFamily: theme.font.sansMedium, fontSize: 12, color: theme.ink[1] }}>
              {isActivating ? "Saving…" : "Use for scans"}
            </Text>
          </Pill>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {/* ── Brief card (pinned) ── */}
      {project?.briefSummary ? (
        <Pressable
          onPress={() => setBriefExpanded(e => !e)}
          style={({ pressed }) => [s.briefCard, pressed && { opacity: 0.85 }]}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Meta style={{ marginBottom: 4 }}>LIVE BRIEF</Meta>
              <Text style={s.briefText} numberOfLines={briefExpanded ? undefined : 2}>
                {project.briefSummary}
              </Text>
            </View>
            <View style={{ transform: [{ rotate: briefExpanded ? "270deg" : "90deg" }] }}>
              <Text style={{ fontSize: 14, color: theme.ink[3] }}>›</Text>
            </View>
          </View>
          {briefExpanded && project ? <BriefDetails project={project} missingFields={missingFields} /> : null}
        </Pressable>
      ) : null}

      {/* ── Message thread (chips live inside so they appear right after the last message) ── */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={s.thread}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isBooting ? (
          <View style={s.bootWrap}>
            <TypingDots />
          </View>
        ) : null}

        {messages.map((msg, i) =>
          msg.role === "assistant" ? (
            <AssistantBubble key={i} content={msg.content} />
          ) : (
            <UserBubble key={i} content={msg.content} />
          )
        )}

        {isSending ? <TypingIndicator /> : null}

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        {/* Suggested replies inline — no gap above, always anchored to last message */}
        {suggestedReplies.length > 0 && !isSending ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chips}
            style={s.chipBar}
            keyboardShouldPersistTaps="handled"
          >
            {suggestedReplies.map(reply => (
              <Pressable
                key={reply}
                onPress={() => void send(reply)}
                style={({ pressed }) => [s.chip, pressed && { opacity: 0.75 }]}
              >
                <RNText style={s.chipText} numberOfLines={1}>{reply}</RNText>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </ScrollView>

      {/* ── Composer ── */}
      <View style={s.composerBar}>
        <Pressable
          onPress={handlePickImage}
          disabled={isSending}
          style={({ pressed }) => [s.attachBtn, isSending && { opacity: 0.4 }, pressed && { opacity: 0.6 }]}
        >
          <Icon name="attach" size={15} color={theme.ink[2]} />
        </Pressable>

        <TextInput
          ref={inputRef}
          style={s.input}
          value={composer}
          onChangeText={setComposer}
          placeholder="Message Palleto…"
          placeholderTextColor={theme.ink[4]}
          multiline
          returnKeyType="default"
          blurOnSubmit={false}
        />

        <Pressable
          onPress={() => void send(composer)}
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
    </KeyboardAvoidingView>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function AssistantBubble({ content }: { content: string }) {
  return (
    <View style={s.assistantRow}>
      <View style={s.assistantAvatar}>
        <Text style={s.assistantAvatarText}>P</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Meta style={{ marginBottom: 5 }}>Palleto</Meta>
        <Body style={s.assistantText}>{content}</Body>
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

function TypingIndicator() {
  return (
    <View style={s.assistantRow}>
      <View style={s.assistantAvatar}>
        <Text style={s.assistantAvatarText}>P</Text>
      </View>
      <View>
        <Meta style={{ marginBottom: 8 }}>Palleto</Meta>
        <TypingDots />
      </View>
    </View>
  );
}

function TypingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: 1, duration: 280, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 280, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.delay((3 - i) * 160)
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: "row", gap: 5, paddingVertical: 4 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: theme.ink[3],
            opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
            transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }]
          }}
        />
      ))}
    </View>
  );
}

function BriefDetails({ project, missingFields }: { project: ProjectDetail; missingFields: string[] }) {
  const rows = [
    ["Type", project.projectType],
    ["Description", project.description],
    ["Should feel", project.desiredFeeling],
    ["Avoid", project.avoid],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <View style={s.briefDetails}>
      {rows.map(([label, value]) => (
        <View key={label} style={{ marginBottom: 8 }}>
          <Meta style={{ marginBottom: 2 }}>{label.toUpperCase()}</Meta>
          <Body style={{ fontSize: 13, lineHeight: 18, color: theme.ink[2] }}>{value}</Body>
        </View>
      ))}
      {missingFields.length > 0 ? (
        <Meta style={{ marginTop: 4, color: "#C5683E" }}>{missingFields.length} OPEN POINT{missingFields.length > 1 ? "S" : ""}</Meta>
      ) : (
        <Meta style={{ marginTop: 4, color: "#5A6E64" }}>BRIEF COMPLETE</Meta>
      )}
    </View>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */

async function getToken(): Promise<string> {
  const user = firebaseAuth.currentUser as User | null;
  if (!user) throw new Error("Not signed in.");
  return user.getIdToken();
}

function extractUrls(text: string): string[] {
  return text.match(/https?:\/\/[^\s]+/g) ?? [];
}

/* ── Styles ──────────────────────────────────────────────────── */

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.palette.bone
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    gap: 10
  },
  headerTitle: {
    flex: 1,
    fontFamily: theme.font.sansMedium,
    fontSize: 15,
    color: theme.ink[1],
    textAlign: "center"
  },
  activePill: {
    backgroundColor: "#EEF4F1",
    borderColor: "#5A6E64"
  },
  activePillText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 12,
    color: "#5A6E64"
  },
  briefCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    backgroundColor: theme.palette.paper,
    borderRadius: theme.radius.lg,
    ...theme.shadow.quiet
  },
  briefText: {
    fontFamily: theme.font.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: theme.ink[2]
  },
  briefDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.palette.line
  },
  thread: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 20
  },
  bootWrap: {
    paddingTop: 12
  },
  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    maxWidth: "92%"
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.ink[1],
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1
  },
  assistantAvatarText: {
    fontFamily: theme.font.display,
    fontSize: 13,
    color: "#FAF7F0"
  },
  assistantText: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.ink[1]
  },
  userRow: {
    alignItems: "flex-end"
  },
  userBubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.ink[1],
    borderRadius: 20,
    borderBottomRightRadius: 5
  },
  userText: {
    fontFamily: theme.font.sans,
    fontSize: 15,
    lineHeight: 21,
    color: "#FAF7F0"
  },
  errorText: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.colors.error,
    textAlign: "center",
    paddingHorizontal: 16
  },
  chipBar: {
    marginHorizontal: -16,               // bleed to screen edges since thread has 16px padding
    marginTop: 4
  },
  chips: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8
  },
  chip: {
    maxWidth: 220,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: theme.palette.paper,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.palette.line,
    ...theme.shadow.quiet
  },
  chipText: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    lineHeight: 17,
    color: theme.ink[1]
  },
  composerBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 34,
    backgroundColor: theme.palette.bone,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.palette.line
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.palette.paper,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
    ...theme.shadow.quiet
  },
  attachGlyph: {
    fontSize: 16,
    color: theme.ink[2]
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
    textAlignVertical: "top"
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(28,26,23,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1
  },
  sendBtnActive: {
    backgroundColor: theme.ink[1]
  },
  sendArrow: {
    fontSize: 16,
    color: theme.ink[4],
    lineHeight: 18
  },
  sendArrowActive: {
    color: "#FAF7F0"
  }
});
