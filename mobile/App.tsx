import { Archivo_900Black } from "@expo-google-fonts/archivo";
import { CormorantGaramond_600SemiBold } from "@expo-google-fonts/cormorant-garamond";
import { IBMPlexMono_600SemiBold } from "@expo-google-fonts/ibm-plex-mono";
import { SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useFonts } from "expo-font";
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
import { QuickAccessScreen } from "./src/screens/QuickAccessScreen";
import { RefineCardScreen } from "./src/screens/RefineCardScreen";
import { SplashScreen } from "./src/screens/SplashScreen";
import {
  getActiveProject,
  InspirationCard,
  saveActiveProject,
  saveTasteProfile
} from "./src/services/api";
import { firebaseAuth } from "./src/services/firebase";
import {
  completeOnboarding,
  createEmptyOnboardingSurveyAnswers,
  getOnboardingSurveyAnswers,
  hasCompletedOnboarding,
  OnboardingSurveyAnswers
} from "./src/services/onboarding";
import {
  cacheProjectContext,
  getCachedProjectContext,
  ProjectContext,
  ProjectContextInput
} from "./src/services/projectContext";
import { theme } from "./src/theme";

export type RootStackParamList = {
  Auth: undefined;
  Capture: undefined;
  CardDetail: undefined;
  Home: undefined;
  Onboarding: undefined;
  Processing: undefined;
  ProjectIntake: undefined;
  QuickAccess: undefined;
  Refine: undefined;
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
  const [fontsLoaded] = useFonts({
    Archivo_900Black,
    CormorantGaramond_600SemiBold,
    IBMPlexMono_600SemiBold,
    SpaceGrotesk_700Bold
  });
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isOnboardingReady, setIsOnboardingReady] = useState(false);
  const [isProjectContextReady, setIsProjectContextReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingSurveyAnswers | null>(null);
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null);
  const [selectedCard, setSelectedCard] = useState<InspirationCard | null>(null);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [startupWarning, setStartupWarning] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setIsProjectContextReady(false);
      setFirebaseUser(user);
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    async function loadOnboardingState() {
      const hasCompleted = await hasCompletedOnboarding();
      const savedAnswers = await getOnboardingSurveyAnswers();
      setOnboardingAnswers(savedAnswers);
      setOnboardingComplete(hasCompleted);
      setIsOnboardingReady(true);
    }

    loadOnboardingState();
  }, []);

  useEffect(() => {
    async function syncTasteProfile() {
      if (!firebaseUser || !onboardingAnswers) {
        return;
      }

      try {
        const token = await firebaseUser.getIdToken();
        await saveTasteProfile(token, onboardingAnswers);
      } catch (error) {
        console.warn("Failed to sync onboarding taste profile", error);
      }
    }

    syncTasteProfile();
  }, [firebaseUser, onboardingAnswers]);

  useEffect(() => {
    async function loadProjectContext() {
      if (!firebaseUser) {
        setProjectContext(null);
        setIsProjectContextReady(true);
        void cacheProjectContext(null);
        return;
      }

      const cachedProject = await getCachedProjectContext();

      if (cachedProject) {
        setProjectContext(cachedProject);
        setIsProjectContextReady(true);
      }

      try {
        if (!cachedProject) {
          setIsProjectContextReady(false);
        }
        const token = await withTimeout(firebaseUser.getIdToken(), 8000);
        const activeProject = await withTimeout(getActiveProject(token), 8000);
        setProjectContext(activeProject);
        await cacheProjectContext(activeProject);
      } catch (error) {
        console.warn("Failed to refresh active project context", error);
        if (!cachedProject) {
          setProjectContext(null);
        }
      } finally {
        setIsProjectContextReady(true);
      }
    }

    loadProjectContext();
  }, [firebaseUser]);

  useEffect(() => {
    if (firebaseUser && projectContext && !onboardingComplete) {
      setOnboardingComplete(true);
    }
  }, [firebaseUser, onboardingComplete, projectContext]);

  async function finishOnboarding(surveyAnswers: OnboardingSurveyAnswers) {
    await completeOnboarding(surveyAnswers);
    setOnboardingAnswers(surveyAnswers);
    setOnboardingComplete(true);
  }

  async function skipOnboarding() {
    const emptyAnswers = createEmptyOnboardingSurveyAnswers();
    await completeOnboarding(emptyAnswers);
    setOnboardingAnswers(emptyAnswers);
    setOnboardingComplete(true);
  }

  async function handleSaveProject(project: ProjectContextInput) {
    if (!firebaseUser) {
      throw new Error("User must be signed in.");
    }

    const token = await firebaseUser.getIdToken();
    const savedProject = await saveActiveProject(token, project);
    setProjectContext(savedProject);
    await cacheProjectContext(savedProject);
    return savedProject;
  }

  const isLoading =
    !fontsLoaded ||
    !isAuthReady ||
    !isOnboardingReady ||
    !isProjectContextReady;

  const splashDetail = !fontsLoaded
    ? "Loading app shell..."
    : !isAuthReady
      ? "Checking sign-in state..."
      : !isOnboardingReady
        ? "Loading onboarding..."
        : !isProjectContextReady
          ? firebaseUser
            ? "Loading project context..."
            : "Preparing app..."
          : "Loading Palleto...";

  useEffect(() => {
    if (!isLoading) {
      setStartupWarning(null);
      return;
    }

    setStartupWarning(null);

    const timeout = setTimeout(() => {
      if (!fontsLoaded) {
        setStartupWarning("The app shell is taking longer than expected.");
        return;
      }

      if (!isAuthReady) {
        setStartupWarning("Still waiting on Firebase auth to restore your session.");
        return;
      }

      if (!isOnboardingReady) {
        setStartupWarning("Still loading local onboarding state.");
        return;
      }

      if (!isProjectContextReady) {
        setStartupWarning(
          firebaseUser
            ? "Still waiting on your project context. This usually means startup networking is stuck."
            : "Still preparing the app."
        );
      }
    }, 12000);

    return () => clearTimeout(timeout);
  }, [firebaseUser, fontsLoaded, isAuthReady, isLoading, isOnboardingReady, isProjectContextReady]);

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
          <Stack.Screen name="Splash" options={{ headerShown: false }}>
            {() => <SplashScreen detail={splashDetail} warning={startupWarning} />}
          </Stack.Screen>
        ) : !onboardingComplete && !projectContext ? (
          <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
            {() => <OnboardingScreen onComplete={finishOnboarding} onSkip={skipOnboarding} />}
          </Stack.Screen>
        ) : firebaseUser ? (
          projectContext ? (
            <Stack.Screen name="Home" options={{ title: "Palleto" }}>
              {({ navigation }) => (
                <MainScreen
                  firebaseUser={firebaseUser}
                  onEditProject={() => navigation.navigate("ProjectIntake")}
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
            <Stack.Screen name="ProjectIntake" options={{ headerShown: false }}>
              {({ navigation }) => (
                <ProjectIntakeScreen
                  initialValues={buildInitialProjectFromOnboarding(onboardingAnswers)}
                  onComplete={(project) => {
                    setProjectContext(project);
                    navigation.replace("Home");
                  }}
                  onSave={handleSaveProject}
                />
              )}
            </Stack.Screen>
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ title: "Sign in" }} />
        )}
        {firebaseUser && projectContext ? (
          <>
            <Stack.Screen name="Capture" options={{ title: "Capture" }}>
              {({ navigation }) => (
                <CaptureScreen
                  onOpenQuickAccess={() => navigation.navigate("QuickAccess")}
                  onImageSelected={(image) => {
                    setSelectedImage(image);
                    navigation.navigate("Processing");
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="QuickAccess" options={{ title: "Quick access" }}>
              {() => <QuickAccessScreen />}
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
                    onOpenQuickAccess={() => navigation.navigate("QuickAccess")}
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
                      firebaseUser={firebaseUser}
                      onDone={() => navigation.navigate("Home")}
                      onRefine={() => navigation.navigate("Refine")}
                      onViewLibrary={() => navigation.navigate("Home")}
                    />
                ) : (
                  <MainScreen
                    firebaseUser={firebaseUser}
                    onEditProject={() => navigation.navigate("ProjectIntake")}
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
              {({ navigation }) =>
                selectedCard ? (
                  <CardDetailScreen
                    card={selectedCard}
                    firebaseUser={firebaseUser}
                    onRefine={() => navigation.navigate("Refine")}
                    onDeleted={() => {
                      setSelectedCard(null);
                      navigation.navigate("Home");
                    }}
                  />
                ) : null
              }
            </Stack.Screen>
            <Stack.Screen name="Refine" options={{ title: "Refine with AI" }}>
              {() =>
                selectedCard ? (
                  <RefineCardScreen
                    card={selectedCard}
                    firebaseUser={firebaseUser}
                    onRefined={setSelectedCard}
                  />
                ) : null
              }
            </Stack.Screen>
          </>
        ) : null}
        {firebaseUser && projectContext ? (
          <Stack.Screen name="ProjectIntake" options={{ headerShown: false }}>
            {({ navigation }) => (
              <ProjectIntakeScreen
                initialProject={projectContext}
                initialValues={
                  projectContext ? undefined : buildInitialProjectFromOnboarding(onboardingAnswers)
                }
                onCancel={navigation.canGoBack() ? () => navigation.goBack() : undefined}
                onComplete={(project) => {
                  setProjectContext(project);

                  if (navigation.canGoBack()) {
                    navigation.goBack();
                    return;
                  }

                  navigation.replace("Home");
                }}
                onSave={handleSaveProject}
              />
            )}
          </Stack.Screen>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

function buildInitialProjectFromOnboarding(
  answers: OnboardingSurveyAnswers | null
): Partial<ProjectContextInput> | undefined {
  if (!answers) {
    return undefined;
  }

  const projectType = mapProjectType(answers.work_for?.[0] ?? "");
  const desiredFeeling = buildDesiredFeeling(answers);
  const avoid = answers.avoid?.join(", ") || null;

  return {
    avoid,
    desiredFeeling,
    directionTags: normalizeDirectionTags(answers.lean_toward ?? []),
    priorities: mapPriorities(answers.extract_from_reference ?? []),
    projectType,
  };
}

function normalizeDirectionTags(tags: string[]) {
  return tags.map((tag) => {
    if (tag === "Organic and hand-touched") {
      return "Organic";
    }

    if (tag === "Quiet luxury") {
      return "Luxury";
    }

    if (tag === "Editorial and cultured") {
      return "Editorial";
    }

    if (tag === "Raw and lived-in") {
      return "Experimental";
    }

    if (tag === "Technical and precise") {
      return "Technical";
    }

    if (tag === "Minimal and restrained") {
      return "Minimal";
    }

    return "Experimental";
  });
}

function mapProjectType(value: string) {
  if (value === "Campaign and art direction") {
    return "Campaign";
  }

  if (value === "Product or object design") {
    return "Product design";
  }

  if (value === "Interior or spatial direction") {
    return "Interior concept";
  }

  return value;
}

function mapPriorities(values: string[]) {
  return values.map((value) => {
    if (value === "Color systems") {
      return "Color systems";
    }

    if (value === "Texture and material language") {
      return "Materials";
    }

    if (value === "Typography direction") {
      return "Typography";
    }

    if (value === "Composition and framing") {
      return "Composition";
    }

    if (value === "Mood and emotional tone") {
      return "Mood";
    }

    return "Patterns";
  });
}

function buildDesiredFeeling(answers: OnboardingSurveyAnswers) {
  const useful = answers.useful_scan?.slice(0, 2).join(", ");
  const lean = answers.lean_toward?.slice(0, 2).join(", ");

  if (useful && lean) {
    return `${useful}. Lean toward ${lean}.`;
  }

  return useful || lean || null;
}
