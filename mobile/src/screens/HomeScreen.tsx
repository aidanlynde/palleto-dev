import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Inspiration cards</Text>
      <Text style={styles.title}>Capture what catches your eye.</Text>
      <Text style={styles.body}>
        Phase 1 scaffold is ready. Scan, library, auth, and card generation will be added in
        later phases.
      </Text>
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
  }
});
