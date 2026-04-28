import { signOut, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getMe, UserProfile } from "../services/api";
import { firebaseAuth } from "../services/firebase";
import { ProjectContext } from "../services/projectContext";
import { theme } from "../theme";

type ProfileScreenProps = {
  firebaseUser: User;
  onEditProject: () => void;
  projectContext: ProjectContext | null;
};

export function ProfileScreen({ firebaseUser, onEditProject, projectContext }: ProfileScreenProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [statusText, setStatusText] = useState("Syncing your profile...");

  useEffect(() => {
    let isMounted = true;

    async function syncProfile() {
      try {
        const token = await firebaseUser.getIdToken();
        const syncedProfile = await getMe(token);

        if (isMounted) {
          setProfile(syncedProfile);
          setStatusText("Profile synced.");
        }
      } catch {
        if (isMounted) {
          setStatusText("Profile sync failed. Check backend and Firebase configuration.");
        }
      }
    }

    syncProfile();

    return () => {
      isMounted = false;
    };
  }, [firebaseUser]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image
        source={require("../../assets/brand/palleto-logo-transparent.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.eyebrow}>Profile</Text>
      <Text style={styles.title}>Your creative context.</Text>
      <Text style={styles.body}>
        Palleto uses your active project to make scans more specific to what you are building.
      </Text>

      {projectContext ? (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Active project</Text>
          <Text style={styles.projectTitle}>{projectContext.name}</Text>
          <Text style={styles.projectDescription}>{projectContext.description}</Text>
          {projectContext.desiredFeeling ? (
            <Text style={styles.projectMeta}>Target feel: {projectContext.desiredFeeling}</Text>
          ) : null}
          {projectContext.audience ? (
            <Text style={styles.projectMeta}>Audience: {projectContext.audience}</Text>
          ) : null}
          <View style={styles.tagRow}>
            {[projectContext.projectType, ...projectContext.directionTags].map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
          {projectContext.referenceLinks.length ? (
            <Text style={styles.projectMeta}>
              References linked: {projectContext.referenceLinks.length}
            </Text>
          ) : null}
          <Pressable style={styles.inlineButton} onPress={onEditProject}>
            <Text style={styles.inlineButtonText}>Edit project context</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Active project</Text>
          <Text style={styles.projectTitle}>No project context yet</Text>
          <Text style={styles.projectDescription}>
            Your first scan works without this. Add project context when you want future outputs to
            feel more specific to what you are building.
          </Text>
          <Pressable style={styles.inlineButton} onPress={onEditProject}>
            <Text style={styles.inlineButtonText}>Add project context</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.panel}>
        <Text style={styles.panelLabel}>Signed in as</Text>
        <Text style={styles.panelValue}>{profile?.email ?? firebaseUser.email ?? "Unknown user"}</Text>
        <Text style={styles.status}>{statusText}</Text>
      </View>

      <Pressable style={styles.secondaryButton} onPress={() => signOut(firebaseAuth)}>
        <Text style={styles.secondaryButtonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: theme.spacing.lg
  },
  eyebrow: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38
  },
  body: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 16,
    lineHeight: 24
  },
  panel: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.medium
  },
  panelLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  panelValue: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  projectTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28
  },
  projectDescription: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  projectMeta: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
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
    fontSize: 12,
    fontWeight: "800"
  },
  inlineButton: {
    alignSelf: "flex-start",
    marginTop: theme.spacing.xs
  },
  inlineButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800"
  },
  status: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  secondaryButton: {
    alignItems: "center",
    marginTop: theme.spacing.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.small
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  }
});
