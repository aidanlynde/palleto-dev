import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { User } from "firebase/auth";
import { useState } from "react";
import { Alert, Image, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { createOrGetCardShare, deleteCard, InspirationCard } from "../services/api";
import { theme } from "../theme";

type PaletteColor = InspirationCard["palette"][number];
type RelatedLink = InspirationCard["related_links"][number];

type CardResultScreenProps = {
  card: InspirationCard;
  firebaseUser: User;
  onDone: () => void;
  onRefine: () => void;
  onViewLibrary: () => void;
};

export function CardResultScreen({
  card,
  firebaseUser,
  onDone,
  onRefine,
  onViewLibrary
}: CardResultScreenProps) {
  async function shareCard() {
    try {
      const token = await firebaseUser.getIdToken();
      const share = await createOrGetCardShare(token, card.id);
      await Share.share({
        message: `${card.title}\n\n${card.one_line_read}\n\n${share.share_url}`
      });
    } catch {
      Alert.alert("Share failed", "Try again in a moment.");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.saved}>Saved to library</Text>
      <CardDetail card={card} />
      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={shareCard}>
          <Text style={styles.primaryButtonText}>Share card</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onRefine}>
          <Text style={styles.secondaryButtonText}>Refine with AI</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onViewLibrary}>
          <Text style={styles.secondaryButtonText}>View library</Text>
        </Pressable>
        <Pressable style={styles.textButton} onPress={onDone}>
          <Text style={styles.textButtonText}>Done</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export function CardDetail({ card }: { card: InspirationCard }) {
  async function copyHex(hex: string) {
    await Clipboard.setStringAsync(hex.toUpperCase());
    Haptics.selectionAsync();
  }

  return (
    <View style={styles.card}>
      <Image source={{ uri: card.image_url }} style={styles.cardImage} resizeMode="cover" />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{card.title}</Text>
        <Text style={styles.oneLine}>{card.one_line_read}</Text>
        <Text style={styles.direction}>{card.creative_direction}</Text>

        <SectionLabel label="Palette" />
        <View style={styles.paletteHero}>
          {card.palette.map((color) => (
            <Pressable
              key={`${color.hex}-${color.role}`}
              onPress={() => copyHex(color.hex)}
              style={({ pressed }) => [styles.paletteColumn, pressed && styles.pressed]}
            >
              <View style={[styles.swatchBlock, { backgroundColor: color.hex }]}>
                <Text style={styles.swatchHex}>{color.hex.toUpperCase()}</Text>
              </View>
              <View style={styles.paletteCopy}>
                <Text style={styles.swatchLabel}>{color.label}</Text>
                <Text style={styles.swatchRole}>{color.role}</Text>
                <Text style={styles.copyHint}>Tap to copy</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <SectionLabel label="Related inspiration" />
        <RelatedInspiration links={card.related_links} />

        <SectionLabel label="Creative translation" />
        <CreativeTranslation card={card} />

        <SectionLabel label="Type direction" />
        {card.type_direction.map((direction) => (
          <View key={direction.style} style={styles.typeItem}>
            <Text style={[styles.typePreview, typePreviewStyle(direction.style)]}>
              {direction.style}
            </Text>
            <Text style={styles.typeStyle}>{direction.style}</Text>
            <Text style={styles.typeUse}>{direction.use}</Text>
          </View>
        ))}

        <SectionLabel label="Share preview" />
        <View style={styles.sharePreview}>
          <Image source={{ uri: card.image_url }} style={styles.shareImage} resizeMode="cover" />
          <View style={styles.shareBody}>
            <Text style={styles.shareBrand}>PALLETO</Text>
            <Text style={styles.shareTitle}>{card.title}</Text>
            <Text style={styles.shareRead} numberOfLines={3}>
              {card.one_line_read}
            </Text>
            <View style={styles.sharePalette}>
              {card.palette.map((color) => (
                <View
                  key={`share-${color.hex}`}
                  style={[styles.shareSwatch, { backgroundColor: color.hex }]}
                />
              ))}
            </View>
          </View>
        </View>

        <SectionLabel label="Search language" />
        <View style={styles.tagRow}>
          {card.search_language.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function CardDetailScreen({
  card,
  firebaseUser,
  onRefine,
  onDeleted
}: {
  card: InspirationCard;
  firebaseUser: User;
  onRefine: () => void;
  onDeleted: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function shareCard() {
    try {
      const token = await firebaseUser.getIdToken();
      const share = await createOrGetCardShare(token, card.id);
      await Share.share({
        message: `${card.title}\n\n${card.one_line_read}\n\n${share.share_url}`
      });
    } catch {
      Alert.alert("Share failed", "Try again in a moment.");
    }
  }

  function confirmDelete() {
    Alert.alert("Delete this card?", "This removes it from your library.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: deleteCurrentCard
      }
    ]);
  }

  async function deleteCurrentCard() {
    try {
      setIsDeleting(true);
      const token = await firebaseUser.getIdToken();
      await deleteCard(token, card.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDeleted();
    } catch {
      setIsDeleting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Delete failed", "Try again in a moment.");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <CardDetail card={card} />
      <Pressable
        onPress={shareCard}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.primaryButtonText}>Share card</Text>
      </Pressable>
      <Pressable
        onPress={onRefine}
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryButtonText}>Refine with AI</Text>
      </Pressable>
      <Pressable
        disabled={isDeleting}
        onPress={confirmDelete}
        style={({ pressed }) => [
          styles.deleteButton,
          pressed && styles.pressed,
          isDeleting && styles.disabled
        ]}
      >
        <Text style={styles.deleteButtonText}>{isDeleting ? "Deleting..." : "Delete from library"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function RelatedInspiration({ links }: { links: RelatedLink[] }) {
  return (
    <View style={styles.relatedList}>
      {links.map((link) => (
        <Pressable
          key={link.url}
          style={[styles.relatedTile, !link.thumbnail_url && styles.relatedTileTextOnly]}
          onPress={() => Linking.openURL(link.url)}
        >
          {link.thumbnail_url ? (
            <View style={styles.relatedImageFrame}>
              <Image source={{ uri: link.thumbnail_url }} style={styles.relatedImage} resizeMode="cover" />
            </View>
          ) : null}
          <View style={styles.relatedCopy}>
            <Text style={styles.relatedTitle}>{link.title}</Text>
            {link.reason ? <Text style={styles.relatedReason}>{link.reason}</Text> : null}
            <Text style={styles.relatedProvider}>
              {link.thumbnail_url ? link.provider : `${link.provider} / open link`}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function CreativeTranslation({ card }: { card: InspirationCard }) {
  return (
    <View style={styles.translationPanel}>
      <View style={styles.translationHero}>
        <Image source={{ uri: card.image_url }} style={styles.translationHeroImage} resizeMode="cover" />
        <View style={styles.translationHeroShade} />
        <View style={styles.translationHeroCopy}>
          <Text style={styles.translationEyebrow}>What to steal</Text>
          <Text style={styles.translationTitle}>{card.project_lens.summary}</Text>
        </View>
      </View>

      <View style={styles.translationBody}>
        <View style={styles.projectUseHeader}>
          <Text style={styles.translationEyebrow}>Use it for</Text>
          <Text style={styles.projectUseTitle}>{card.project_lens.project_type}</Text>
        </View>

        <View style={styles.moveList}>
          {card.project_lens.applications.slice(0, 4).map((application, index) => (
            <View key={application} style={styles.moveRow}>
              <Text style={styles.moveNumber}>{String(index + 1).padStart(2, "0")}</Text>
              <Text style={styles.moveText}>{application}</Text>
            </View>
          ))}
        </View>

        <View style={styles.systemNotes}>
          <SystemNote label="Surface" value={card.visual_dna.texture} />
          <SystemNote label="Form" value={card.visual_dna.shape_language} />
          <SystemNote label="Contrast" value={card.visual_dna.contrast} />
          <SystemNote label="Layout" value={card.visual_dna.composition} />
        </View>
      </View>
    </View>
  );
}

function SystemNote({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.systemNote}>
      <Text style={styles.systemNoteLabel}>{label}</Text>
      <Text style={styles.systemNoteValue}>{value}</Text>
    </View>
  );
}

function typePreviewStyle(style: string) {
  if (style.toLowerCase().includes("serif")) {
    return styles.typePreviewSerif;
  }

  if (style.toLowerCase().includes("mono")) {
    return styles.typePreviewMono;
  }

  if (style.toLowerCase().includes("grotesk")) {
    return styles.typePreviewGrotesk;
  }

  return styles.typePreviewSans;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    gap: theme.spacing.lg,
    padding: theme.spacing.lg
  },
  saved: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  card: {
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  cardImage: {
    width: "100%",
    height: 340
  },
  cardBody: {
    gap: theme.spacing.md,
    padding: theme.spacing.md
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36
  },
  oneLine: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24
  },
  direction: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 23
  },
  sectionLabel: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  paletteHero: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  paletteColumn: {
    width: "48.5%",
    gap: theme.spacing.sm,
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  swatchBlock: {
    justifyContent: "flex-end",
    height: 76,
    padding: theme.spacing.xs,
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderRadius: 4
  },
  swatchHex: {
    alignSelf: "flex-start",
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 3,
    color: theme.colors.textPrimary,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: "900"
  },
  paletteCopy: {
    flex: 1,
    gap: 2
  },
  swatchLabel: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  swatchRole: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  copyHint: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700"
  },
  translationPanel: {
    overflow: "hidden",
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  translationHero: {
    minHeight: 300,
    overflow: "hidden",
    backgroundColor: theme.colors.surface
  },
  translationHeroImage: {
    position: "absolute",
    width: "100%",
    minHeight: 300,
    transform: [{ scale: 1.1 }]
  },
  translationHeroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.48)"
  },
  translationHeroCopy: {
    justifyContent: "flex-end",
    minHeight: 300,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    paddingTop: 92
  },
  translationEyebrow: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  translationTitle: {
    color: theme.colors.textPrimary,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 27
  },
  translationBody: {
    gap: theme.spacing.md,
    padding: theme.spacing.md
  },
  projectUseHeader: {
    gap: 2
  },
  projectUseTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25
  },
  moveList: {
    gap: theme.spacing.sm
  },
  moveRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  moveNumber: {
    width: 28,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 21
  },
  moveText: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21
  },
  systemNotes: {
    gap: theme.spacing.sm,
  },
  systemNote: {
    gap: 2,
    paddingTop: theme.spacing.sm,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1
  },
  systemNoteLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  systemNoteValue: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  typeItem: {
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  typePreview: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    lineHeight: 34
  },
  typePreviewGrotesk: {
    fontFamily: "Archivo_900Black",
    fontWeight: "900",
    textTransform: "uppercase"
  },
  typePreviewMono: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontWeight: "700"
  },
  typePreviewSerif: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 34
  },
  typePreviewSans: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontWeight: "800"
  },
  typeStyle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800"
  },
  typeUse: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  relatedList: {
    gap: theme.spacing.sm
  },
  relatedTile: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  relatedTileTextOnly: {
    paddingVertical: theme.spacing.md
  },
  relatedImageFrame: {
    width: 86,
    height: 86,
    overflow: "hidden",
    borderRadius: 4
  },
  relatedImage: {
    width: "100%",
    height: "100%"
  },
  relatedCopy: {
    flex: 1,
    gap: theme.spacing.xs
  },
  relatedTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800"
  },
  relatedReason: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  relatedProvider: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  sharePreview: {
    overflow: "hidden",
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  shareImage: {
    width: "100%",
    height: 220
  },
  shareBody: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md
  },
  shareBrand: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  shareTitle: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 29
  },
  shareRead: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  sharePalette: {
    flexDirection: "row",
    height: 12
  },
  shareSwatch: {
    flex: 1
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  tag: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  tagText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700"
  },
  actions: {
    gap: theme.spacing.md
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: theme.radius.small
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: "800"
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800"
  },
  textButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm
  },
  textButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: "800"
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    borderColor: theme.colors.error,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  deleteButtonText: {
    color: theme.colors.error,
    fontSize: 15,
    fontWeight: "900"
  },
  disabled: {
    opacity: 0.5
  },
  pressed: {
    opacity: 0.72
  }
});
