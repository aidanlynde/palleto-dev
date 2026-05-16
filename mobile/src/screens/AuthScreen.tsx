import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, OAuthProvider, signInWithCredential } from "firebase/auth";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { firebaseAuth } from "../services/firebase";
import { theme } from "../theme";
import { Body, Button, Display, DisplayItalic, Meta, Pill, Text } from "../ui";

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

type AuthScreenProps = {
  onBack?: () => void;
};

export function AuthScreen({ onBack }: AuthScreenProps) {
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
      if (!googleResponse) return;
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
  const showApple = Platform.OS === "ios" && isAppleAvailable;

  return (
    <View style={s.screen}>
      {/* Back pill — floating top-left */}
      {onBack ? (
        <View style={s.backWrap}>
          <Pill icon="back" onPress={onBack} />
        </View>
      ) : null}

      {/* Main content — centered vertically */}
      <View style={s.content}>

        {/* Wordmark */}
        <View style={s.wordmarkRow}>
          <Display size={44} style={{ lineHeight: 46 }}>palleto</Display>
          <View style={s.wordmarkDot} />
        </View>

        {/* Eyebrow */}
        <Meta style={{ marginTop: 28, color: theme.ink[3] }}>
          A FIELD GUIDE FOR THE EYE
        </Meta>

        {/* Headline */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
          <Display size={30} style={s.headlineLine}>Keep your palette </Display>
          <DisplayItalic size={30} color={theme.ink[2]} style={s.headlineLine}>
            close.
          </DisplayItalic>
        </View>

        {/* Body */}
        <Body style={s.body}>
          Save scans, build your library, and pick up where you left off on any device.
        </Body>

        {/* Auth buttons */}
        <View style={s.buttons}>
          {error ? (
            <Text style={s.error}>{error}</Text>
          ) : null}

          {showApple ? (
            <Button
              onPress={signInWithApple}
              disabled={isSubmitting}
              style={s.btn}
            >
              {activeProvider === "apple" ? "Signing in…" : "Continue with Apple"}
            </Button>
          ) : null}

          <Button
            variant={showApple ? "secondary" : "primary"}
            onPress={signInWithGoogle}
            disabled={isSubmitting || !googleRequest || !isGoogleConfigured}
            style={s.btn}
          >
            {activeProvider === "google" ? "Signing in…" : "Continue with Google"}
          </Button>

          {!isGoogleConfigured ? (
            <Text style={s.helper}>Add Google client IDs to mobile/.env to enable Google sign-in.</Text>
          ) : null}
        </View>

        {/* Fine print */}
        <Text style={s.finePrint}>
          By continuing you agree to Palleto's Terms and Privacy Policy.
        </Text>

      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.palette.bone
  },
  backWrap: {
    position: "absolute",
    top: 60,
    left: 24,
    zIndex: 10
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 24
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3
  },
  wordmarkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C5683E",
    marginBottom: -2
  },
  headlineLine: {
    lineHeight: 38
  },
  body: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: theme.ink[3],
    maxWidth: 320
  },
  buttons: {
    marginTop: 36,
    gap: 10
  },
  btn: {
    alignSelf: "stretch"
  },
  error: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.error
  },
  helper: {
    fontFamily: theme.font.sans,
    fontSize: 12,
    lineHeight: 17,
    color: theme.ink[4]
  },
  finePrint: {
    fontFamily: theme.font.sans,
    fontSize: 11,
    lineHeight: 16,
    color: theme.ink[4],
    marginTop: 20,
    maxWidth: 280
  }
});
