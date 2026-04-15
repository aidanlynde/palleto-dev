import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, OAuthProvider, signInWithCredential } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { firebaseAuth } from "../services/firebase";
import { theme } from "../theme";

WebBrowser.maybeCompleteAuthSession();

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined;
const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined;
const googleClientConfig = {
  clientId: googleWebClientId ?? "missing-google-client-id",
  webClientId: googleWebClientId,
  iosClientId: googleIosClientId,
  androidClientId: googleAndroidClientId
};

export function AuthScreen() {
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [activeProvider, setActiveProvider] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [googleRequest, googleResponse, promptGoogleAsync] =
    Google.useIdTokenAuthRequest(googleClientConfig);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
  }, []);

  useEffect(() => {
    async function finishGoogleSignIn() {
      if (!googleResponse) {
        return;
      }

      if (googleResponse.type !== "success") {
        setActiveProvider(null);
        return;
      }

      const idToken = googleResponse.params.id_token;
      if (!idToken) {
        setError("Google did not return an ID token.");
        setActiveProvider(null);
        return;
      }

      try {
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(firebaseAuth, credential);
      } catch {
        setError("Google sign-in failed. Check Firebase and Google client ID setup.");
      } finally {
        setActiveProvider(null);
      }
    }

    finishGoogleSignIn();
  }, [googleResponse]);

  async function signInWithGoogle() {
    setError(null);
    setActiveProvider("google");

    try {
      await promptGoogleAsync();
    } catch {
      setError("Google sign-in failed. Check Firebase and Google client ID setup.");
      setActiveProvider(null);
    }
  }

  async function signInWithApple() {
    setError(null);
    setActiveProvider("apple");

    try {
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL
        ],
        nonce: hashedNonce
      });

      if (!appleCredential.identityToken) {
        throw new Error("Apple did not return an identity token.");
      }

      const provider = new OAuthProvider("apple.com");
      const firebaseCredential = provider.credential({
        idToken: appleCredential.identityToken,
        rawNonce
      });

      await signInWithCredential(firebaseAuth, firebaseCredential);
    } catch {
      setError("Apple sign-in failed or was cancelled.");
    } finally {
      setActiveProvider(null);
    }
  }

  const isSubmitting = activeProvider !== null;
  const isGoogleConfigured = Boolean(googleWebClientId);

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.eyebrow}>Palleto</Text>
        <Text style={styles.title}>Start your inspiration library.</Text>
        <Text style={styles.body}>
          Continue with your creative account. Cards and scans arrive in later phases.
        </Text>
      </View>

      <View style={styles.form}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          disabled={isSubmitting || !googleRequest || !isGoogleConfigured}
          onPress={signInWithGoogle}
          style={({ pressed }) => [
            styles.providerButton,
            (pressed || activeProvider === "google") && styles.pressed,
            (!googleRequest || !isGoogleConfigured) && styles.disabled
          ]}
        >
          {activeProvider === "google" ? (
            <ActivityIndicator color={theme.colors.textPrimary} />
          ) : (
            <Text style={styles.providerButtonText}>Continue with Google</Text>
          )}
        </Pressable>

        {Platform.OS === "ios" && isAppleAvailable ? (
          <Pressable
            disabled={isSubmitting}
            onPress={signInWithApple}
            style={({ pressed }) => [
              styles.providerButton,
              (pressed || activeProvider === "apple") && styles.pressed
            ]}
          >
            {activeProvider === "apple" ? (
              <ActivityIndicator color={theme.colors.textPrimary} />
            ) : (
              <Text style={styles.providerButtonText}>Continue with Apple</Text>
            )}
          </Pressable>
        ) : null}

        {!isGoogleConfigured ? (
          <Text style={styles.helperText}>Add Google client IDs to mobile/.env.</Text>
        ) : null}
      </View>
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
  },
  form: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.md
  },
  error: {
    color: "#FF7A7A",
    fontSize: 14,
    lineHeight: 20
  },
  providerButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    backgroundColor: theme.colors.surface,
    borderColor: "#2A2A2A",
    borderRadius: theme.radius.small,
    borderWidth: 1
  },
  providerButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.72
  },
  disabled: {
    opacity: 0.45
  },
  helperText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  }
});
