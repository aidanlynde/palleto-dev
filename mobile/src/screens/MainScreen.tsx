import * as Haptics from "expo-haptics";
import { User } from "firebase/auth";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { InspirationCard } from "../services/api";
import { ProjectContext } from "../services/projectContext";
import { theme } from "../theme";
import { LibraryScreen } from "./LibraryScreen";
import { ProfileScreen } from "./ProfileScreen";

type MainScreenProps = {
  firebaseUser: User;
  onEditProject: () => void;
  onScan: () => void;
  onSelectCard: (card: InspirationCard) => void;
  projectContext: ProjectContext | null;
};

type Tab = "library" | "profile";

export function MainScreen({
  firebaseUser,
  onEditProject,
  onScan,
  onSelectCard,
  projectContext
}: MainScreenProps) {
  const [activeTab, setActiveTab] = useState<Tab>("library");

  function selectTab(tab: Tab) {
    Haptics.selectionAsync();
    setActiveTab(tab);
  }

  return (
    <View style={styles.container}>
      <View style={styles.screen}>
        {activeTab === "library" ? (
          <LibraryScreen
            firebaseUser={firebaseUser}
            onEditProject={onEditProject}
            onScan={onScan}
            onSelectCard={onSelectCard}
            projectContext={projectContext}
          />
        ) : (
          <ProfileScreen
            firebaseUser={firebaseUser}
            onEditProject={onEditProject}
            projectContext={projectContext}
          />
        )}
      </View>

      <View style={styles.nav}>
        <NavButton active={activeTab === "library"} label="Library" onPress={() => selectTab("library")} />
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onScan();
          }}
          style={({ pressed }) => [styles.scanButton, pressed && styles.pressed]}
        >
          <Text style={styles.scanButtonText}>Scan</Text>
        </Pressable>
        <NavButton active={activeTab === "profile"} label="Profile" onPress={() => selectTab("profile")} />
      </View>
    </View>
  );
}

function NavButton({
  active,
  label,
  onPress
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}>
      <Text style={[styles.navButtonText, active && styles.navButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  screen: {
    flex: 1
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 34,
    backgroundColor: theme.colors.background,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46
  },
  navButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "800"
  },
  navButtonTextActive: {
    color: theme.colors.textPrimary
  },
  scanButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 94,
    minHeight: 50,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: theme.radius.small
  },
  scanButtonText: {
    color: theme.colors.background,
    fontSize: 15,
    fontWeight: "900"
  },
  pressed: {
    opacity: 0.72
  }
});
