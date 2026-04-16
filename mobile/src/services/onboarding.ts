import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETE_KEY = "palleto:onboarding-complete";
const ONBOARDING_SURVEY_KEY = "palleto:onboarding-survey";

export type OnboardingSurveyAnswers = Record<string, string[]>;

export async function hasCompletedOnboarding() {
  return (await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY)) === "true";
}

export async function completeOnboarding(surveyAnswers: OnboardingSurveyAnswers) {
  await AsyncStorage.multiSet([
    [ONBOARDING_COMPLETE_KEY, "true"],
    [ONBOARDING_SURVEY_KEY, JSON.stringify(surveyAnswers)]
  ]);
}
