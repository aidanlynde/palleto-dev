import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/brand/palleto-logo-transparent.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator color={theme.colors.textPrimary} />
      <Text style={styles.text}>Loading Palleto...</Text>
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
    width: 96,
    height: 96,
    marginBottom: theme.spacing.xl
  },
  text: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 15
  }
});
