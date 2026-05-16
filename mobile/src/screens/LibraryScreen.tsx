/**
 * LibraryScreen — hero surface. Drop-in replacement; props match original.
 * Same behavior (focus refetch, project context, empty/error states) — new shell.
 */
import { useFocusEffect } from "@react-navigation/native";
import { User } from "firebase/auth";
import { useCallback, useState } from "react";
import { FlatList, useWindowDimensions, View } from "react-native";

import { InspirationCard, listCards } from "../services/api";
import { theme } from "../theme";
import {
  Body,
  Button,
  Display,
  DisplayItalic,
  Meta,
  Pill,
  ProjectChip,
  ScrollScreen,
  Tile
} from "../ui";

type LibraryScreenProps = {
  firebaseUser: User;
  onEditProject: () => void;
  onScan: () => void;
  onSelectCard: (card: InspirationCard) => void;
  projectContext?: {
    name: string;
    projectType: string;
    desiredFeeling?: string | null;
  } | null;
};

export function LibraryScreen({
  firebaseUser,
  onEditProject,
  onScan,
  onSelectCard,
  projectContext
}: LibraryScreenProps) {
  const { width } = useWindowDimensions();
  // 32 = 16pt horizontal padding on each side (from ScrollScreen), 12 = column gap
  const cardWidth = (width - 32 - 12) / 2;

  const [cards, setCards] = useState<InspirationCard[]>([]);
  const [status, setStatus] = useState("Loading library…");

  const loadCards = useCallback(async () => {
    try {
      const token = await firebaseUser.getIdToken();
      const nextCards = await listCards(token);
      setCards(nextCards);
      setStatus(nextCards.length ? "" : "Your library starts with one scan.");
    } catch {
      setStatus("Library failed to load.");
    }
  }, [firebaseUser]);

  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [loadCards])
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.palette.bone }}>
      <ScrollScreen contentContainerStyle={{ paddingTop: 24 }}>
        {/* Headline */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 20
          }}
        >
          <View style={{ flex: 1 }}>
            <Meta style={{ marginBottom: 6 }}>
              {cards.length ? `${cards.length} SCANS · LIBRARY` : "LIBRARY"}
            </Meta>
            <Display size={56}>Library</Display>
          </View>
          <DisplayItalic size={22} color={theme.ink[3]} style={{ paddingBottom: 8 }}>
            no.1
          </DisplayItalic>
        </View>

        {/* Project chip */}
        {projectContext ? (
          <View style={{ marginBottom: 18 }}>
            <ProjectChip
              name={projectContext.name}
              projectType={projectContext.projectType}
              feeling={projectContext.desiredFeeling}
              onEdit={onEditProject}
            />
          </View>
        ) : cards.length ? (
          <View style={{ marginBottom: 18 }}>
            <Pill icon="plus" onPress={onEditProject}>
              Add project context
            </Pill>
          </View>
        ) : null}

        {/* Empty / error state */}
        {!cards.length && status ? (
          <View
            style={{
              alignItems: "center",
              paddingVertical: 60,
              paddingHorizontal: 24,
              gap: 16
            }}
          >
            <Body style={{ textAlign: "center" }}>{status}</Body>
            {!status.includes("failed") ? (
              <Button icon="plus" onPress={onScan}>
                Scan your first reference
              </Button>
            ) : null}
          </View>
        ) : null}

        {/* Tiles grid (staggered) */}
        <FlatList
          data={cards}
          keyExtractor={(c) => c.id}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <View style={{ width: cardWidth }}>
              <Tile
                card={{
                  id: item.id,
                  title: item.title,
                  image_url: item.image_url,
                  palette: item.palette,
                  meta: formatMeta(item)
                }}
                onPress={() => onSelectCard(item)}
              />
            </View>
          )}
        />
      </ScrollScreen>
    </View>
  );
}

function formatMeta(card: InspirationCard) {
  // If your card has a created_at field, prefer that.
  // Fallback: short id stamp.
  const anyCard = card as any;
  if (anyCard.created_at) {
    const d = new Date(anyCard.created_at);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return `№ ${card.id.slice(0, 4).toUpperCase()}`;
}
