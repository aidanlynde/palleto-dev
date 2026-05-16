/**
 * PaywallScreen — custom-UI replacement for LockedFeatureScreen.
 *
 * Props match LockedFeatureScreen exactly so it's a drop-in replacement.
 * No RevenueCat dashboard changes needed.
 *
 * Uses existing helpers from src/services/revenueCat.ts:
 *   - getLifetimePackage()       → for localized price display
 *   - purchaseLifetimePackage()  → for the actual purchase
 *   - restoreRevenueCatPurchases()
 *   - hasPalletoPro()
 *
 * Requires the Bone design-system handoff (theme.ts + src/ui/ primitives).
 */
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";

import {
  getLifetimePackage,
  hasPalletoPro,
  purchaseLifetimePackage,
  restoreRevenueCatPurchases
} from "../services/revenueCat";
import { trackEvent } from "../services/analytics";
import { theme } from "../theme";
import { Body, Display, DisplayItalic, Meta, Pill, Text } from "../ui";

/* ──────────────────────────────────────────────────────────────
   Static reference images shown in the floating card stack.
   Edit if you want different artwork.
   ────────────────────────────────────────────────────────────── */
const KOI_SOURCE: ImageSourcePropType = require("../../assets/demo/koi-street-reference.png");
const GARDEN_SOURCE: ImageSourcePropType = require("../../assets/demo/garden-objects-reference.png");

const KOI_PALETTE = ["#D14B2D", "#1F1B19", "#C9B591", "#5A6E64", "#EFE7D7"];
const GARDEN_PALETTE = ["#7B4528", "#5A6543", "#A89478", "#E3D7BF", "#1F1A14"];

const VALUE_PROPS = [
  { label: "Unlimited scans",     sub: "No daily caps. Snap whatever catches your eye.", icon: "∞" },
  { label: "Refine with AI",      sub: "Push any card warmer, quieter, more editorial.", icon: "✦" },
  { label: "Public share links",  sub: "Send a card by link, not by screenshot.",         icon: "↗" },
  { label: "Lifetime, one-time",  sub: "No subscription. Buy once, keep forever.",        icon: "◉" }
];

const HEADLINES = {
  refine: {
    line1: "Push the read,",
    line2: "unlock the rest.",
    sub: "Refine any scan into tighter type, sharper applications, and alternate directions — as many times as you want."
  },
  save: {
    line1: "Keep every",
    line2: "thing you see.",
    sub: "Save scans to your library, file them under projects, and build a visual reference you actually return to."
  },
  share: {
    line1: "Send the card,",
    line2: "not the screenshot.",
    sub: "Every scan becomes a live link with the image, palette, and creative read attached."
  }
};

/* Fallback if RC offerings haven't loaded yet (rare, but possible offline) */
const FALLBACK_PRICE = "$4.99";
const FALLBACK_STRIKE = "$9.99";

/* ──────────────────────────────────────────────────────────────
   Props — match LockedFeatureScreen exactly
   ────────────────────────────────────────────────────────────── */
type Feature = "refine" | "save" | "share";

type Props = {
  buttonLabel?: string;
  feature: Feature;
  isLoading?: boolean;
  onContinue: () => void;        // called after successful purchase OR restore
  onClose?: () => void;          // called when user dismisses
};

