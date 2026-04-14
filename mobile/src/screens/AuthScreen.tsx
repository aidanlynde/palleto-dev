import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { firebaseAuth } from "../services/firebase";
import { theme } from "../theme";

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === "signIn") {
        await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      }
    } catch {
      setError("Unable to continue. Check your email, password, and Firebase setup.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const ctaLabel = mode === "signIn" ? "Sign in" : "Create account";
  const switchLabel = mode === "signIn" ? "Create an account" : "Use an existing account";

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.container}
    >
      <View>
        <Text style={styles.eyebrow}>Palleto</Text>
        <Text style={styles.title}>Start your inspiration library.</Text>
        <Text style={styles.body}>
          Sign in to sync your profile with the backend. Cards and scans arrive in later phases.
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={theme.colors.textSecondary}
          style={styles.input}
          value={email}
        />
        <TextInput
          autoCapitalize="none"
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable disabled={isSubmitting} onPress={submit} style={styles.primaryButton}>
          {isSubmitting ? (
            <ActivityIndicator color={theme.colors.textPrimary} />
          ) : (
            <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
          )}
        </Pressable>

        <Pressable
          disabled={isSubmitting}
          onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
          style={styles.switchButton}
        >
          <Text style={styles.switchButtonText}>{switchLabel}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  },
  form: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.md
  },
  input: {
    height: 52,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    borderColor: "#2A2A2A",
    borderRadius: theme.radius.small,
    borderWidth: 1,
    fontSize: 16
  },
  error: {
    color: "#FF7A7A",
    fontSize: 14,
    lineHeight: 20
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.small
  },
  primaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  switchButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm
  },
  switchButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: "700"
  }
});
