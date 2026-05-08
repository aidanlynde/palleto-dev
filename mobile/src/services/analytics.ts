import { getAnalytics, logEvent, setUserId } from "@react-native-firebase/analytics";

type AnalyticsValue = boolean | number | string | null | undefined;
type AnalyticsParams = Record<string, AnalyticsValue>;

const analytics = getAnalytics();

export function trackEvent(name: string, params: AnalyticsParams = {}) {
  const normalizedName = normalizeEventName(name);
  const normalizedParams = normalizeParams(params);

  void logEvent(analytics, normalizedName, normalizedParams).catch((error) => {
    if (__DEV__) {
      console.warn("Analytics event failed", normalizedName, error);
    }
  });
}

export function identifyUser(userId: string | null) {
  void setUserId(analytics, userId).catch((error) => {
    if (__DEV__) {
      console.warn("Analytics identify failed", error);
    }
  });
}

function normalizeEventName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function normalizeParams(params: AnalyticsParams) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [normalizeParamName(key), value])
  );
}

function normalizeParamName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}