export function PaywallScreen({ feature, onContinue, onClose }: Props) {
  const headline = HEADLINES[feature];

  const [price, setPrice] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  /* ─── Fetch localized price on mount ─── */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const pkg = await getLifetimePackage();
        if (mounted && pkg) {
          // priceString is locale-formatted by RevenueCat (e.g. "$4.99", "€4,99")
          setPrice(pkg.product.priceString ?? FALLBACK_PRICE);
        } else if (mounted) {
          setPrice(FALLBACK_PRICE);
        }
      } catch {
        if (mounted) setPrice(FALLBACK_PRICE);
      }
    })();
    return () => { mounted = false; };
  }, []);

  /* ─── Staggered reveal animation on mount ─── */
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setRevealed(1), 200);
    const t2 = setTimeout(() => setRevealed(2), 500);
    const t3 = setTimeout(() => setRevealed(3), 800);
    const t4 = setTimeout(() => setRevealed(4), 1100);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  /* ─── Purchase ─── */
  async function handlePurchase() {
    if (purchasing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent("paywall_cta_tapped", { feature, source: "custom_paywall" });
    setPurchasing(true);

    try {
      const customerInfo = await purchaseLifetimePackage();
      if (hasPalletoPro(customerInfo)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        trackEvent("paywall_purchase_succeeded", { feature });
        onContinue();
      } else {
        // Should not happen, but guard anyway
        trackEvent("paywall_purchase_no_entitlement", { feature });
        Alert.alert("Purchase incomplete", "We could not verify the purchase. Try restoring.");
      }
    } catch (e: any) {
      // RevenueCat throws { userCancelled: true } when the user dismisses the
      // Apple/Google purchase sheet — that's normal, not an error.
      if (e?.userCancelled) {
        trackEvent("paywall_purchase_cancelled", { feature });
      } else {
        trackEvent("paywall_purchase_failed", { feature, message: String(e?.message ?? "") });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Purchase failed", "Try again in a moment.");
      }
    } finally {
      setPurchasing(false);
    }
  }

  /* ─── Restore ─── */
  async function handleRestore() {
    if (restoring) return;
    setRestoring(true);
    trackEvent("paywall_restore_tapped", { feature });

    try {
      const info = await restoreRevenueCatPurchases();
      if (hasPalletoPro(info)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        trackEvent("paywall_restore_succeeded", { feature });
        onContinue();
      } else {
        Alert.alert("No purchase found", "We couldn't find an active Palleto Pro on this account.");
      }
    } catch {
      Alert.alert("Restore failed", "Try again in a moment.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <View style={s.screen}>
      {/* Top controls */}
      <View style={s.topbar} pointerEvents="box-none">
        {onClose ? (
          <Pill onPress={onClose}>
            <Text style={{ fontSize: 18, lineHeight: 18, color: theme.ink[1] }}>×</Text>
          </Pill>
        ) : <View style={{ width: 38 }} />}
        <Pill tight onPress={handleRestore}>
          {restoring ? "..." : "Restore"}
        </Pill>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <CardStack />

        <Reveal active={revealed >= 1} style={{ alignItems: "center", marginTop: 18 }}>
          <Meta>FOUNDING MEMBER · LIFETIME</Meta>
        </Reveal>

        <Reveal active={revealed >= 1} delay={100} style={{ alignItems: "center", marginTop: 8 }}>
          <View style={{ alignItems: "center" }}>
            <Display size={34} style={{ lineHeight: 34, textAlign: "center" }}>{headline.line1}</Display>
            <DisplayItalic size={34} color={theme.ink[2]} style={{ lineHeight: 34, textAlign: "center" }}>
              {headline.line2}
            </DisplayItalic>
          </View>
          <Body
            style={{
              fontSize: 13.5,
              lineHeight: 19,
              textAlign: "center",
              color: theme.ink[3],
              maxWidth: 300,
              marginTop: 10
            }}
          >
            {headline.sub}
          </Body>
        </Reveal>

        <View style={{ marginTop: 18, gap: 10 }}>
          {VALUE_PROPS.map((p, i) => (
            <ValueRow
              key={p.label}
              {...p}
              visible={revealed >= 2 + Math.floor(i / 2)}
              delay={i * 90}
            />
          ))}
        </View>

        <Reveal active={revealed >= 4} style={{ marginTop: 18 }}>
          <PriceCard
            price={price ?? FALLBACK_PRICE}
            strikePrice={FALLBACK_STRIKE}
            onPurchase={handlePurchase}
            purchasing={purchasing}
          />
        </Reveal>

        <Reveal active={revealed >= 4} delay={300}>
          <View style={s.footer}>
            <FooterLink>Terms</FooterLink>
            <Text style={s.footerDot}>·</Text>
            <FooterLink>Privacy</FooterLink>
            <Text style={s.footerDot}>·</Text>
            <Pressable onPress={handleRestore} hitSlop={8}>
              <Text style={s.footerLink}>Restore</Text>
            </Pressable>
          </View>
        </Reveal>
      </ScrollView>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────
   Reveal — opacity + translateY transition wrapper
   ────────────────────────────────────────────────────────────── */
function Reveal({
  children,
  active,
  delay = 0,
  style
}: {
  children: React.ReactNode;
  active: boolean;
  delay?: number;
  style?: any;
}) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (active) {
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      ]).start();
    }
  }, [active, delay, op, ty]);

  return (
    <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>
      {children}
    </Animated.View>
  );
}

