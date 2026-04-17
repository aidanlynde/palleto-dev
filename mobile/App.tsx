import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";

import { AuthScreen } from "./src/screens/AuthScreen";
import { CaptureScreen } from "./src/screens/CaptureScreen";
import { CardDetailScreen, CardResultScreen } from "./src/screens/CardResultScreen";
import { MainScreen } from "./src/screens/MainScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { ProcessingScreen } from "./src/screens/ProcessingScreen";
import { ProjectIntakeScreen } from "./src/screens/ProjectIntakeScreen";
import { SplashScreen } from "./src/screens/SplashScreen";
import { InspirationCard } from "./src/services/api";
import { firebaseAuth } from "./src/services/firebase";
import {
  completeOnboarding,
  hasCompletedOnboarding,
  OnboardingSurveyAnswers
} from "./src/services/onboarding";
import { getActiveProjectContext, ProjectContext } from "./src/services/projectContext";
import { theme } from "./src/theme";

export type RootStackParamList = {
  Auth: undefined;
  Capture: undefined;
  CardDetail: undefined;
  Home: undefined;
  Onboarding: undefined;
  Processing: undefined;
  ProjectIntake: undefined;
  Result: undefined;
  Splash: undefined;
};

type SelectedImage = {
  mimeType?: string | null;
  sourceType: "camera" | "library";
  uri: string;
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
  const [isProjectContextReady, setIsProjectContextReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null);
  const [selectedCard, setSelectedCard] = useState<InspirationCard | null>(null);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);

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

  useEffect(() => {
    async function loadProjectContext() {
      const activeProject = await getActiveProjectContext();
      setProjectContext(activeProject);
      setIsProjectContextReady(true);
    }

    loadProjectContext();
  }, []);

  async function finishOnboarding(surveyAnswers: OnboardingSurveyAnswers) {
    await completeOnboarding(surveyAnswers);
    setOnboardingComplete(true);
  }

  const isLoading = !isAuthReady || !isOnboardingReady || !isProjectContextReady;

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
        ) : firebaseUser && !projectContext ? (
          <Stack.Screen name="ProjectIntake" options={{ headerShown: false }}>
            {() => <ProjectIntakeScreen onComplete={setProjectContext} />}
          </Stack.Screen>
        ) : firebaseUser ? (
          <Stack.Screen name="Home" options={{ title: "Palleto" }}>
            {({ navigation }) => (
              <MainScreen
                firebaseUser={firebaseUser}
                onEditProject={() => setProjectContext(null)}
                onScan={() => navigation.navigate("Capture")}
                onSelectCard={(card) => {
                  setSelectedCard(card);
                  navigation.navigate("CardDetail");
                }}
                projectContext={projectContext}
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ title: "Sign in" }} />
        )}
        {firebaseUser && projectContext ? (
          <>
            <Stack.Screen name="Capture" options={{ title: "Capture" }}>
              {({ navigation }) => (
                <CaptureScreen
                  onImageSelected={(image) => {
                    setSelectedImage(image);
                    navigation.navigate("Processing");
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Processing" options={{ headerShown: false }}>
              {({ navigation }) =>
                selectedImage ? (
                  <ProcessingScreen
                    firebaseUser={firebaseUser}
                    imageUri={selectedImage.uri}
                    mimeType={selectedImage.mimeType}
                    onCardCreated={(card) => {
                      setSelectedCard(card);
                      navigation.replace("Result");
                    }}
                    onRetry={() => navigation.replace("Capture")}
                    projectContext={projectContext}
                    sourceType={selectedImage.sourceType}
                  />
                ) : (
                  <CaptureScreen
                    onImageSelected={(image) => {
                      setSelectedImage(image);
                      navigation.replace("Processing");
                    }}
                  />
                )
              }
            </Stack.Screen>
            <Stack.Screen name="Result" options={{ title: "Inspiration card" }}>
              {({ navigation }) =>
                selectedCard ? (
                    <CardResultScreen
                      card={selectedCard}
                      onDone={() => navigation.navigate("Home")}
                      onViewLibrary={() => navigation.navigate("Home")}
                    />
                ) : (
                  <MainScreen
                    firebaseUser={firebaseUser}
                    onEditProject={() => setProjectContext(null)}
                    onScan={() => navigation.navigate("Capture")}
                    onSelectCard={(card) => {
                      setSelectedCard(card);
                      navigation.navigate("CardDetail");
                    }}
                    projectContext={projectContext}
                  />
                )
              }
            </Stack.Screen>
            <Stack.Screen name="CardDetail" options={{ title: "Card" }}>
              {() => (selectedCard ? <CardDetailScreen card={selectedCard} /> : null)}
            </Stack.Screen>
          </>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
