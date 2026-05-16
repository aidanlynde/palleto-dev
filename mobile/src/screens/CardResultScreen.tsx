/**
 * CardResultScreen + CardDetailScreen — drop-in replacement.
 *
 * Public surface preserved exactly:
 *   export function CardResultScreen({ card, firebaseUser, isPalletoProActive,
 *     isPreview, onDone, onLockedAction, onRefine, onViewLibrary })
 *   export function CardDetail({ card })
 *   export function CardDetailScreen({ card, firebaseUser, isPalletoProActive,
 *     onLockedAction, onRefine, onDeleted })
 *
 * All side-effects (share, delete, analytics) preserved.
 */
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { User } from "firebase/auth";
import { ReactNode, useState } from "react";
import { Alert, Image, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import RNShare from "react-native-share";

import { trackEvent } from "../services/analytics";
import { createOrGetCardShare, deleteCard, InspirationCard } from "../services/api";
import { theme } from "../theme";
import {
  Body,
  Button,
  Chip,
  Display,
  DisplayItalic,
  Headline,
  Icon,
  Meta,
  PaletteHero,
  Pill,
  SectionCard,
  Text,
} from "../ui";

function CollapsibleSectionCard({
  eyebrow,
  title,
  children,
  defaultOpen = false,
  padding = 18
}: {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  padding?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={cs.card}>
      <Pressable
        onPress={() => setOpen(o => !o)}
        style={({ pressed }) => [cs.header, pressed && { opacity: 0.7 }]}
      >
        <View style={{ flex: 1 }}>
          {eyebrow ? <Meta style={{ marginBottom: title ? 4 : 0 }}>{eyebrow}</Meta> : null}
          {title ? <Display size={22} style={{ marginTop: 4 }}>{title}</Display> : null}
        </View>
        <View style={{ transform: [{ rotate: open ? "270deg" : "90deg" }] }}>
          <Icon name="chevron" size={16} color={theme.ink[3]} />
        </View>
      </Pressable>
      {open ? <View style={{ paddingHorizontal: padding, paddingBottom: padding }}>{children}</View> : null}
    </View>
  );
}

const cs = StyleSheet.create({
  card: {
    backgroundColor: theme.palette.paper,
    borderRadius: theme.radius.lg,
    ...theme.shadow.quiet,
    overflow: "hidden"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
    paddingBottom: 16
  }
});

type RelatedLink = InspirationCard["related_links"][number];

type CardResultScreenProps = {
  card: InspirationCard;
  firebaseUser: User | null;
  isPalletoProActive?: boolean;
  isPreview?: boolean;
  onDone: () => void;
  onLockedAction?: (feature: "refine" | "save" | "share") => void;
  onRefine: () => void;
  onViewLibrary: () => void;
};

export function CardResultScreen({
  card,
  firebaseUser,
  isPalletoProActive,
  isPreview,
  onDone,
  onLockedAction,
  onRefine,
  onViewLibrary
}: CardResultScreenProps) {
  async function shareCard() {
    if (isPreview || !firebaseUser || !isPalletoProActive) {
      onLockedAction?.("share");
      return;
    }
    trackEvent("share_clicked", { card_id: card.id, source: "result" });
    try {
      await shareCardFromApi(firebaseUser, card.id, card.title);
      trackEvent("share_completed", { card_id: card.id, source: "result" });
    } catch {
      trackEvent("share_failed", { card_id: card.id, source: "result" });
      Alert.alert("Share failed", "Try again in a moment.");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.palette.bone }}>
      <View style={s.header}>
        <Pill icon="back" onPress={onDone} />
        <View style={s.headerCenter}>
          <Meta>{isPreview ? "PREVIEW" : "INSPIRATION CARD"}</Meta>
        </View>
        <Pill icon="share" onPress={shareCard} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <CardDetail card={card} />

        <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
          <Button icon="sparkle" full onPress={() => {
            if (isPreview || !firebaseUser || !isPalletoProActive) {
              onLockedAction?.("refine");
              return;
            }
            onRefine();
          }}>
            Refine
          </Button>
          <Button icon="share" variant="secondary" full onPress={shareCard}>
            Share
          </Button>
        </View>

        <Button variant="secondary" icon={isPreview ? "plus" : "grid"} onPress={() => {
          if (isPreview || !firebaseUser) {
            onLockedAction?.("save");
            return;
          }
          onViewLibrary();
        }}>
          {isPreview ? "Save to library" : "View library"}
        </Button>
      </ScrollView>
    </View>
  );
}

