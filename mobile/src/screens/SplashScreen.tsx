import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

export function SplashScreen({
  detail,
  warning
}: {
  detail?: string;
  warning?: string | null;
}) {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/brand/palleto-logo-transparent.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator color={theme.colors.textPrimary} />
      <Text style={styles.text}>{detail || "Loading Palleto..."}</Text>
      {warning ? <Text style={styles.warning}>{warning}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: theme.spacing.xl
  },
  text: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 15
  },
  warning: {
    marginTop: theme.spacing.sm,
    maxWidth: 280,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center"
  }
});
