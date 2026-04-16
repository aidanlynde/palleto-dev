import { signOut, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { getMe, UserProfile } from "../services/api";
import { firebaseAuth } from "../services/firebase";

import { theme } from "../theme";

type HomeScreenProps = {
  firebaseUser: User;
};

export function HomeScreen({ firebaseUser }: HomeScreenProps) {
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
    <View style={styles.container}>
      <Image
        source={require("../../assets/brand/palleto-logo-transparent.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.eyebrow}>Inspiration cards</Text>
      <Text style={styles.title}>Capture what catches your eye.</Text>
      <Text style={styles.body}>
        Auth is connected for Phase 2. Scan, library, subscriptions, and card generation will be
        added in later phases.
      </Text>
      <View style={styles.panel}>
        <Text style={styles.panelLabel}>Signed in as</Text>
        <Text style={styles.panelValue}>{profile?.email ?? firebaseUser.email ?? "Unknown user"}</Text>
        <Text style={styles.status}>{statusText}</Text>
      </View>
      <Pressable style={styles.secondaryButton} onPress={() => signOut(firebaseAuth)}>
        <Text style={styles.secondaryButtonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "700",
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
    marginTop: theme.spacing.xs,
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  status: {
    marginTop: theme.spacing.sm,
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
