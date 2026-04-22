import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETE_KEY = "palleto:onboarding-complete";
const ONBOARDING_SURVEY_KEY = "palleto:onboarding-survey";

export type OnboardingSurveyAnswers = {
  avoid: string[];
  extract_from_reference: string[];
  lean_toward: string[];
  useful_scan: string[];
  work_for: string[];
};

export function createEmptyOnboardingSurveyAnswers(): OnboardingSurveyAnswers {
  return {
    avoid: [],
    extract_from_reference: [],
    lean_toward: [],
    useful_scan: [],
    work_for: [],
  };
}

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
