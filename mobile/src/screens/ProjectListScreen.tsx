/**
 * ProjectListScreen — conversation list entry point for project context chats.
 *
 * Shows all saved project conversations, newest first.
 * Tap a row to resume. Tap "+" to start a new one. Long-press to delete.
 */
import * as Haptics from "expo-haptics";
import { User } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View
} from "react-native";

import { deleteProject, listProjects, ProjectSummary } from "../services/api";
import { firebaseAuth } from "../services/firebase";
import { theme } from "../theme";
import { Body, Display, DisplayItalic, Icon, Meta, Pill, Text } from "../ui";

type Props = {
  onNewConversation: () => void;
  onOpenConversation: (projectId: string) => void;
  onBack?: () => void;
};

export function ProjectListScreen({ onNewConversation, onOpenConversation, onBack }: Props) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      const token = await getToken();
      const data = await listProjects(token);
      setProjects(data);
      setError(null);
    } catch {
      setError("Couldn't load your projects.");
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function confirmDelete(project: ProjectSummary) {
    const name = project.name || project.projectType || "this conversation";
    Alert.alert(`Delete "${name}"?`, "This removes the project and its chat history.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void doDelete(project.id) }
    ]);
  }

  async function doDelete(projectId: string) {
    try {
      const token = await getToken();
      await deleteProject(token, projectId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch {
      Alert.alert("Delete failed", "Try again in a moment.");
    }
  }

  const activeProject = projects.find(p => p.isActive);
  const otherProjects = projects.filter(p => !p.isActive);

  return (
    <View style={s.screen}>
      {/* Top bar */}
      <View style={s.topbar}>
        {onBack ? <Pill icon="back" onPress={onBack} /> : <View style={{ width: 38 }} />}
        <View style={s.wordmarkRow}>
          <Display size={22} style={{ lineHeight: 24 }}>palleto</Display>
          <View style={s.wordmarkDot} />
        </View>
        <Pill dark icon="plus" onPress={onNewConversation} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.ink[3]} />
        }
      >
        {/* Header */}
        <View style={{ marginBottom: 8 }}>
          <Meta style={{ marginBottom: 6 }}>PROJECT CONTEXT</Meta>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <Display size={28} style={{ lineHeight: 34 }}>Your projects </Display>
            <DisplayItalic size={28} color={theme.ink[2]} style={{ lineHeight: 34 }}>& briefs</DisplayItalic>
          </View>
          <Body style={{ marginTop: 8, color: theme.ink[3], fontSize: 14 }}>
            Each conversation shapes a project brief that focuses every scan.
          </Body>
        </View>

        {loading ? (
          <View style={s.loading}>
            <ActivityIndicator color={theme.ink[3]} />
          </View>
        ) : error ? (
          <Text style={s.error}>{error}</Text>
        ) : projects.length === 0 ? (
          <EmptyState onNew={onNewConversation} />
        ) : (
          <View style={{ gap: 10 }}>
            {/* Active project — always at the top */}
            {activeProject ? (
              <View style={{ gap: 6 }}>
                <Meta style={{ color: "#C5683E" }}>ACTIVE FOR SCANS</Meta>
                <ProjectRow
                  project={activeProject}
                  onOpen={() => onOpenConversation(activeProject.id)}
                  onDelete={() => confirmDelete(activeProject)}
                />
              </View>
            ) : null}

            {/* Other projects */}
            {otherProjects.length > 0 ? (
              <View style={{ gap: 6, marginTop: activeProject ? 8 : 0 }}>
                {activeProject ? <Meta>OTHER PROJECTS</Meta> : null}
                {otherProjects.map(p => (
                  <ProjectRow
                    key={p.id}
                    project={p}
                    onOpen={() => onOpenConversation(p.id)}
                    onDelete={() => confirmDelete(p)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ProjectRow({
  project,
  onOpen,
  onDelete
}: {
  project: ProjectSummary;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const title = project.name || project.projectType || "New conversation";
  const summary = project.briefSummary || "Start describing what you're building.";
  const age = relativeTime(project.updatedAt);

  return (
    <Pressable
      onPress={onOpen}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDelete();
      }}
      style={({ pressed }) => [s.row, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {project.isActive ? <View style={s.activeDot} /> : null}
          <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
        </View>
        <Text style={s.rowSummary} numberOfLines={2}>{summary}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
          <Meta style={{ fontSize: 11 }}>{age}</Meta>
          {project.messageCount > 0 ? (
            <Meta style={{ fontSize: 11 }}>{project.messageCount} messages</Meta>
          ) : null}
        </View>
      </View>
      <Icon name="chevron" size={14} color={theme.ink[4]} />
    </Pressable>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyGlyph}>◐</Text>
      <Display size={20} style={{ textAlign: "center", lineHeight: 24, marginTop: 12 }}>
        No projects yet
      </Display>
      <Body style={{ textAlign: "center", color: theme.ink[3], marginTop: 8, fontSize: 14, maxWidth: 260 }}>
        Start a conversation to build the brief behind your scans.
      </Body>
      <Pressable
        onPress={onNew}
        style={({ pressed }) => [s.emptyBtn, pressed && { opacity: 0.8 }]}
      >
        <Text style={s.emptyBtnText}>Start your first project</Text>
      </Pressable>
    </View>
  );
}

async function getToken(): Promise<string> {
  const user = firebaseAuth.currentUser as User | null;
  if (!user) throw new Error("Not signed in.");
  return user.getIdToken();
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.palette.bone
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2
  },
  wordmarkDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#C5683E",
    marginBottom: -1
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
    gap: 0
  },
  loading: {
    paddingVertical: 60,
    alignItems: "center"
  },
  error: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.colors.error,
    marginTop: 20
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: theme.palette.paper,
    borderRadius: theme.radius.lg,
    ...theme.shadow.quiet
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C5683E"
  },
  rowTitle: {
    fontFamily: theme.font.sansMedium,
    fontSize: 15,
    color: theme.ink[1],
    flex: 1
  },
  rowSummary: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    lineHeight: 18,
    color: theme.ink[3]
  },
  empty: {
    paddingTop: 60,
    alignItems: "center"
  },
  emptyGlyph: {
    fontSize: 32,
    color: theme.ink[4]
  },
  emptyBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: theme.ink[1],
    borderRadius: theme.radius.pill
  },
  emptyBtnText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 14,
    color: "#FAF7F0"
  }
});
