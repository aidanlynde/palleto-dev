import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETE_KEY = "palleto:onboarding-complete";
const ONBOARDING_SURVEY_KEY = "palleto:onboarding-survey";

export type OnboardingSurveyAnswers = {
  help_with: string[];
  looking_for: string[];
  must_not_feel_like: string[];
  must_feel_like: string[];
};

export async function hasCompletedOnboarding() {
  return (await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY)) === "true";
}

export async function completeOnboarding(surveyAnswers: OnboardingSurveyAnswers) {
  await AsyncStorage.multiSet([
    [ONBOARDING_COMPLETE_KEY, "true"],
    [ONBOARDING_SURVEY_KEY, JSON.stringify(surveyAnswers)]
  ]);
}

export async function getOnboardingSurveyAnswers(): Promise<OnboardingSurveyAnswers | null> {
  const rawSurvey = await AsyncStorage.getItem(ONBOARDING_SURVEY_KEY);

  if (!rawSurvey) {
    return null;
  }

  return JSON.parse(rawSurvey) as OnboardingSurveyAnswers;
}
