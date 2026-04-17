import { useFocusEffect } from "@react-navigation/native";
import { User } from "firebase/auth";
import { useCallback, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { InspirationCard, listCards } from "../services/api";
import { theme } from "../theme";

type LibraryScreenProps = {
  firebaseUser: User;
  onScan: () => void;
  onSelectCard: (card: InspirationCard) => void;
  projectContext?: {
    name: string;
    projectType: string;
  } | null;
};

export function LibraryScreen({ firebaseUser, onScan, onSelectCard, projectContext }: LibraryScreenProps) {
  const [cards, setCards] = useState<InspirationCard[]>([]);
  const [status, setStatus] = useState("Loading library...");

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
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Library</Text>
      <Text style={styles.title}>Saved inspiration</Text>
      {projectContext ? (
        <View style={styles.projectChip}>
          <Text style={styles.projectChipLabel}>Working on</Text>
          <Text style={styles.projectChipText}>
            {projectContext.projectType}: {projectContext.name}
          </Text>
        </View>
      ) : null}
      {status ? <Text style={styles.status}>{status}</Text> : null}
      {!cards.length && !status.includes("failed") ? (
        <Pressable style={styles.emptyButton} onPress={onScan}>
          <Text style={styles.emptyButtonText}>Scan your first reference</Text>
        </Pressable>
      ) : null}
      <FlatList
        contentContainerStyle={styles.grid}
        data={cards}
        keyExtractor={(card) => card.id}
        numColumns={2}
        renderItem={({ item }) => (
          <Pressable style={styles.tile} onPress={() => onSelectCard(item)}>
            <Image source={{ uri: item.image_url }} style={styles.tileImage} resizeMode="cover" />
            <View style={styles.tileBody}>
              <Text style={styles.tileTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.paletteStrip}>
                {item.palette.slice(0, 5).map((color) => (
                  <View
                    key={`${item.id}-${color.hex}`}
                    style={[styles.paletteSwatch, { backgroundColor: color.hex }]}
                  />
                ))}
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background
  },
  eyebrow: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40
  },
  status: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22
  },
  projectChip: {
    gap: 2,
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  projectChipLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  projectChipText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800"
  },
  emptyButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: theme.radius.small
  },
  emptyButtonText: {
    color: theme.colors.background,
    fontSize: 15,
    fontWeight: "800"
  },
  grid: {
    gap: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl
  },
  tile: {
    flex: 1,
    overflow: "hidden",
    margin: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.small
  },
  tileImage: {
    width: "100%",
    aspectRatio: 1
  },
  tileBody: {
    gap: theme.spacing.sm,
    padding: theme.spacing.sm
  },
  tileTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18
  },
  paletteStrip: {
    flexDirection: "row",
    height: 8
  },
  paletteSwatch: {
    flex: 1
  }
});
