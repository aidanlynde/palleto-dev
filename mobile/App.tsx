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
import { RefineCardScreen } from "./src/screens/RefineCardScreen";
import { SplashScreen } from "./src/screens/SplashScreen";
import { getActiveProject, InspirationCard, saveActiveProject } from "./src/services/api";
import { firebaseAuth } from "./src/services/firebase";
import {
  completeOnboarding,
  getOnboardingSurveyAnswers,
  hasCompletedOnboarding,
  OnboardingSurveyAnswers
} from "./src/services/onboarding";
import { ProjectContext, ProjectContextInput } from "./src/services/projectContext";
import { theme } from "./src/theme";

export type RootStackParamList = {
  Auth: undefined;
  Capture: undefined;
  CardDetail: undefined;
  Home: undefined;
  Onboarding: undefined;
  Processing: undefined;
  ProjectIntake: undefined;
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
      const savedAnswers = await getOnboardingSurveyAnswers();
      setOnboardingAnswers(savedAnswers);
      setOnboardingComplete(hasCompleted);
      setIsOnboardingReady(true);
    }

    loadOnboardingState();
  }, []);

  useEffect(() => {
    async function loadProjectContext() {
      if (!firebaseUser || !onboardingComplete) {
        setProjectContext(null);
        setIsProjectContextReady(true);
        return;
      }

      try {
        setIsProjectContextReady(false);
        const token = await firebaseUser.getIdToken();
        const activeProject = await getActiveProject(token);
        setProjectContext(activeProject);
      } finally {
        setIsProjectContextReady(true);
      }
    }

    loadProjectContext();
  }, [firebaseUser, onboardingComplete]);

  async function finishOnboarding(surveyAnswers: OnboardingSurveyAnswers) {
    await completeOnboarding(surveyAnswers);
    setOnboardingAnswers(surveyAnswers);
    setOnboardingComplete(true);
  }

  async function handleSaveProject(project: ProjectContextInput) {
    if (!firebaseUser) {
      throw new Error("User must be signed in.");
    }

    const token = await firebaseUser.getIdToken();
    const savedProject = await saveActiveProject(token, project);
    setProjectContext(savedProject);
    return savedProject;
  }

  const isLoading = !fontsLoaded || !isAuthReady || !isOnboardingReady || !isProjectContextReady;

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
            {() => (
              <ProjectIntakeScreen
                initialValues={buildInitialProjectFromOnboarding(onboardingAnswers)}
                onComplete={setProjectContext}
                onSave={handleSaveProject}
              />
            )}
          </Stack.Screen>
        ) : firebaseUser ? (
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
            <Stack.Screen name="ProjectIntake" options={{ headerShown: false }}>
              {({ navigation }) => (
                <ProjectIntakeScreen
                  initialProject={projectContext}
                  onCancel={() => navigation.goBack()}
                  onComplete={(project) => {
                    setProjectContext(project);
                    navigation.goBack();
                  }}
                  onSave={handleSaveProject}
                />
              )}
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function buildInitialProjectFromOnboarding(
  answers: OnboardingSurveyAnswers | null
): Partial<ProjectContextInput> | undefined {
  if (!answers) {
    return undefined;
  }

  const projectType = answers.help_with?.[0] ?? "";
  const desiredFeeling = answers.must_feel_like?.join(", ") || null;
  const avoid = answers.must_not_feel_like?.join(", ") || null;

  return {
    avoid,
    desiredFeeling,
    directionTags: normalizeDirectionTags(answers.must_feel_like ?? []),
    priorities: answers.looking_for ?? [],
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

    return "Experimental";
  });
}
