import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View, Image } from "react-native";

import { InspirationCard } from "../services/api";
import { theme } from "../theme";

type CardResultScreenProps = {
  card: InspirationCard;
  onDone: () => void;
  onViewLibrary: () => void;
};

export function CardResultScreen({ card, onDone, onViewLibrary }: CardResultScreenProps) {
  async function shareCard() {
    await Share.share({
      message: `${card.title}\n\n${card.one_line_read}\n\nMade with Palleto`
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.saved}>Saved to library</Text>
      <CardDetail card={card} />
      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={shareCard}>
          <Text style={styles.primaryButtonText}>Share card</Text>
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
  return (
    <View style={styles.card}>
      <Image source={{ uri: card.image_url }} style={styles.cardImage} resizeMode="cover" />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{card.title}</Text>
        <Text style={styles.oneLine}>{card.one_line_read}</Text>
        <Text style={styles.direction}>{card.creative_direction}</Text>

        <SectionLabel label="Palette" />
        <View style={styles.paletteRow}>
          {card.palette.map((color) => (
            <View key={`${color.hex}-${color.role}`} style={styles.paletteCard}>
              <View style={[styles.swatch, { backgroundColor: color.hex }]} />
              <View style={styles.paletteCopy}>
                <Text style={styles.swatchLabel}>{color.label}</Text>
                <Text style={styles.swatchRole}>{color.role}</Text>
              </View>
            </View>
          ))}
        </View>

        <SectionLabel label="Visual DNA" />
        <DnaRow label="Contrast" value={card.visual_dna.contrast} />
        <DnaRow label="Shape" value={card.visual_dna.shape_language} />
        <DnaRow label="Texture" value={card.visual_dna.texture} />
        <DnaRow label="Composition" value={card.visual_dna.composition} />

        <SectionLabel label="Design moves" />
        <View style={styles.moveList}>
          {card.design_moves.map((move, index) => (
            <View key={move} style={styles.moveRow}>
              <Text style={styles.moveNumber}>{String(index + 1).padStart(2, "0")}</Text>
              <Text style={styles.moveText}>{move}</Text>
            </View>
          ))}
        </View>

        <View style={styles.projectPanel}>
          <Text style={styles.projectLabel}>Project lens</Text>
          <Text style={styles.projectTitle}>{card.project_lens.project_type}</Text>
          <Text style={styles.projectSummary}>{card.project_lens.summary}</Text>
          {card.project_lens.applications.map((application) => (
            <Text key={application} style={styles.applicationText}>
              {application}
            </Text>
          ))}
        </View>

        <SectionLabel label="Type direction" />
        {card.type_direction.map((direction) => (
          <View key={direction.style} style={styles.typeItem}>
            <Text style={styles.typeStyle}>{direction.style}</Text>
            <Text style={styles.typeUse}>{direction.use}</Text>
          </View>
        ))}

        <SectionLabel label="Related inspiration" />
        {card.related_links.map((link) => (
          <Pressable key={link.url} style={styles.relatedLink} onPress={() => Linking.openURL(link.url)}>
            <Text style={styles.relatedTitle}>{link.title}</Text>
            <Text style={styles.relatedProvider}>{link.provider}</Text>
          </Pressable>
        ))}

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

export function CardDetailScreen({ card }: { card: InspirationCard }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <CardDetail card={card} />
    </ScrollView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function DnaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dnaRow}>
      <Text style={styles.dnaLabel}>{label}</Text>
      <Text style={styles.dnaValue}>{value}</Text>
    </View>
  );
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
  paletteRow: {
    gap: theme.spacing.sm
  },
  paletteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  swatch: {
    width: 48,
    height: 36,
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderRadius: 4
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
  dnaRow: {
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1
  },
  dnaLabel: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  dnaValue: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22
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
  projectPanel: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  projectLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  projectTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28
  },
  projectSummary: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22
  },
  applicationText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21
  },
  typeItem: {
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
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
  relatedLink: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1
  },
  relatedTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800"
  },
  relatedProvider: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
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
  }
});