export function CardDetail({ card }: { card: InspirationCard }) {
  return (
    <View style={{ gap: 14 }}>
      {/* Hero — polaroid frame */}
      <View style={s.polaroid}>
        <Image source={{ uri: card.image_url }} style={s.heroImage} resizeMode="cover" />
        <View style={s.polaroidMeta}>
          <Meta numberOfLines={1}>{shortId(card.id)}</Meta>
          <Meta numberOfLines={1}>{`${card.palette.length} COLORS · ${card.type_direction.length} TYPE`}</Meta>
        </View>
      </View>

      {/* Title + one-liner */}
      <View style={{ paddingHorizontal: 4, marginBottom: 4 }}>
        <Display size={36} style={s.title}>
          {card.title}
        </Display>
        <DisplayItalic
          size={19}
          color={theme.ink[2]}
          style={{ marginTop: 12, lineHeight: 25 }}
        >
          {card.one_line_read}
        </DisplayItalic>
      </View>

      {/* Palette — open by default */}
      <CollapsibleSectionCard eyebrow="PALETTE · TAP TO COPY" defaultOpen>
        <PaletteHero colors={card.palette} />
      </CollapsibleSectionCard>

      {/* Creative direction — open by default */}
      <CollapsibleSectionCard eyebrow="CREATIVE DIRECTION" title="What to steal" defaultOpen>
        <Body style={{ marginBottom: 4 }}>{card.creative_direction}</Body>
      </CollapsibleSectionCard>

      {/* Visual DNA */}
      <CollapsibleSectionCard eyebrow="VISUAL DNA">
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {Object.entries(card.visual_dna).map(([k, v]) => (
            <View key={k} style={{ width: "50%", paddingVertical: 8, paddingRight: 12 }}>
              <Meta style={{ marginBottom: 4 }}>{k.toUpperCase()}</Meta>
              <Headline>{v as string}</Headline>
            </View>
          ))}
        </View>
      </CollapsibleSectionCard>

      {/* Type direction */}
      <CollapsibleSectionCard eyebrow="TYPE DIRECTION">
        <View style={{ gap: 10 }}>
          {card.type_direction.map((t) => (
            <View key={t.style} style={s.typeCard}>
              <Text style={[
                { fontSize: 26, color: theme.ink[1], marginBottom: 10, lineHeight: 30 },
                typePreviewStyle(t.style)
              ]}>
                {t.style}
              </Text>
              <View style={{ gap: 5 }}>
                <Meta numberOfLines={1}>{t.style.toUpperCase()}</Meta>
                <Body style={{ fontSize: 13.5, lineHeight: 19 }}>{t.use}</Body>
              </View>
            </View>
          ))}
        </View>
      </CollapsibleSectionCard>

      {/* Related */}
      {card.related_links && card.related_links.length ? (
        <CollapsibleSectionCard eyebrow="RELATED INSPIRATION">
          <View>
            {card.related_links.map((link, i) => (
              <Pressable
                key={link.url}
                onPress={() => Linking.openURL(link.url)}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    gap: 12,
                    paddingVertical: 12,
                    borderTopWidth: i ? 1 : 0,
                    borderTopColor: theme.palette.line
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                {link.thumbnail_url ? (
                  <Image source={{ uri: link.thumbnail_url }} style={s.relatedThumb} />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Headline>{link.title}</Headline>
                  {link.reason ? <Body style={{ fontSize: 13, marginTop: 4 }}>{link.reason}</Body> : null}
                  <Meta style={{ marginTop: 6 }}>{link.provider.toUpperCase()}</Meta>
                </View>
                <Icon name="arrowup" size={16} color={theme.ink[3]} />
              </Pressable>
            ))}
          </View>
        </CollapsibleSectionCard>
      ) : null}

      {/* Search language */}
      {card.search_language && card.search_language.length ? (
        <CollapsibleSectionCard eyebrow="LANGUAGE FOR MORE OF THIS">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {card.search_language.map((tag) => (
              <Chip key={tag}>{tag}</Chip>
            ))}
          </View>
        </CollapsibleSectionCard>
      ) : null}
    </View>
  );
}

export function CardDetailScreen({
  card,
  firebaseUser,
  isPalletoProActive,
  onLockedAction,
  onRefine,
  onDeleted,
  onBack
}: {
  card: InspirationCard;
  firebaseUser: User;
  isPalletoProActive?: boolean;
  onLockedAction?: (feature: "refine" | "share") => void;
  onRefine: () => void;
  onDeleted: () => void;
  onBack?: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function shareCard() {
    if (!isPalletoProActive) {
      onLockedAction?.("share");
      return;
    }
    trackEvent("share_clicked", { card_id: card.id, source: "card_detail" });
    try {
      await shareCardFromApi(firebaseUser, card.id, card.title);
      trackEvent("share_completed", { card_id: card.id, source: "card_detail" });
    } catch {
      trackEvent("share_failed", { card_id: card.id, source: "card_detail" });
      Alert.alert("Share failed", "Try again in a moment.");
    }
  }

  function confirmDelete() {
    Alert.alert("Delete this card?", "This removes it from your library.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: deleteCurrentCard }
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
    <View style={{ flex: 1, backgroundColor: theme.palette.bone }}>
      <View style={s.header}>
        <Pill icon="back" onPress={onBack} />
        <View style={s.headerCenter}>
          <Meta>INSPIRATION CARD</Meta>
        </View>
        <Pill icon="share" onPress={shareCard} />
      </View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <CardDetail card={card} />

        <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
          <Button icon="sparkle" full onPress={() => {
            if (!isPalletoProActive) {
              onLockedAction?.("refine");
              return;
            }
            onRefine();
          }}>
            Refine with AI
          </Button>
          <Button icon="share" variant="secondary" full onPress={shareCard}>
            Share
          </Button>
        </View>

        <Button variant="destructive" onPress={confirmDelete} disabled={isDeleting}>
          {isDeleting ? "Deleting…" : "Delete from library"}
        </Button>
      </ScrollView>
    </View>
  );
}

/* ── helpers ─────────────────────────────────────────────────── */

async function shareCardFromApi(firebaseUser: User, cardId: string, cardTitle: string) {
  const token = await firebaseUser.getIdToken();
  const share = await createOrGetCardShare(token, cardId);
  const destinationUri = `${FileSystem.cacheDirectory}share-card-${cardId}-${share.share_token}.png`;
  const downloaded = await FileSystem.downloadAsync(share.share_card_image_url, destinationUri);

  if (Platform.OS === "ios") {
    trackEvent("share_sheet_opened", { card_id: cardId, platform: "ios" });
    await RNShare.open({
      failOnCancel: false,
      activityItemSources: [
        {
          placeholderItem: { type: "url", content: share.share_url },
          item: { default: { type: "url", content: share.share_url } },
          subject: { default: cardTitle },
          linkMetadata: {
            originalUrl: share.share_url,
            url: share.share_url,
            title: cardTitle,
            image: downloaded.uri
          }
        }
      ]
    });
    return;
  }

  trackEvent("share_sheet_opened", { card_id: cardId, platform: "android" });
  await Share.share({ message: share.share_url, url: downloaded.uri });
}

function typePreviewStyle(style: string) {
  const lower = style.toLowerCase();
  if (lower.includes("serif")) return { fontFamily: theme.font.display };
  if (lower.includes("mono")) return { fontFamily: theme.font.mono };
  if (lower.includes("grotesk") || lower.includes("sans")) {
    return { fontFamily: theme.font.sansMedium };
  }
  return { fontFamily: theme.font.sans };
}

function shortId(id: string) {
  if (id.startsWith("preview-")) {
    return "PREVIEW";
  }

  return `№ ${id.slice(0, 6).toUpperCase()}`;
}

const s = StyleSheet.create({
  content: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 60,
    gap: 14
  },
  header: {
    minHeight: 64,
    paddingTop: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  polaroid: {
    backgroundColor: theme.palette.paper,
    padding: 10,
    paddingBottom: 12,
    borderRadius: theme.radius.md,
    ...theme.shadow.lifted
  },
  heroImage: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: 12,
    backgroundColor: theme.palette.putty
  },
  title: {
    lineHeight: 44,
    paddingTop: 4,
    paddingBottom: 2
  },
  polaroidMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 4,
    paddingTop: 9
  },
  typeCard: {
    padding: 16,
    backgroundColor: theme.palette.putty,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.palette.line
  },
  relatedThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: theme.palette.putty
  }
});
