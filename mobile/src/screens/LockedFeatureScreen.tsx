import { useVideoPlayer, VideoView } from "expo-video";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

const refinePreviewSource = require("../../assets/onboarding/refine-preview.mov");

type LockedFeatureScreenProps = {
  buttonLabel?: string;
  onContinue: () => void;
};

export function LockedFeatureScreen({ buttonLabel = "Continue for now", onContinue }: LockedFeatureScreenProps) {
  const refinePreviewPlayer = useVideoPlayer(refinePreviewSource, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Paid feature</Text>
        </View>
        <Text style={styles.title}>Keep building from the first read.</Text>
        <Text style={styles.body}>
          Refinement turns a saved scan into tighter type, sharper applications, and alternate
          creative directions. This is where the RevenueCat unlock will live.
        </Text>

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
            <Text style={styles.videoTitle}>Refinement preview</Text>
            <Text style={styles.videoBody}>
              Keep pushing a saved card until the direction actually clicks.
            </Text>
          </View>
        </View>

        <View style={styles.chipRow}>
          {["Sharper type", "New angle", "Project fit"].map((chip) => (
            <View key={chip} style={styles.chip}>
              <Text style={styles.chipText}>{chip}</Text>
            </View>
          ))}
        </View>

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
