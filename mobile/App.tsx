import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic
} from "@expo-google-fonts/instrument-serif";
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold
} from "@expo-google-fonts/inter-tight";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium
} from "@expo-google-fonts/jetbrains-mono";
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useFonts } from "expo-font";
import * as ExpoSplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { CustomerInfo } from "react-native-purchases";

import { AuthScreen } from "./src/screens/AuthScreen";
import { CaptureScreen } from "./src/screens/CaptureScreen";
import { CardDetailScreen, CardResultScreen } from "./src/screens/CardResultScreen";
import { PaywallScreen } from "./src/screens/PaywallScreen";
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
import { identifyUser, trackEvent } from "./src/services/analytics";
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
import {
  configureRevenueCat,
  hasPalletoPro,
  identifyRevenueCatUser,
  presentRevenueCatCustomerCenter,
  restoreRevenueCatPurchases,
  subscribeToCustomerInfo
} from "./src/services/revenueCat";
import { theme } from "./src/theme";

// Keep native splash visible until we manually dismiss it
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

export type RootStackParamList = {
  Auth: undefined;
  Capture: undefined;
  CardDetail: undefined;
  Home: undefined;
  LockedFeature: undefined;
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

type LockedFeatureIntent = "refine" | "save" | "share";
type PendingAuthDestination = "landing" | LockedFeatureIntent;

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

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
    InstrumentSerif_400Regular,
    InstrumentSerif_400Italic: InstrumentSerif_400Regular_Italic,
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium
  });
  const [minSplashDone, setMinSplashDone] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isOnboardingReady, setIsOnboardingReady] = useState(false);
  const [isProjectContextReady, setIsProjectContextReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingSurveyAnswers | null>(null);
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null);
  const [selectedCard, setSelectedCard] = useState<InspirationCard | null>(null);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [guestScanStarted, setGuestScanStarted] = useState(false);
  const [lockedFeatureIntent, setLockedFeatureIntent] = useState<LockedFeatureIntent>("refine");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [authRequestedFromLanding, setAuthRequestedFromLanding] = useState(false);
  const [pendingAuthDestination, setPendingAuthDestination] = useState<PendingAuthDestination | null>(null);
  const [revenueCatUserId, setRevenueCatUserId] = useState<string | null>(null);
  const [pendingPaywallUserKey, setPendingPaywallUserKey] = useState<string | null>(null);
  const [pendingInitialScan, setPendingInitialScan] = useState(false);
  const [startupWarning, setStartupWarning] = useState<string | null>(null);
  const isPalletoProActive = Boolean(
    firebaseUser && revenueCatUserId === firebaseUser.uid && hasPalletoPro(customerInfo)
  );

  useEffect(() => {
    // Fade out native splash once RN has rendered (they look identical, so it's seamless)
    const nativeHideTimer = setTimeout(() => {
      ExpoSplashScreen.hideAsync().catch(() => {});
    }, 200);

    // Minimum splash display time so the dot animation plays
    const minTimer = setTimeout(() => {
      setMinSplashDone(true);
    }, 2200);

    return () => {
      clearTimeout(nativeHideTimer);
      clearTimeout(minTimer);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setFirebaseUser(user);
      identifyUser(user?.uid ?? null);
      trackEvent(user ? "auth_session_restored" : "auth_session_empty");
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let isMounted = true;

    configureRevenueCat()
      .then((nextCustomerInfo) => {
        if (isMounted && nextCustomerInfo) {
          setCustomerInfo(nextCustomerInfo);
        }
      })
      .catch((error) => {
        console.warn("Failed to configure RevenueCat", error);
      });

    const unsubscribe = subscribeToCustomerInfo((nextCustomerInfo) => {
      setCustomerInfo(nextCustomerInfo);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    identifyRevenueCatUser(firebaseUser?.uid ?? null)
      .then((nextCustomerInfo) => {
        if (nextCustomerInfo) {
          setCustomerInfo(nextCustomerInfo);
        }
        setRevenueCatUserId(firebaseUser?.uid ?? null);
      })
      .catch((error) => {
        console.warn("Failed to identify RevenueCat user", error);
      });
  }, [firebaseUser, isAuthReady]);

  useEffect(() => {
    if (!firebaseUser) {
      setPendingPaywallUserKey(null);
      return;
    }

    if (!pendingAuthDestination || revenueCatUserId !== firebaseUser.uid) {
      return;
    }

    if (isPalletoProActive) {
      completePendingAuthDestination(pendingAuthDestination);
      return;
    }

    const nextPaywallUserKey = `${firebaseUser.uid}:${pendingAuthDestination}`;
    if (pendingPaywallUserKey === nextPaywallUserKey) {
      return;
    }

    setPendingPaywallUserKey(nextPaywallUserKey);
    openPaywallAfterAuth(pendingAuthDestination);
  }, [
    customerInfo,
    firebaseUser,
    isPalletoProActive,
    pendingAuthDestination,
    pendingPaywallUserKey,
    revenueCatUserId
  ]);

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
    if (isAuthReady && !firebaseUser) {
      setIsProjectContextReady(true);
    }
  }, [firebaseUser, isAuthReady]);

  useEffect(() => {
    if (firebaseUser && projectContext && !onboardingComplete) {
      setOnboardingComplete(true);
    }
  }, [firebaseUser, onboardingComplete, projectContext]);

  async function finishOnboarding(surveyAnswers: OnboardingSurveyAnswers) {
    await completeOnboarding(surveyAnswers);
    trackEvent("onboarding_completed", {
      avoid_count: surveyAnswers.avoid.length,
      extract_count: surveyAnswers.extract_from_reference.length,
      lean_count: surveyAnswers.lean_toward.length,
      useful_count: surveyAnswers.useful_scan.length,
      work_for_count: surveyAnswers.work_for.length
    });
    setOnboardingAnswers(surveyAnswers);
    setOnboardingComplete(true);
  }

  async function skipOnboarding() {
    const emptyAnswers = createEmptyOnboardingSurveyAnswers();
    await completeOnboarding(emptyAnswers);
    trackEvent("onboarding_skipped");
    setOnboardingAnswers(emptyAnswers);
    setOnboardingComplete(true);
  }

  async function startFirstScanOnboarding() {
    trackEvent("onboarding_first_scan_requested");
    setGuestScanStarted(true);
    setPendingInitialScan(true);
  }

  function startLandingSignIn() {
    trackEvent("landing_existing_account_clicked");
    setPendingAuthDestination("landing");
    setAuthRequestedFromLanding(true);
  }

  function openLockedFeature(feature: LockedFeatureIntent, source: string) {
    if (!selectedCard) {
      return;
    }

    setLockedFeatureIntent(feature);
    trackEvent("locked_feature_viewed", {
      card_id: selectedCard.id,
      feature,
      source
    });

    navigationRef.navigate("LockedFeature");
  }

  async function handleLockedFeatureContinue(navigate: (screen: keyof RootStackParamList) => void) {
    if (!firebaseUser) {
      setPendingAuthDestination(lockedFeatureIntent);
      setAuthRequestedFromLanding(true);
      trackEvent("locked_feature_auth_required", {
        card_id: selectedCard?.id,
        feature: lockedFeatureIntent
      });
      navigate("Auth");
      return;
    }

    // Called after a successful purchase inside PaywallScreen.
    // If we arrived here via a post-auth flow, delegate to the pending destination handler
    // (which handles "landing" onboarding completion and other cleanup).
    if (pendingAuthDestination) {
      completePendingAuthDestination(pendingAuthDestination);
      return;
    }

    if (!selectedCard) {
      navigate("Home");
      return;
    }

    if (selectedCard.id.startsWith("preview-")) {
      navigate("Onboarding");
      return;
    }

    if (lockedFeatureIntent === "refine") {
      navigate("Refine");
      return;
    }

    navigate("Home");
  }

  function openPaywallAfterAuth(destination: PendingAuthDestination) {
    const paywallFeature: LockedFeatureIntent = destination === "landing" ? "save" : destination;
    setLockedFeatureIntent(paywallFeature);
    navigationRef.navigate("LockedFeature");
  }

  async function completePendingAuthDestination(destination: PendingAuthDestination) {
    setPendingAuthDestination(null);
    setPendingPaywallUserKey(null);
    setAuthRequestedFromLanding(false);

    if (destination === "landing") {
      const emptyAnswers = createEmptyOnboardingSurveyAnswers();
      await completeOnboarding(emptyAnswers);
      setOnboardingAnswers(emptyAnswers);
      setOnboardingComplete(true);
      trackEvent("landing_auth_unlocked");
      return;
    }

    if (!selectedCard || selectedCard.id.startsWith("preview-")) {
      return;
    }

    if (destination === "refine") {
      navigationRef.navigate("Refine");
      return;
    }

    navigationRef.navigate("Home");
  }

  async function handleRestorePurchases() {
    try {
      const restoredCustomerInfo = await restoreRevenueCatPurchases();
      setCustomerInfo(restoredCustomerInfo);
      Alert.alert(
        hasPalletoPro(restoredCustomerInfo) ? "Purchases restored" : "No active purchase found",
        hasPalletoPro(restoredCustomerInfo)
          ? "Palleto Pro is active on this account."
          : "RevenueCat did not find an active Palleto Pro entitlement."
      );
    } catch (error) {
      console.warn("RevenueCat restore failed", error);
      Alert.alert("Restore failed", "Try again in a moment.");
    }
  }

  async function handleOpenCustomerCenter() {
    try {
      await presentRevenueCatCustomerCenter();
    } catch (error) {
      console.warn("RevenueCat Customer Center failed", error);
      Alert.alert("Manage purchases unavailable", "Try again in a moment.");
    }
  }

  async function handleSaveProject(project: ProjectContextInput) {
    if (!firebaseUser) {
      throw new Error("User must be signed in.");
    }

    const token = await firebaseUser.getIdToken();
    const savedProject = await saveActiveProject(token, project);
    trackEvent("project_context_saved", {
      has_audience: Boolean(project.audience),
      has_desired_feeling: Boolean(project.desiredFeeling),
      priority_count: project.priorities.length,
      reference_image_count: project.referenceImages.length,
      reference_link_count: project.referenceLinks.length
    });
    setProjectContext(savedProject);
    await cacheProjectContext(savedProject);
    return savedProject;
  }

  const isLoading =
    !fontsLoaded ||
    !isAuthReady ||
    !isOnboardingReady ||
    !isProjectContextReady ||
    !minSplashDone;

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
          : undefined;

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

  useEffect(() => {
    if (!pendingInitialScan || isLoading || !navigationRef.isReady()) {
      return;
    }

    setPendingInitialScan(false);
    trackEvent("initial_scan_auto_opened");
    setTimeout(() => {
      navigationRef.reset({
        index: 0,
        routes: [{ name: "Capture" }]
      });
    }, 0);
  }, [isLoading, pendingInitialScan]);

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false
        }}
      >
        {isLoading ? (
          <Stack.Screen name="Splash" options={{ headerShown: false, animation: "fade", animationDuration: 500 }}>
            {() => <SplashScreen detail={splashDetail} warning={startupWarning} />}
          </Stack.Screen>
        ) : authRequestedFromLanding && !firebaseUser ? (
          <Stack.Screen name="Auth" options={{ headerShown: false }}>
            {() => (
              <AuthScreen
                onBack={() => {
                  setAuthRequestedFromLanding(false);
                  setPendingAuthDestination(null);
                }}
              />
            )}
          </Stack.Screen>
        ) : firebaseUser && guestScanStarted && !onboardingComplete && !projectContext ? (
          <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
            {() => (
              <OnboardingScreen
                initialStep={4}
                onComplete={(answers) => {
                  setGuestScanStarted(false);
                  finishOnboarding(answers);
                }}
                onSkip={() => {
                  setGuestScanStarted(false);
                  skipOnboarding();
                }}
              />
            )}
          </Stack.Screen>
        ) : !onboardingComplete && !projectContext && !guestScanStarted ? (
          <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
            {() => (
              <OnboardingScreen
                onComplete={finishOnboarding}
                onSignInPress={startLandingSignIn}
                onStartFirstScan={startFirstScanOnboarding}
              />
            )}
          </Stack.Screen>
        ) : firebaseUser ? (
          <Stack.Screen name="Home" options={{ title: "Palleto" }}>
            {({ navigation }) => (
              <MainScreen
                customerInfo={customerInfo}
                firebaseUser={firebaseUser}
                isPalletoProActive={isPalletoProActive}
                onEditProject={() => navigation.navigate("ProjectIntake")}
                onOpenCustomerCenter={handleOpenCustomerCenter}
                onRestorePurchases={handleRestorePurchases}
                onScan={() => {
                  trackEvent("capture_opened", { source: "home_scan_button" });
                  navigation.navigate("Capture");
                }}
                onSelectCard={(card) => {
                  trackEvent("card_opened", { card_id: card.id, source: "library" });
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
        {onboardingComplete || projectContext || guestScanStarted ? (
          <>
            <Stack.Screen
              name="Capture"
              options={{
                title: "Capture",
                gestureEnabled: Boolean(firebaseUser),
                headerBackVisible: Boolean(firebaseUser)
              }}
            >
              {({ navigation }) => (
                <CaptureScreen
                  onOpenQuickAccess={() => navigation.navigate("QuickAccess")}
                  onImageSelected={(image) => {
                    trackEvent("create_started", { source_type: image.sourceType });
                    setSelectedImage(image);
                    navigation.navigate("Processing");
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="QuickAccess" options={{ title: "Quick access" }}>
              {() => <QuickAccessScreen />}
            </Stack.Screen>
            <Stack.Screen
              name="Processing"
              options={{
                gestureEnabled: Boolean(firebaseUser),
                headerShown: false
              }}
            >
              {({ navigation }) =>
                selectedImage ? (
                  <ProcessingScreen
                    firebaseUser={firebaseUser}
                    imageUri={selectedImage.uri}
                    mimeType={selectedImage.mimeType}
                    onCardCreated={(card) => {
                      const isPreviewCard = !firebaseUser || card.id.startsWith("preview-");
                      trackEvent("create_completed", {
                        card_id: card.id,
                        palette_count: card.palette.length,
                        source_type: selectedImage.sourceType
                      });
                      setSelectedCard(card);
                      if (isPreviewCard) {
                        navigation.reset({
                          index: 0,
                          routes: [{ name: "Result" }]
                        });
                        return;
                      }

                      navigation.replace("Result");
                    }}
                    onRetry={() => {
                      if (!firebaseUser) {
                        navigation.reset({
                          index: 0,
                          routes: [{ name: "Capture" }]
                        });
                        return;
                      }

                      navigation.replace("Capture");
                    }}
                    projectContext={projectContext}
                    sourceType={selectedImage.sourceType}
                  />
                ) : (
                  <CaptureScreen
                    onOpenQuickAccess={() => navigation.navigate("QuickAccess")}
                    onImageSelected={(image) => {
                      trackEvent("create_started", { source_type: image.sourceType });
                      setSelectedImage(image);
                      navigation.replace("Processing");
                    }}
                  />
                )
              }
            </Stack.Screen>
            <Stack.Screen
              name="Result"
              options={{
                title: "Inspiration card",
                gestureEnabled: Boolean(firebaseUser),
                headerBackVisible: Boolean(firebaseUser)
              }}
            >
              {({ navigation }) =>
                selectedCard ? (
                    <CardResultScreen
                      card={selectedCard}
                      firebaseUser={firebaseUser}
                      isPalletoProActive={isPalletoProActive}
                      isPreview={!firebaseUser || selectedCard.id.startsWith("preview-")}
                      onDone={() => navigation.navigate(firebaseUser ? "Home" : "Auth")}
                      onLockedAction={(feature) => openLockedFeature(feature, "preview_result")}
                      onRefine={() => {
                        if (isPalletoProActive) {
                          navigation.navigate("Refine");
                          return;
                        }

                        openLockedFeature("refine", "result");
                      }}
                      onViewLibrary={() => navigation.navigate(firebaseUser ? "Home" : "Auth")}
                    />
                ) : (
                  <CaptureScreen
                    onOpenQuickAccess={() => navigation.navigate("QuickAccess")}
                    onImageSelected={(image) => {
                      trackEvent("create_started", { source_type: image.sourceType });
                      setSelectedImage(image);
                      navigation.replace("Processing");
                    }}
                  />
                )
              }
            </Stack.Screen>
            {firebaseUser ? (
              <>
                <Stack.Screen name="CardDetail" options={{ title: "Card" }}>
                  {({ navigation }) =>
                    selectedCard ? (
                      <CardDetailScreen
                        card={selectedCard}
                        firebaseUser={firebaseUser}
                        isPalletoProActive={isPalletoProActive}
                        onLockedAction={(feature) => openLockedFeature(feature, "card_detail")}
                        onRefine={() => {
                          navigation.navigate("Refine");
                        }}
                        onDeleted={() => {
                          trackEvent("card_deleted", { card_id: selectedCard.id });
                          setSelectedCard(null);
                          navigation.navigate("Home");
                        }}
                        onBack={() => navigation.goBack()}
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
            <Stack.Screen
              name="LockedFeature"
              options={{ headerShown: false }}
            >
              {({ navigation }) => (
                <PaywallScreen
                  feature={lockedFeatureIntent}
                  onContinue={() => handleLockedFeatureContinue(navigation.navigate)}
                  onClose={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
          </>
        ) : null}
        {firebaseUser ? (
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
