import { Image, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

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
        <View style={styles.paletteHero}>
          {card.palette.map((color) => (
            <View key={`${color.hex}-${color.role}`} style={styles.paletteColumn}>
              <View style={[styles.swatchBlock, { backgroundColor: color.hex }]} />
              <View style={styles.paletteCopy}>
                <Text style={styles.swatchLabel}>{color.label}</Text>
                <Text style={styles.swatchRole}>{color.role}</Text>
              </View>
            </View>
          ))}
        </View>

        <SectionLabel label="Visual DNA" />
        <View style={styles.dnaGrid}>
          <DnaModule label="Contrast" type="contrast" value={card.visual_dna.contrast} />
          <DnaModule label="Shape" type="shape" value={card.visual_dna.shape_language} />
          <DnaModule label="Texture" type="texture" value={card.visual_dna.texture} />
          <DnaModule label="Composition" type="composition" value={card.visual_dna.composition} />
        </View>

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
            <Text style={[styles.typePreview, typePreviewStyle(direction.style)]}>
              {direction.style}
            </Text>
            <Text style={styles.typeStyle}>{direction.style}</Text>
            <Text style={styles.typeUse}>{direction.use}</Text>
          </View>
        ))}

        <SectionLabel label="Related inspiration" />
        {card.related_links.map((link) => (
          <Pressable key={link.url} style={styles.relatedTile} onPress={() => Linking.openURL(link.url)}>
            {link.thumbnail_url ? (
              <Image source={{ uri: link.thumbnail_url }} style={styles.relatedImage} resizeMode="cover" />
            ) : (
              <View style={styles.relatedPreview}>
                <View style={styles.relatedPreviewMark} />
                <View style={styles.relatedPreviewLine} />
                <View style={styles.relatedPreviewPalette}>
                  {card.palette.slice(0, 4).map((color) => (
                    <View
                      key={`${link.url}-${color.hex}`}
                      style={[styles.relatedPreviewSwatch, { backgroundColor: color.hex }]}
                    />
                  ))}
                </View>
              </View>
            )}
            <View style={styles.relatedCopy}>
              <Text style={styles.relatedTitle}>{link.title}</Text>
              {link.reason ? <Text style={styles.relatedReason}>{link.reason}</Text> : null}
              <Text style={styles.relatedProvider}>{link.provider}</Text>
            </View>
          </Pressable>
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

function DnaModule({
  label,
  type,
  value
}: {
  label: string;
  type: "composition" | "contrast" | "shape" | "texture";
  value: string;
}) {
  return (
    <View style={styles.dnaModule}>
      <DnaVisual type={type} />
      <Text style={styles.dnaLabel}>{label}</Text>
      <Text style={styles.dnaValue}>{value}</Text>
    </View>
  );
}

function DnaVisual({ type }: { type: "composition" | "contrast" | "shape" | "texture" }) {
  if (type === "contrast") {
    return (
      <View style={styles.contrastVisual}>
        <View style={[styles.contrastBlock, { backgroundColor: "#111111" }]} />
        <View style={[styles.contrastBlock, { backgroundColor: "#F4F1EA" }]} />
        <View style={[styles.contrastBlock, { backgroundColor: "#F26A21" }]} />
      </View>
    );
  }

  if (type === "shape") {
    return (
      <View style={styles.shapeVisual}>
        <View style={styles.shapeOval} />
        <View style={[styles.shapeOval, styles.shapeOvalOffset]} />
      </View>
    );
  }

  if (type === "composition") {
    return (
      <View style={styles.compositionVisual}>
        <View style={styles.diagonalLine} />
        <View style={styles.compositionDot} />
      </View>
    );
  }

  return (
    <View style={styles.textureVisual}>
      {Array.from({ length: 18 }).map((_, index) => (
        <View key={index} style={styles.textureDot} />
      ))}
    </View>
  );
}

function typePreviewStyle(style: string) {
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
    gap: theme.spacing.xs
  },
  paletteColumn: {
    flex: 1,
    gap: theme.spacing.sm
  },
  swatchBlock: {
    height: 76,
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
  dnaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  dnaModule: {
    width: "48%",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
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
  contrastVisual: {
    flexDirection: "row",
    height: 42,
    overflow: "hidden",
    borderRadius: 4
  },
  contrastBlock: {
    flex: 1
  },
  shapeVisual: {
    height: 42,
    justifyContent: "center"
  },
  shapeOval: {
    width: 58,
    height: 20,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 8,
    transform: [{ rotate: "-18deg" }]
  },
  shapeOvalOffset: {
    alignSelf: "flex-end",
    marginTop: -4,
    backgroundColor: "#F26A21",
    transform: [{ rotate: "18deg" }]
  },
  compositionVisual: {
    height: 42,
    justifyContent: "center",
    overflow: "hidden"
  },
  diagonalLine: {
    height: 2,
    backgroundColor: theme.colors.textPrimary,
    transform: [{ rotate: "-28deg" }]
  },
  compositionDot: {
    position: "absolute",
    right: 18,
    width: 12,
    height: 12,
    backgroundColor: "#F26A21",
    borderRadius: 6
  },
  textureVisual: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    height: 42
  },
  textureDot: {
    width: 5,
    height: 5,
    backgroundColor: theme.colors.textSecondary,
    borderRadius: 3
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
  typePreview: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    lineHeight: 34
  },
  typePreviewGrotesk: {
    fontWeight: "900",
    textTransform: "uppercase"
  },
  typePreviewMono: {
    fontFamily: "Courier",
    fontWeight: "700"
  },
  typePreviewSans: {
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
  relatedTile: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  relatedImage: {
    width: 86,
    height: 86,
    borderRadius: 4
  },
  relatedPreview: {
    width: 86,
    height: 86,
    justifyContent: "space-between",
    padding: theme.spacing.sm,
    backgroundColor: "#67675F",
    borderRadius: 4
  },
  relatedPreviewMark: {
    width: 38,
    height: 18,
    backgroundColor: "#111111",
    borderRadius: 8,
    transform: [{ rotate: "-18deg" }]
  },
  relatedPreviewLine: {
    height: 2,
    backgroundColor: "#F4F1EA"
  },
  relatedPreviewPalette: {
    flexDirection: "row",
    height: 10
  },
  relatedPreviewSwatch: {
    flex: 1
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
  }
});