/* ──────────────────────────────────────────────────────────────
   Value row
   ────────────────────────────────────────────────────────────── */
function ValueRow({
  label, sub, icon, visible, delay
}: {
  label: string; sub: string; icon: string; visible: boolean; delay: number;
}) {
  return (
    <Reveal active={visible} delay={delay}>
      <View style={s.valueRow}>
        <View style={s.valueIcon}>
          <Text style={{ fontSize: 14, color: theme.ink[1] }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.valueLabel}>{label}</Text>
          <Text style={s.valueSub}>{sub}</Text>
        </View>
      </View>
    </Reveal>
  );
}

/* ──────────────────────────────────────────────────────────────
   PriceCard — dark slab with price + CTA
   ────────────────────────────────────────────────────────────── */
function PriceCard({
  price, strikePrice, onPurchase, purchasing
}: {
  price: string;
  strikePrice: string;
  onPurchase: () => void;
  purchasing: boolean;
}) {
  return (
    <View style={s.priceCard}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <View>
          <Text style={s.priceEyebrow}>LIFETIME · ONE-TIME</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 3 }}>
            <Text style={s.priceNumber}>{price}</Text>
            <Text style={s.priceStrike}>{strikePrice}</Text>
          </View>
        </View>
        <View style={s.ribbon}>
          <Text style={s.ribbonText}>50% OFF</Text>
        </View>
      </View>

      <Pressable
        onPress={onPurchase}
        disabled={purchasing}
        style={({ pressed }) => [
          s.cta,
          pressed && { transform: [{ scale: 0.98 }] },
          purchasing && { opacity: 0.7 }
        ]}
      >
        <Text style={s.ctaLabel}>
          {purchasing ? "Processing…" : "Become a Founding Member"}
        </Text>
        {!purchasing ? <Text style={s.ctaArrow}>→</Text> : null}
      </Pressable>

      <Text style={s.priceFine}>ONE-TIME · NO RECURRING</Text>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────
   Floating card stack — three saved scans, gently bobbing
   ────────────────────────────────────────────────────────────── */
function CardStack() {
  const front = useFloatingValue({ amplitude: 6, period: 5000, phase: 0 });
  const left = useFloatingValue({ amplitude: 3, period: 6000, phase: 0 });
  const right = useFloatingValue({ amplitude: 3, period: 6000, phase: 1000 });

  return (
    <View style={s.cardStackWrap}>
      <Animated.View
        style={[
          s.cardStackBack,
          {
            transform: [
              { translateX: -50 },
              { translateY: left },
              { rotate: "-7deg" }
            ]
          }
        ]}
      >
        <MiniCard image={GARDEN_SOURCE} palette={GARDEN_PALETTE} title="Tools, Earth" />
      </Animated.View>
      <Animated.View
        style={[
          s.cardStackBack,
          {
            transform: [
              { translateX: 50 },
              { translateY: right },
              { rotate: "7deg" }
            ]
          }
        ]}
      >
        <MiniCard image={KOI_SOURCE} palette={KOI_PALETTE} title="Wet Pavement" />
      </Animated.View>
      <Animated.View
        style={[
          s.cardStackFront,
          {
            transform: [
              { translateY: front }
            ]
          }
        ]}
      >
        <MiniCard image={KOI_SOURCE} palette={KOI_PALETTE} title="Wet Pavement, Bright Fish" hero />
      </Animated.View>
    </View>
  );
}

function MiniCard({
  image, palette, title, hero
}: {
  image: ImageSourcePropType;
  palette: string[];
  title: string;
  hero?: boolean;
}) {
  return (
    <View style={[s.miniCard, hero && s.miniCardHero]}>
      <View style={s.miniCardPhoto}>
        <Image source={image} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      </View>
      <View style={s.miniCardPalette}>
        {palette.map((c, i) => (
          <View key={i} style={{ flex: 1, height: 8, borderRadius: 2, backgroundColor: c }} />
        ))}
      </View>
      <Text
        style={hero ? [s.miniCardTitle, { fontSize: 12 }] : s.miniCardTitle}
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
  );
}

/**
 * useFloatingValue — returns an Animated.Value that loops between
 * -amplitude and +amplitude over `period` ms, offset by `phase`.
 */
