import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";

import { AuthScreen } from "./src/screens/AuthScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { SplashScreen } from "./src/screens/SplashScreen";
import { firebaseAuth } from "./src/services/firebase";
import {
  completeOnboarding,
  hasCompletedOnboarding,
  OnboardingSurveyAnswers
} from "./src/services/onboarding";
import { theme } from "./src/theme";

export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  Onboarding: undefined;
  Splash: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    card: theme.colors.background,
    text: theme.colors.textPrimary,
    primary: theme.colors.primary
  }
};

export default function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isOnboardingReady, setIsOnboardingReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setFirebaseUser(user);
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    async function loadOnboardingState() {
      const hasCompleted = await hasCompletedOnboarding();
      setOnboardingComplete(hasCompleted);
      setIsOnboardingReady(true);
    }

    loadOnboardingState();
  }, []);

  async function finishOnboarding(surveyAnswers: OnboardingSurveyAnswers) {
    await completeOnboarding(surveyAnswers);
    setOnboardingComplete(true);
  }

  const isLoading = !isAuthReady || !isOnboardingReady;

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false
        }}
      >
        {isLoading ? (
          <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        ) : !onboardingComplete ? (
          <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
            {() => <OnboardingScreen onComplete={finishOnboarding} />}
          </Stack.Screen>
        ) : firebaseUser ? (
          <Stack.Screen name="Home" options={{ title: "Palleto" }}>
            {() => <HomeScreen firebaseUser={firebaseUser} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ title: "Sign in" }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
