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
  View,
} from "react-native";

import { activateProject, deactivateProject, deleteProject, listProjects, ProjectSummary } from "../services/api";
import { firebaseAuth } from "../services/firebase";
import { theme } from "../theme";
import { Body, Display, DisplayItalic, Icon, Meta, Pill, Text } from "../ui";

type Props = {
  onNewConversation: () => void;
  onOpenConversation: (projectId: string) => void;
  onBack?: () => void;
  onProjectActivated?: () => void;
};

export function ProjectListScreen({ onNewConversation, onOpenConversation, onBack, onProjectActivated }: Props) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
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

  function doDelete(projectId: string) {
    if (deletingId) return;
    Alert.alert(
      "Delete project?",
      "This will permanently remove the project and its chat history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive", onPress: () => void confirmDelete(projectId)
        }
      ]
    );
  }

  async function confirmDelete(projectId: string) {
    setDeletingId(projectId);
    setErrorId(null);
    try {
      const token = await getToken();
      await deleteProject(token, projectId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch {
      setErrorId(projectId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setDeletingId(null);
    }
  }

  async function doActivate(projectId: string) {
    if (activatingId) return;
    setActivatingId(projectId);
    try {
      const token = await getToken();
      await activateProject(token, projectId);
      setProjects(prev => prev.map(p => ({ ...p, isActive: p.id === projectId })));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onProjectActivated?.();
    } catch {
      Alert.alert("Couldn't activate", "Try again in a moment.");
    } finally {
      setActivatingId(null);
    }
  }

  async function doDeactivate() {
    try {
      const token = await getToken();
      await deactivateProject(token);
      setProjects(prev => prev.map(p => ({ ...p, isActive: false })));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onProjectActivated?.();
    } catch {
      Alert.alert("Couldn't deactivate", "Try again in a moment.");
    }
  }

  async function clearAll() {
    Alert.alert("Clear all projects?", "This removes every project and its chat history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear all", style: "destructive", onPress: async () => {
          for (const p of projects) {
            try {
              const token = await getToken();
              await deleteProject(token, p.id);
            } catch { /* skip failed ones */ }
          }
          setProjects([]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    ]);
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

      {/* Clear all — only shown when there are projects to clean up */}
      {!loading && projects.length > 0 ? (
        <Pressable onPress={clearAll} style={({ pressed }) => [s.clearAll, pressed && { opacity: 0.6 }]}>
          <Text style={s.clearAllText}>Clear all</Text>
        </Pressable>
      ) : null}

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
                  isDeleting={deletingId === activeProject.id}
                  isActivating={activatingId === activeProject.id}
                  hasError={errorId === activeProject.id}
                  onOpen={() => onOpenConversation(activeProject.id)}
                  onDelete={() => void doDelete(activeProject.id)}
                  onDeactivate={() => void doDeactivate()}
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
                    isDeleting={deletingId === p.id}
                    isActivating={activatingId === p.id}
                    hasError={errorId === p.id}
                    onOpen={() => onOpenConversation(p.id)}
                    onDelete={() => void doDelete(p.id)}
                    onActivate={() => void doActivate(p.id)}
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
  isDeleting,
  isActivating,
  hasError,
  onOpen,
  onDelete,
  onActivate,
  onDeactivate,
}: {
  project: ProjectSummary;
  isDeleting: boolean;
  isActivating: boolean;
  hasError: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
}) {
  const title = project.name || project.projectType || "New conversation";
  const summary = project.briefSummary || "Start describing what you're building.";
  const age = relativeTime(project.updatedAt);

  return (
    <View style={[s.row, isDeleting && { opacity: 0.5 }, hasError && s.rowError]}>
      <Pressable
        onPress={onOpen}
        disabled={isDeleting}
        style={({ pressed }) => [{ flex: 1, gap: 4 }, pressed && { opacity: 0.7 }]}
      >
        <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={s.rowSummary} numberOfLines={2}>{summary}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
          <Meta style={{ fontSize: 11 }}>{age}</Meta>
          {project.messageCount > 0 ? (
            <Meta style={{ fontSize: 11 }}>{project.messageCount} messages</Meta>
          ) : null}
          {hasError ? (
            <Meta style={{ fontSize: 11, color: theme.colors.error }}>Delete failed — tap × again</Meta>
          ) : null}
        </View>
      </Pressable>

      {/* Activate / deactivate toggle */}
      {project.isActive ? (
        <Pressable
          onPress={onDeactivate}
          disabled={isDeleting}
          hitSlop={8}
          style={({ pressed }) => [s.activeTag, pressed && { opacity: 0.7 }]}
        >
          {isActivating
            ? <ActivityIndicator size="small" color="#5A6E64" />
            : <Text style={s.activeTagText}>Active</Text>
          }
        </Pressable>
      ) : (
        <Pressable
          onPress={onActivate}
          disabled={isDeleting || isActivating}
          hitSlop={8}
          style={({ pressed }) => [s.activateBtn, isActivating && { opacity: 0.5 }, pressed && { opacity: 0.6 }]}
        >
          {isActivating
            ? <ActivityIndicator size="small" color={theme.ink[3]} />
            : <Icon name="check" size={13} color={theme.ink[3]} />
          }
        </Pressable>
      )}

      <Pressable
        onPress={onDelete}
        disabled={isDeleting}
        hitSlop={12}
        style={({ pressed }) => [
          s.deleteBtn,
          hasError && s.deleteBtnError,
          pressed && { opacity: 0.5 }
        ]}
      >
        {isDeleting
          ? <ActivityIndicator size="small" color={theme.ink[3]} />
          : <Icon name="close" size={13} color={hasError ? theme.colors.error : theme.ink[4]} />
        }
      </Pressable>
    </View>
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
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.palette.putty,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  deleteBtnError: {
    backgroundColor: "#FDECEA"
  },
  rowError: {
    borderWidth: 1,
    borderColor: theme.colors.error
  },
  clearAll: {
    alignSelf: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 4
  },
  clearAllText: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.ink[3]
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C5683E"
  },
  activeTag: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#EEF4F1",
    borderWidth: 1,
    borderColor: "#5A6E64",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  activeTagText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 12,
    color: "#5A6E64"
  },
  activateBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.palette.putty,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
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