function useFloatingValue({
  amplitude, period, phase = 0
}: { amplitude: number; period: number; phase?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const startDelay = phase % period;
    let cancelled = false;
    const loop = () =>
      Animated.sequence([
        Animated.timing(v, { toValue: -amplitude, duration: period / 2, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0,           duration: period / 2, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })
      ]).start(({ finished }) => {
        if (!cancelled && finished) loop();
      });

    const t = setTimeout(loop, startDelay);
    return () => { cancelled = true; clearTimeout(t); };
  }, [amplitude, period, phase, v]);

  return v;
}

/* ──────────────────────────────────────────────────────────────
   Footer
   ────────────────────────────────────────────────────────────── */
function FooterLink({ children }: { children: React.ReactNode }) {
  return (
    <Pressable hitSlop={8}>
      <Text style={s.footerLink}>{children}</Text>
    </Pressable>
  );
}

/* ──────────────────────────────────────────────────────────────
   Styles
   ────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.palette.bone
  },
  topbar: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    zIndex: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  scroll: {
    paddingTop: 108,
    paddingHorizontal: 24,
    paddingBottom: 52
  },
  cardStackWrap: {
    width: "100%",
    height: 160,
    alignItems: "center",
    justifyContent: "flex-start",
    position: "relative"
  },
  cardStackBack: {
    position: "absolute",
    top: 10,
    left: "50%",
    marginLeft: -46,
    width: 92,
    zIndex: 1
  },
  cardStackFront: {
    position: "absolute",
    top: 0,
    left: "50%",
    marginLeft: -52,
    width: 104,
    zIndex: 2
  },
  miniCard: {
    padding: 8,
    paddingBottom: 10,
    backgroundColor: theme.palette.paper,
    borderRadius: 18,
    ...theme.shadow.lifted
  },
  miniCardHero: {
    ...theme.shadow.floating
  },
  miniCardPhoto: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.palette.putty
  },
  miniCardPalette: {
    flexDirection: "row",
    gap: 2.5,
    paddingTop: 6,
    paddingHorizontal: 2,
    paddingBottom: 2
  },
  miniCardTitle: {
    fontFamily: theme.font.display,
    fontSize: 11,
    lineHeight: 12,
    paddingHorizontal: 2,
    paddingTop: 4,
    color: theme.ink[1]
  },

  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  valueIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: theme.palette.paper,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.quiet
  },
  valueLabel: {
    fontFamily: theme.font.sansMedium,
    fontSize: 14,
    color: theme.ink[1],
    letterSpacing: -0.1
  },
  valueSub: {
    fontFamily: theme.font.sans,
    fontSize: 12,
    lineHeight: 16,
    color: theme.ink[3],
    marginTop: 1
  },

  priceCard: {
    padding: 16,
    backgroundColor: theme.ink[1],
    borderRadius: 20,
    ...theme.shadow.lifted
  },
  priceEyebrow: {
    fontFamily: theme.font.mono,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: "rgba(250,247,240,0.55)",
    textTransform: "uppercase"
  },
  priceNumber: {
    fontFamily: theme.font.display,
    fontSize: 40,
    lineHeight: 40,
    color: "#FAF7F0",
    letterSpacing: -1
  },
  priceStrike: {
    fontFamily: theme.font.display,
    fontSize: 16,
    color: "rgba(250,247,240,0.45)",
    textDecorationLine: "line-through"
  },
  ribbon: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#C5683E",
    borderRadius: 999,
    marginTop: 4
  },
  ribbonText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 10.5,
    color: "#FAF7F0",
    letterSpacing: -0.1
  },
  cta: {
    width: "100%",
    height: 48,
    borderRadius: 999,
    backgroundColor: "#FAF7F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...theme.shadow.lifted
  },
  ctaLabel: {
    fontFamily: theme.font.sansMedium,
    fontSize: 15,
    color: theme.ink[1],
    letterSpacing: -0.1
  },
  ctaArrow: {
    fontSize: 15,
    color: "#C5683E"
  },
  priceFine: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: theme.font.mono,
    fontSize: 9.5,
    letterSpacing: 0.6,
    color: "rgba(250,247,240,0.45)"
  },

  footer: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 14
  },
  footerLink: {
    fontFamily: theme.font.sans,
    fontSize: 12,
    color: theme.ink[3]
  },
  footerDot: {
    color: theme.ink[4]
  }
});
