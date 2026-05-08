import { useVideoPlayer, VideoView } from "expo-video";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

const refinePreviewSource = require("../../assets/onboarding/refine-preview.mov");

type LockedFeatureScreenProps = {
  buttonLabel?: string;
  feature: "refine" | "save" | "share";
  onContinue: () => void;
};

const lockedFeatureCopy = {
  refine: {
    badge: "Paid feature",
    title: "Keep building from the first read.",
    body:
      "Refinement turns a saved scan into tighter type, sharper applications, and alternate creative directions.",
    videoTitle: "Refinement preview",
    videoBody: "Keep pushing a saved card until the direction actually clicks.",
    chips: ["Sharper type", "New angle", "Project fit"]
  },
  save: {
    badge: "Unlock required",
    title: "Save this card to your library.",
    body:
      "Saving turns the preview scan into a real account-backed card you can revisit, refine, and use in project context.",
    videoTitle: "Library unlock",
    videoBody: "Your first scan becomes the start of a reusable visual reference library.",
    chips: ["Save scan", "Build library", "Use later"]
  },
  share: {
    badge: "Unlock required",
    title: "Share this card as a live link.",
    body:
      "Sharing turns the preview scan into a clean public card page with the image, palette, and creative read attached.",
    videoTitle: "Share unlock",
    videoBody: "Send the card as a link once the one-time unlock is active.",
    chips: ["Public link", "Card preview", "Send anywhere"]
  }
};

export function LockedFeatureScreen({
  buttonLabel = "Continue for now",
  feature,
  onContinue
}: LockedFeatureScreenProps) {
  const copy = lockedFeatureCopy[feature];
  const refinePreviewPlayer = useVideoPlayer(refinePreviewSource, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{copy.badge}</Text>
        </View>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>

        <View style={styles.videoSlot}>
          <VideoView
            allowsFullscreen={false}
            allowsPictureInPicture={false}
            contentFit="cover"
            nativeControls={false}
            player={refinePreviewPlayer}
            style={styles.video}
          />
          <View style={styles.videoOverlay}>
            <Text style={styles.videoTitle}>{copy.videoTitle}</Text>
            <Text style={styles.videoBody}>{copy.videoBody}</Text>
          </View>
        </View>

        <View style={styles.chipRow}>
          {copy.chips.map((chip) => (
            <View key={chip} style={styles.chip}>
              <Text style={styles.chipText}>{chip}</Text>
            </View>
          ))}
        </View>

        {/* TODO(RevenueCat): this button is the shared paywall CTA for preview share/save/refine. */}
        <Pressable onPress={onContinue} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 34
  },
  card: {
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.surface
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.textPrimary
  },
  badgeText: {
    color: theme.colors.background,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32
  },
  body: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22
  },
  videoSlot: {
    overflow: "hidden",
    minHeight: 300,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small,
    backgroundColor: "#171717"
  },
  video: {
    width: "100%",
    height: 300
  },
  videoOverlay: {
    position: "absolute",
    right: theme.spacing.md,
    bottom: theme.spacing.md,
    left: theme.spacing.md,
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.small,
    backgroundColor: "rgba(0,0,0,0.62)"
  },
  videoTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22
  },
  videoBody: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  chip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small
  },
  chipText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800"
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: theme.radius.small
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: 15,
    fontWeight: "800"
  },
  pressed: {
    opacity: 0.72
  }
});
