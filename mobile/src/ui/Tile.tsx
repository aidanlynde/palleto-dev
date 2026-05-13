/**
 * Tile · library card. Photo on top, meta + title + palette below.
 */
import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { theme } from "../theme";
import { PaletteRow, SwatchColor } from "./Palette";
import { Display, Meta } from "./Text";

type Card = {
  id: string;
  title: string;
  image_url: string;
  palette: SwatchColor[];
  meta?: string;
};

type Props = {
  card: Card;
  onPress?: () => void;
  tall?: boolean;
};

export function Tile({ card, onPress, tall }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.tile,
        pressed && { transform: [{ scale: 0.985 }], opacity: 0.96 }
      ]}
    >
      <Image
        source={{ uri: card.image_url }}
        style={[s.img, { aspectRatio: tall ? 1 / 1.35 : 1 / 1.16 }]}
        resizeMode="cover"
      />
      <View style={s.body}>
        {card.meta ? <Meta>{card.meta}</Meta> : null}
        <Display size={17} style={{ lineHeight: 19 }} numberOfLines={2}>
          {card.title}
        </Display>
        <PaletteRow colors={card.palette.slice(0, 5)} height={12} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  tile: {
    backgroundColor: theme.palette.paper,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    ...theme.shadow.quiet
  },
  img: {
    width: "100%",
    backgroundColor: theme.palette.putty
  },
  body: {
    padding: 12,
    gap: 8
  }
});
