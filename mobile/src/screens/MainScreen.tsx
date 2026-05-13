/**
 * MainScreen — bottom tab shell. Drop-in replacement.
 * Props match the original exactly.
 */
import * as Haptics from "expo-haptics";
import { User } from "firebase/auth";
import { useState } from "react";
import { View } from "react-native";
import { CustomerInfo } from "react-native-purchases";

import { InspirationCard } from "../services/api";
import { ProjectContext } from "../services/projectContext";
import { theme } from "../theme";
import { TabBar } from "../ui";
import { LibraryScreen } from "./LibraryScreen";
import { ProfileScreen } from "./ProfileScreen";

type MainScreenProps = {
  customerInfo: CustomerInfo | null;
  firebaseUser: User;
  isPalletoProActive: boolean;
  onEditProject: () => void;
  onOpenCustomerCenter: () => void;
  onRestorePurchases: () => void;
  onScan: () => void;
  onSelectCard: (card: InspirationCard) => void;
  projectContext: ProjectContext | null;
};

type Tab = "library" | "profile";

export function MainScreen({
  customerInfo,
  firebaseUser,
  isPalletoProActive,
  onEditProject,
  onOpenCustomerCenter,
  onRestorePurchases,
  onScan,
  onSelectCard,
  projectContext
}: MainScreenProps) {
  const [activeTab, setActiveTab] = useState<Tab>("library");

  function selectTab(tab: Tab) {
    Haptics.selectionAsync();
    setActiveTab(tab);
  }

  function handleScan() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onScan();
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.palette.bone }}>
      <View style={{ flex: 1 }}>
        {activeTab === "library" ? (
          <LibraryScreen
            firebaseUser={firebaseUser}
            onEditProject={onEditProject}
            onScan={onScan}
            onSelectCard={onSelectCard}
            projectContext={projectContext}
          />
        ) : (
          <ProfileScreen
            customerInfo={customerInfo}
            firebaseUser={firebaseUser}
            isPalletoProActive={isPalletoProActive}
            onEditProject={onEditProject}
            onOpenCustomerCenter={onOpenCustomerCenter}
            onRestorePurchases={onRestorePurchases}
            projectContext={projectContext}
          />
        )}
      </View>

      <TabBar active={activeTab} onChange={selectTab} onScan={handleScan} />
    </View>
  );
}
