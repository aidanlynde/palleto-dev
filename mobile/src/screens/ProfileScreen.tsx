import { signOut, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { CustomerInfo } from "react-native-purchases";

import { getMe, UserProfile } from "../services/api";
import { firebaseAuth } from "../services/firebase";
import { ProjectContext } from "../services/projectContext";
import { theme } from "../theme";
import {
  Body,
  Button,
  Chip,
  Display,
  DisplayItalic,
  Headline,
  Meta,
  Pill,
  ScrollScreen,
  SectionCard
} from "../ui";

type ProfileScreenProps = {
  customerInfo: CustomerInfo | null;
  firebaseUser: User;
  isPalletoProActive: boolean;
  onEditProject: () => void;
  onOpenCustomerCenter: () => void;
  onRestorePurchases: () => void;
  projectContext: ProjectContext | null;
};

export function ProfileScreen({
  customerInfo,
  firebaseUser,
  isPalletoProActive,
  onEditProject,
  onOpenCustomerCenter,
  onRestorePurchases,
  projectContext
}: ProfileScreenProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [statusText, setStatusText] = useState("Syncing…");

  useEffect(() => {
    let isMounted = true;

    async function syncProfile() {
      try {
        const token = await firebaseUser.getIdToken();
        const syncedProfile = await getMe(token);
        if (isMounted) {
          setProfile(syncedProfile);
          setStatusText("Synced");
        }
      } catch {
        if (isMounted) setStatusText("Sync failed");
      }
    }

    syncProfile();
    return () => { isMounted = false; };
  }, [firebaseUser]);

  const tags = projectContext
    ? [projectContext.projectType, ...projectContext.directionTags].filter(Boolean)
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.palette.bone }}>
      <ScrollScreen contentContainerStyle={{ paddingTop: 24 }}>

        {/* ── Header ───────────────────────────────────── */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
          <View style={{ flex: 1 }}>
            <Meta style={{ marginBottom: 6 }}>ACCOUNT · PROFILE</Meta>
            <Display size={56}>Profile</Display>
          </View>
          <DisplayItalic size={22} color={theme.ink[3]} style={{ paddingBottom: 8 }}>
            no.2
          </DisplayItalic>
        </View>

        {/* ── Active project ────────────────────────────── */}
        <SectionCard eyebrow="ACTIVE PROJECT" style={{ marginBottom: 12 }}>
          <Display size={22} style={{ marginTop: 4, marginBottom: 8 }}>
            {projectContext?.name ?? "No project yet"}
          </Display>

          {projectContext ? (
            <>
              {projectContext.description ? (
                <Body style={{ marginBottom: 10 }}>{projectContext.description}</Body>
              ) : null}

              {projectContext.desiredFeeling ? (
                <Body color={theme.ink[3]} style={{ marginBottom: 4 }}>
                  Feel: {projectContext.desiredFeeling}
                </Body>
              ) : null}

              {projectContext.audience ? (
                <Body color={theme.ink[3]} style={{ marginBottom: 12 }}>
                  Audience: {projectContext.audience}
                </Body>
              ) : (
                <View style={{ marginBottom: 12 }} />
              )}

              {tags.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {tags.map((tag) => <Chip key={tag}>{tag}</Chip>)}
                </View>
              ) : null}
            </>
          ) : (
            <Body color={theme.ink[3]} style={{ marginBottom: 16 }}>
              Add a project to make future scans more specific to what you're building.
            </Body>
          )}

          <Pill onPress={onEditProject}>
            {projectContext ? "Edit project" : "Add project context"}
          </Pill>
        </SectionCard>

        {/* ── Palleto Pro ───────────────────────────────── */}
        <SectionCard eyebrow="PALLETO PRO" style={{ marginBottom: 12 }}>
          <Display size={22} style={{ marginTop: 4, marginBottom: 8 }}>
            {isPalletoProActive ? "Unlocked" : "Not unlocked"}
          </Display>

          <Body color={theme.ink[3]} style={{ marginBottom: 16 }}>
            {isPalletoProActive
              ? "You have full access to all Palleto Pro features."
              : "Unlock Palleto Pro to use refine, save, and share."}
          </Body>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pill onPress={onRestorePurchases}>Restore purchases</Pill>
            <Pill onPress={onOpenCustomerCenter}>Manage</Pill>
          </View>
        </SectionCard>

        {/* ── Account ───────────────────────────────────── */}
        <SectionCard eyebrow="SIGNED IN AS" style={{ marginBottom: 32 }}>
          <Headline style={{ marginTop: 4, marginBottom: 6 }}>
            {profile?.email ?? firebaseUser.email ?? "—"}
          </Headline>
          <Meta>{statusText}</Meta>
        </SectionCard>

        {/* ── Sign out ──────────────────────────────────── */}
        <Button variant="destructive" onPress={() => signOut(firebaseAuth)}>
          Sign out
        </Button>

      </ScrollScreen>
    </View>
  );
}
