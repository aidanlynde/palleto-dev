import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesPackage
} from "react-native-purchases";
import RevenueCatUI, { CustomVariableValue, PAYWALL_RESULT } from "react-native-purchases-ui";

export const REVENUECAT_API_KEY = "appl_JkdnqsqxmLkGZZEWUueTGywEISa";
export const PALLETO_PRO_ENTITLEMENT_ID = "Palleto Pro";
export const LIFETIME_PRODUCT_ID = "lifetime_founding_sub";

let isConfigured = false;
let identifiedAppUserId: string | null = null;

export type PaywallFeature = "refine" | "save" | "share";

export type PaywallOutcome = {
  customerInfo: CustomerInfo | null;
  result: PAYWALL_RESULT | "already_active" | "unavailable";
  unlocked: boolean;
};

export async function configureRevenueCat(): Promise<CustomerInfo | null> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return null;
  }

  if (!isConfigured) {
    await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    isConfigured = true;
  }

  return getCustomerInfo();
}

export async function identifyRevenueCatUser(appUserId: string | null): Promise<CustomerInfo | null> {
  await configureRevenueCat();

  if (!isConfigured) {
    return null;
  }

  if (!appUserId) {
    if (!identifiedAppUserId) {
      return getCustomerInfo();
    }

    identifiedAppUserId = null;
    return Purchases.logOut();
  }

  if (identifiedAppUserId === appUserId) {
    return getCustomerInfo();
  }

  const result = await Purchases.logIn(appUserId);
  identifiedAppUserId = appUserId;
  return result.customerInfo;
}

export function subscribeToCustomerInfo(
  onCustomerInfoUpdated: (customerInfo: CustomerInfo) => void
): () => void {
  Purchases.addCustomerInfoUpdateListener(onCustomerInfoUpdated);

  return () => {
    Purchases.removeCustomerInfoUpdateListener(onCustomerInfoUpdated);
  };
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isConfigured) {
    return null;
  }

  return Purchases.getCustomerInfo();
}

export function hasPalletoPro(customerInfo: CustomerInfo | null): boolean {
  return Boolean(customerInfo?.entitlements.active[PALLETO_PRO_ENTITLEMENT_ID]);
}

export async function presentPalletoProPaywall(feature: PaywallFeature): Promise<PaywallOutcome> {
  await configureRevenueCat();

  if (!isConfigured) {
    return { customerInfo: null, result: "unavailable", unlocked: false };
  }

  const beforePaywall = await Purchases.getCustomerInfo();
  if (hasPalletoPro(beforePaywall)) {
    return { customerInfo: beforePaywall, result: "already_active", unlocked: true };
  }

  const result = await RevenueCatUI.presentPaywallIfNeeded({
    customVariables: {
      feature: CustomVariableValue.string(feature),
      product_id: CustomVariableValue.string(LIFETIME_PRODUCT_ID)
    },
    displayCloseButton: true,
    requiredEntitlementIdentifier: PALLETO_PRO_ENTITLEMENT_ID
  });
  const customerInfo = await Purchases.getCustomerInfo();

  return {
    customerInfo,
    result,
    unlocked:
      hasPalletoPro(customerInfo) ||
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED
  };
}

export async function restoreRevenueCatPurchases(): Promise<CustomerInfo> {
  await configureRevenueCat();
  return Purchases.restorePurchases();
}

export async function presentRevenueCatCustomerCenter(): Promise<void> {
  await configureRevenueCat();
  await RevenueCatUI.presentCustomerCenter();
}

export async function getLifetimePackage(): Promise<PurchasesPackage | null> {
  await configureRevenueCat();

  if (!isConfigured) {
    return null;
  }

  const offerings = await Purchases.getOfferings();
  const currentOffering = offerings.current;
  if (!currentOffering) {
    return null;
  }

  return (
    currentOffering.lifetime ??
    currentOffering.availablePackages.find(
      (availablePackage) => availablePackage.product.identifier === LIFETIME_PRODUCT_ID
    ) ??
    null
  );
}

export async function purchaseLifetimePackage(): Promise<CustomerInfo> {
  const lifetimePackage = await getLifetimePackage();
  if (!lifetimePackage) {
    throw new Error("RevenueCat lifetime package is not configured.");
  }

  const purchaseResult = await Purchases.purchasePackage(lifetimePackage);
  return purchaseResult.customerInfo;
}
