/**
 * LandingDemo — animated 6-scene tour for OnboardingScreen step 0.
 *
 * Replaces the `landing-loop.mov` background video with a self-contained
 * animation that explains what Palleto does:
 *
 *   1. Project context — typing animation + mood tags
 *   2. Capture       — viewfinder reticle + flash → polaroid
 *   3. Scan          — scan line sweep + palette emerge + title
 *   4. Refine        — sparkle wand + palette morphs muted
 *   5. Share         — card shrinks to right, "DELIVERED", reply bubble
 *   6. Library       — 2×2 grid of saved scans cascades in
 *
 * Pure RN — no extra dependencies. Uses RN Animated for transforms,
 * setTimeout/setInterval for phase orchestration.
 *
 * Hardcodes the two reference images (koi, garden) via require().
 * If you want to customize the references shown, edit the constants
 * at the top of this file (KOI_*, GARDEN_*).
 */
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  View
} from "react-native";

import { theme } from "../theme";
import { Body, Display, DisplayItalic, Meta, Text } from "./Text";
import { Button } from "./Button";
import { Pill } from "./Pill";

/* ──────────────────────────────────────────────────────────────
   CONFIG — references used in the demo. Edit to customize.
   ────────────────────────────────────────────────────────────── */

const KOI_SOURCE: ImageSourcePropType = require("../../assets/demo/koi-street-reference.png");
const GARDEN_SOURCE: ImageSourcePropType = require("../../assets/demo/garden-objects-reference.png");
const MOSAIC_SOURCE: ImageSourcePropType = require("../../assets/onboarding/library-mosaic.png");
const FISH_SIGN_SOURCE: ImageSourcePropType = require("../../assets/onboarding/library-fish-sign.png");

const KOI_PALETTE = ["#D14B2D", "#1F1B19", "#C9B591", "#5A6E64", "#EFE7D7"];
const KOI_PALETTE_QUIET = ["#9B5742", "#2F2A24", "#C4AD8B", "#6A7268", "#E5DCC6"];
const GARDEN_PALETTE = ["#7B4528", "#5A6543", "#A89478", "#E3D7BF", "#1F1A14"];
const GARDEN_PALETTE_QUIET = ["#7D6A59", "#5D654E", "#B3A384", "#DED4C3", "#24201B"];
const STUDIO_PALETTE = ["#4D3D36", "#8C7B67", "#C6B79E", "#E6DBC6", "#1A1715"];
const ARCHITECTURE_PALETTE = ["#4A5A65", "#8B9A9E", "#C7C2B3", "#E6E0D1", "#252321"];

const PROJECT_NAME = "Reverence Coffee";
const PROJECT_MOODS = ["Quiet luxury", "Monastic", "Honest materials"];

const SCENES = [
  { id: "project", headline: "Tell Palleto",   italic: "what you're making",  sub: "Quiet luxury, monastic, technical and precise — your brief shapes every scan.", ms: 3400 },
  { id: "capture", headline: "Snap",           italic: "anything with signal", sub: "A poster, an outfit, a corner of a room. Palleto reads the light.",            ms: 3000 },
  { id: "scan",    headline: "Get a palette",  italic: "and a direction",      sub: "Hex codes you can copy, language you can search, type lanes to chase.",         ms: 4500 },
  { id: "refine",  headline: "Refine",         italic: "with a tap",           sub: "Push it warmer, quieter, more editorial. The card responds in seconds.",        ms: 3200 },
  { id: "share",   headline: "Send it",        italic: "to anyone",            sub: "A share card that opens as a public web link. Texts, emails, slacks.",          ms: 3000 },
  { id: "library", headline: "Build",          italic: "your visual library",  sub: "Every scan filed under the project it belongs to. Searchable, beautiful.",       ms: 3000 }
] as const;

type SceneId = (typeof SCENES)[number]["id"];

/* ──────────────────────────────────────────────────────────────
   ROOT
   ────────────────────────────────────────────────────────────── */

type Props = {
  onPrimary: () => void;
  onSecondary?: () => void;
  onSignIn?: () => void;
};

export function LandingDemo({ onPrimary, onSecondary, onSignIn }: Props) {
  const [idx, setIdx] = useState(0);
  const activeSceneId = SCENES[idx].id;

  useEffect(() => {
    const t = setTimeout(() => setIdx((i) => (i + 1) % SCENES.length), SCENES[idx].ms);
    return () => clearTimeout(t);
  }, [idx]);

  return (
    <View style={s.container}>
      {/* Top row */}
      <View style={s.topRow}>
        <View style={{ width: 56 }} />
        <SceneDots count={SCENES.length} active={idx} />
        {onSignIn ? <Pill tight onPress={onSignIn}>Sign in</Pill> : <View style={{ width: 56 }} />}
      </View>

      {/* Wordmark */}
      <View style={s.wordmarkRow}>
        <Display size={42} style={{ lineHeight: 44 }}>
          palleto
        </Display>
        <View style={s.wordmarkDot} />
      </View>

      {/* Stage */}
      <View style={[s.stage, stageStyleFor(activeSceneId)]}>
        {SCENES.map((scene, i) => (
          <SceneWrap key={scene.id} active={i === idx}>
            <SceneByID id={scene.id} active={i === idx} />
          </SceneWrap>
        ))}
      </View>

      {/* Captions */}
      <View style={[s.captionStage, captionStyleFor(activeSceneId)]}>
        {SCENES.map((scene, i) => (
          <CaptionWrap key={scene.id} active={i === idx}>
            <View style={{ alignItems: "center" }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
                <Display size={26} style={{ lineHeight: 28 }}>
                  {scene.headline}{" "}
                </Display>
                <DisplayItalic size={26} color={theme.ink[2]} style={{ lineHeight: 28 }}>
                  {scene.italic}
                </DisplayItalic>
              </View>
              <Body
                style={{
                  fontSize: 13.5,
                  lineHeight: 19,
                  marginTop: 8,
                  color: theme.ink[3],
                  maxWidth: 320,
                  textAlign: "center"
                }}
              >
                {scene.sub}
              </Body>
            </View>
          </CaptionWrap>
        ))}
      </View>

      {/* CTAs */}
      <View style={s.ctaStack}>
        <Button onPress={onPrimary} icon="camera" style={s.primaryCta}>
          Open camera
        </Button>
        {onSecondary ? (
          <Pressable onPress={onSecondary} style={({ pressed }) => [s.ghost, pressed && { opacity: 0.5 }]}>
            <Text style={s.ghostText}>See the koi example instead</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function stageStyleFor(scene: SceneId) {
  if (scene === "share") {
    return s.stageShare;
  }

  if (scene === "library") {
    return s.stageLibrary;
  }

  if (scene === "scan") {
    return s.stageScan;
  }

  return null;
}

function captionStyleFor(scene: SceneId) {
  if (scene === "share") {
    return s.captionShare;
  }

  if (scene === "library") {
    return s.captionLibrary;
  }

  if (scene === "scan") {
    return s.captionScan;
  }

  return null;
}

function SceneByID({ id, active }: { id: SceneId; active: boolean }) {
  switch (id) {
    case "project": return <SceneProject active={active} />;
    case "capture": return <SceneCapture active={active} />;
    case "scan":    return <SceneScan    active={active} />;
    case "refine":  return <SceneRefine  active={active} />;
    case "share":   return <SceneShare   active={active} />;
    case "library": return <SceneLibrary active={active} />;
  }
}

/* ──────────────────────────────────────────────────────────────
   Common scene + caption wrappers (cross-fade)
   ────────────────────────────────────────────────────────────── */

function SceneWrap({ active, children }: { active: boolean; children: React.ReactNode }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, {
        toValue: active ? 1 : 0,
        duration: 500,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(ty, {
        toValue: active ? 0 : 8,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [active, op, ty]);

  return (
    <Animated.View
      pointerEvents={active ? "auto" : "none"}
      style={[
        StyleSheet.absoluteFillObject,
        {
          opacity: op,
          transform: [{ translateY: ty }],
          alignItems: "center",
          justifyContent: "center"
        }
      ]}
    >
      {children}
    </Animated.View>
  );
}

function CaptionWrap({ active, children }: { active: boolean; children: React.ReactNode }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, {
        toValue: active ? 1 : 0,
        duration: 400,
        delay: active ? 100 : 0,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(ty, {
        toValue: active ? 0 : 6,
        duration: 500,
        delay: active ? 100 : 0,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [active, op, ty]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { opacity: op, transform: [{ translateY: ty }] }]}
    >
      {children}
    </Animated.View>
  );
}

function SceneDots({ count, active }: { count: number; active: number }) {
  return (
    <View style={s.sceneDots}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 16 : 5,
            height: 5,
            borderRadius: 4,
            backgroundColor: i === active ? theme.ink[1] : "rgba(28,26,23,0.18)"
          }}
        />
      ))}
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCENE 1 · Project context
   ══════════════════════════════════════════════════════════════ */

function SceneProject({ active }: { active: boolean }) {
  const [typed, setTyped] = useState("");
  const [tagsShown, setTagsShown] = useState(0);

  useEffect(() => {
    if (!active) {
      setTyped("");
      setTagsShown(0);
      return;
    }
    let i = 0;
    const typer = setInterval(() => {
      i++;
      setTyped(PROJECT_NAME.slice(0, i));
      if (i >= PROJECT_NAME.length) clearInterval(typer);
    }, 65);
    const t1 = setTimeout(() => setTagsShown(1), 1500);
    const t2 = setTimeout(() => setTagsShown(2), 1800);
    const t3 = setTimeout(() => setTagsShown(3), 2100);
    return () => {
      clearInterval(typer);
      [t1, t2, t3].forEach(clearTimeout);
    };
  }, [active]);

  return (
    <View style={{ width: 280, gap: 12 }}>
      <View style={s.projectChip}>
        <View style={s.projectDot} />
        <View style={{ flex: 1 }}>
          <Meta style={{ marginBottom: 2 }}>WORKING ON</Meta>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={s.projectName}>{typed || " "}</Text>
            {active && typed.length < PROJECT_NAME.length ? <BlinkingCaret /> : null}
          </View>
        </View>
      </View>

      <View>
        <Meta style={{ marginBottom: 8, paddingLeft: 4 }}>SHOULD FEEL</Meta>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {PROJECT_MOODS.map((tag, i) => (
            <Tag key={tag} visible={i < tagsShown} delay={i * 80}>
              {tag}
            </Tag>
          ))}
        </View>
      </View>
    </View>
  );
}

function BlinkingCaret() {
  const op = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0, duration: 1, delay: 350, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 1, delay: 350, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [op]);
  return (
    <Animated.View
      style={{
        width: 1.5,
        height: 16,
        marginLeft: 2,
        backgroundColor: theme.ink[1],
        opacity: op
      }}
    />
  );
}

function Tag({ children, visible, delay }: { children: React.ReactNode; visible: boolean; delay: number }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 400, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0, duration: 400, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      ]).start();
    } else {
      op.setValue(0);
      ty.setValue(8);
    }
  }, [visible, delay, op, ty]);

  return (
    <Animated.View style={[s.tag, { opacity: op, transform: [{ translateY: ty }] }]}>
      <Text style={s.tagText}>{children}</Text>
    </Animated.View>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCENE 2 · Capture
   ══════════════════════════════════════════════════════════════ */

function SceneCapture({ active }: { active: boolean }) {
  const [phase, setPhase] = useState<"aim" | "flash" | "settled">("aim");

  useEffect(() => {
    if (!active) { setPhase("aim"); return; }
    const t1 = setTimeout(() => setPhase("flash"), 1800);
    const t2 = setTimeout(() => setPhase("settled"), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  const settled = phase === "settled";
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase === "flash") {
      flash.setValue(0.8);
      Animated.timing(flash, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start();
    }
  }, [phase, flash]);

  return (
    <View
      style={[
        s.captureFrame,
        settled && s.captureFrameSettled
      ]}
    >
      <View
        style={[
          s.capturePhoto,
          settled && s.capturePhotoSettled
        ]}
      >
        <Image source={KOI_SOURCE} style={s.captureImage} resizeMode="cover" />

        {phase === "aim" ? (
          <>
            <Corner pos="tl" />
            <Corner pos="tr" />
            <Corner pos="bl" />
            <Corner pos="br" />
            <View style={s.reticle} />
            <View style={s.captureChip}>
              <PulseDot color="#D14B2D" />
              <Text style={s.captureChipText}>Pointed at koi street</Text>
            </View>
          </>
        ) : null}

        {phase === "flash" ? (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "#FAF7F0", opacity: flash }
            ]}
          />
        ) : null}
      </View>

      {settled ? (
        <View style={s.captureMeta}>
          <Meta>CAPTURED</Meta>
          <Meta>12.04 · 16:08</Meta>
        </View>
      ) : null}
    </View>
  );
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const top = pos.startsWith("t"), left = pos.endsWith("l");
  return (
    <View
      style={{
        position: "absolute",
        [top ? "top" : "bottom"]: 12,
        [left ? "left" : "right"]: 12,
        width: 16,
        height: 16,
        borderTopWidth: top ? 1.5 : 0,
        borderBottomWidth: !top ? 1.5 : 0,
        borderLeftWidth: left ? 1.5 : 0,
        borderRightWidth: !left ? 1.5 : 0,
        borderColor: "rgba(255,255,255,0.85)"
      }}
    />
  );
}

function PulseDot({ color }: { color: string }) {
  const op = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 600, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [op]);
  return <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: op }} />;
}

/* ══════════════════════════════════════════════════════════════
   SCENE 3 · Scan
   ══════════════════════════════════════════════════════════════ */

function SceneScan({ active }: { active: boolean }) {
  const [phase, setPhase] = useState<"scan" | "palette" | "title">("scan");

  useEffect(() => {
    if (!active) { setPhase("scan"); return; }
    const t1 = setTimeout(() => setPhase("palette"), 2400);
    const t2 = setTimeout(() => setPhase("title"), 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  const scanY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase !== "scan") return;
    scanY.setValue(0);
    Animated.timing(scanY, {
      toValue: 1,
      duration: 2500,
      easing: Easing.linear,
      useNativeDriver: true
    }).start();
  }, [phase, scanY]);

  return (
    <View style={s.card220}>
      <View style={s.scanPhoto}>
        <Image source={KOI_SOURCE} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(28,26,23,0.04)" }]} />

        {phase !== "title" ? (
          <Animated.View
            pointerEvents="none"
            style={[
              s.scanLine,
              { transform: [{ translateY: scanY.interpolate({ inputRange: [0, 1], outputRange: [0, 230] }) }] }
            ]}
          />
        ) : null}

        {phase !== "title" ? (
          <View style={s.captureChip}>
            <ScanGlyph size={14} />
            <Text style={s.captureChipText}>{phase === "scan" ? "Reading palette" : "Finding direction"}</Text>
          </View>
        ) : null}

        {phase === "title" ? (
          <View style={s.scanIconBadge}>
            <ScanGlyph size={14} />
            <Text style={s.captureChipText}>Scan complete</Text>
          </View>
        ) : null}
      </View>

      <View style={s.scanMetaRow}>
        <Meta>SCAN №024</Meta>
        <Meta>5 COLORS</Meta>
      </View>

      <View style={s.swatchRow}>
        {KOI_PALETTE.map((c, i) => (
          <Swatch key={i} color={c} visible={phase === "palette" || phase === "title"} index={i} />
        ))}
      </View>

      <View style={[s.scanTitleWrap, { opacity: phase === "title" ? 1 : 0 }]}>
        <Text style={s.scanTitle}>Wet Pavement, Bright Fish</Text>
      </View>
    </View>
  );
}

function Swatch({ color, visible, index }: { color: string; visible: boolean; index: number }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(4)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 350, delay: index * 110, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0, duration: 350, delay: index * 110, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      ]).start();
    } else {
      op.setValue(0); ty.setValue(4);
    }
  }, [visible, index, op, ty]);
  return (
    <View style={{ flex: 1, height: 22 }}>
      <View style={[s.swatchSkeleton]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: color, borderRadius: 6, opacity: op, transform: [{ translateY: ty }] }
        ]}
      />
    </View>
  );
}

function ScanGlyph({ size = 11 }: { size?: number }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 0.82,
          duration: 520,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 520,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true
        })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return (
    <Animated.View style={[s.scanGlyph, { width: size, height: size, transform: [{ scale }] }]}>
      <View style={[s.scanGlyphCorner, s.scanGlyphTopLeft]} />
      <View style={[s.scanGlyphCorner, s.scanGlyphTopRight]} />
      <View style={[s.scanGlyphCorner, s.scanGlyphBottomLeft]} />
      <View style={[s.scanGlyphCorner, s.scanGlyphBottomRight]} />
    </Animated.View>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCENE 4 · Refine
   ══════════════════════════════════════════════════════════════ */

function SceneRefine({ active }: { active: boolean }) {
  const [stage, setStage] = useState<"orig" | "sweep" | "quiet" | "done">("orig");
  const [direction, setDirection] = useState("Editorial · saturated");
  const pillScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      setStage("orig");
      setDirection("Editorial · saturated");
      pillScale.setValue(1);
      return;
    }
    const t1 = setTimeout(() => {
      Animated.sequence([
        Animated.timing(pillScale, {
          toValue: 0.92,
          duration: 110,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.timing(pillScale, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        })
      ]).start();
    }, 540);
    const t2 = setTimeout(() => setStage("sweep"), 860);
    const t3 = setTimeout(() => { setStage("quiet"); setDirection("Quiet luxury · muted"); }, 1850);
    const t4 = setTimeout(() => setStage("done"), 3150);
    return () => { [t1, t2, t3, t4].forEach(clearTimeout); };
  }, [active, pillScale]);

  const wandX = useRef(new Animated.Value(-30)).current;

  useEffect(() => {
    if (stage !== "sweep") {
      wandX.setValue(-30);
      return;
    }
    Animated.timing(wandX, {
      toValue: 280,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [stage, wandX]);

  return (
    <View style={{ position: "relative", width: 280 }}>
      <View style={s.refineCard}>
        <View style={s.refinePhotoStrip}>
          <Image source={KOI_SOURCE} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(28,26,23,0.04)" }]} />
          {stage === "sweep" ? (
            <Animated.View pointerEvents="none" style={[s.refineSweep, { transform: [{ translateX: wandX }] }]} />
          ) : null}
        </View>

        <View style={s.refineMetaRow}>
          <Meta>DIRECTION</Meta>
          <Text style={s.refineDirection}>{direction}</Text>
        </View>

        <View style={s.swatchStack}>
          <View style={[s.swatchRowTall, { opacity: stage === "orig" || stage === "sweep" ? 1 : 0 }]}>
            {KOI_PALETTE.map((c, i) => (
              <RefineSwatch key={`orig-${i}`} color={c} />
            ))}
          </View>
          <View style={[s.swatchRowTall, s.swatchRowTallOverlay, { opacity: stage === "quiet" || stage === "done" ? 1 : 0 }]}>
            {KOI_PALETTE_QUIET.map((c, i) => (
              <RefineSwatch key={`quiet-${i}`} color={c} />
            ))}
          </View>
        </View>
      </View>

      <Animated.View style={[s.refinePill, { transform: [{ scale: pillScale }] }]}>
        <Text style={{ color: "#fff", fontSize: 12 }}>✦</Text>
        <Text style={s.refinePillText}>Refine</Text>
      </Animated.View>
    </View>
  );
}

function RefineSwatch({ color }: { color: string }) {
  // Smooth color transition (animation not really needed since RN can't tween
  // backgroundColor on UI thread; the state-change crossfade gives the effect).
  return <View style={[s.swatchTall, { backgroundColor: color }]} />;
}

/* ══════════════════════════════════════════════════════════════
   SCENE 5 · Share
   ══════════════════════════════════════════════════════════════ */

function SceneShare({ active }: { active: boolean }) {
  const [phase, setPhase] = useState<"idle" | "sending" | "landed" | "reply">("idle");

  useEffect(() => {
    if (!active) { setPhase("idle"); return; }
    const t1 = setTimeout(() => setPhase("sending"), 400);
    const t2 = setTimeout(() => setPhase("landed"), 1300);
    const t3 = setTimeout(() => setPhase("reply"), 2000);
    return () => { [t1, t2, t3].forEach(clearTimeout); };
  }, [active]);

  const showStatus = phase !== "idle";
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardScale, {
        toValue: phase === "idle" ? 1 : 0.86,
        duration: 800,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(cardY, {
        toValue: phase === "idle" ? 18 : 0,
        duration: 800,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [phase, cardScale, cardY]);

  return (
    <View style={s.shareThread}>
      <View style={s.outgoingMessage}>
        <Animated.View
          style={[
            s.shareCard,
            { transform: [{ translateY: cardY }, { scale: cardScale }] }
          ]}
        >
          <View style={s.shareCardPhoto}>
            <Image source={KOI_SOURCE} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          </View>
          <View style={s.shareCardPalette}>
            {KOI_PALETTE_QUIET.map((c, i) => (
              <View key={i} style={[s.shareCardSwatch, { backgroundColor: c }]} />
            ))}
          </View>
          <Text style={s.shareCardTitle}>Wet Pavement, Bright Fish</Text>
        </Animated.View>

        <View style={[s.deliveredRow, { opacity: showStatus ? 1 : 0 }]}>
          <Meta>{phase === "sending" ? "SENDING..." : "DELIVERED"}</Meta>
        </View>
      </View>

      <View style={s.replySlot}>
        {phase === "reply" ? <ReplyBubble /> : null}
      </View>
    </View>
  );
}

function ReplyBubble() {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    ]).start();
  }, [op, ty]);
  return (
    <Animated.View
      style={[s.replyWrap, { opacity: op, transform: [{ translateY: ty }] }]}
    >
      <View style={s.avatar}>
        <Text style={{ fontFamily: theme.font.display, fontSize: 12, color: theme.ink[1] }}>M</Text>
      </View>
      <View>
        <View style={s.replyBubble}>
          <Text style={s.replyText}>ok this is unreal 🐟</Text>
        </View>
        <Meta style={{ marginTop: 6, marginLeft: 4, fontSize: 9.5 }}>MEL · NOW</Meta>
      </View>
    </Animated.View>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCENE 6 · Library
   ══════════════════════════════════════════════════════════════ */

function SceneLibrary({ active }: { active: boolean }) {
  const TILES = [
    { src: KOI_SOURCE,            pal: KOI_PALETTE_QUIET,      title: "Wet Pavement" },
    { src: GARDEN_SOURCE,         pal: GARDEN_PALETTE_QUIET,   title: "Tools, Earth" },
    { src: MOSAIC_SOURCE,         pal: STUDIO_PALETTE,         title: "Mosaic Mask" },
    { src: FISH_SIGN_SOURCE,      pal: ARCHITECTURE_PALETTE,   title: "Fish Sign" }
  ];

  return (
    <View style={{ width: 260 }}>
      <View style={s.libraryHeader}>
        <Meta>YOUR LIBRARY</Meta>
        <Meta>04 SCANS</Meta>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {TILES.map((t, i) => (
          <LibraryTile key={i} {...t} active={active} index={i} />
        ))}
      </View>
    </View>
  );
}

function LibraryTile({ src, pal, title, active, index }: { src: ImageSourcePropType; pal: string[]; title: string; active: boolean; index: number }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    if (active) {
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 500, delay: 100 + index * 100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0, duration: 500, delay: 100 + index * 100, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      ]).start();
    } else {
      op.setValue(0); ty.setValue(16);
    }
  }, [active, index, op, ty]);
  return (
    <Animated.View
      style={[
        s.libraryTile,
        { opacity: op, transform: [{ translateY: ty }] }
      ]}
    >
      <View style={{ width: "100%", aspectRatio: 1, overflow: "hidden" }}>
        <Image source={src} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      </View>
      <View style={{ padding: 8, gap: 6 }}>
        <Text style={s.libraryTitle}>{title}</Text>
        <View style={{ flexDirection: "row", gap: 2 }}>
          {pal.map((c, j) => (
            <View key={j} style={{ flex: 1, height: 6, borderRadius: 2, backgroundColor: c }} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

/* ══════════════════════════════════════════════════════════════
   STYLES
   ══════════════════════════════════════════════════════════════ */

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: theme.palette.bone
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sceneDots: {
    flexDirection: "row",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: theme.palette.glass,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    ...theme.shadow.pill
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 8,
    gap: 2
  },
  wordmarkDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#C5683E",
    marginBottom: -2
  },
  stage: {
    width: "100%",
    height: 330,
    position: "relative"
  },
  stageScan: {
    height: 360
  },
  stageShare: {
    height: 360
  },
  stageLibrary: {
    height: 430
  },
  captionStage: {
    width: "100%",
    height: 96,
    marginTop: 4,
    position: "relative"
  },
  captionScan: {
    marginTop: 12
  },
  captionShare: {
    marginTop: 0
  },
  captionLibrary: {
    marginTop: -6
  },
  ghost: {
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  ctaStack: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
    gap: 8
  },
  primaryCta: {
    width: "100%"
  },
  ghostText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 14,
    color: theme.ink[2]
  },

  /* Project */
  projectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: theme.palette.paper,
    borderRadius: 18,
    ...theme.shadow.lifted
  },
  projectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.ink[1]
  },
  projectName: {
    fontFamily: theme.font.display,
    fontSize: 17,
    lineHeight: 20,
    color: theme.ink[1]
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.palette.paper,
    borderRadius: 999,
    ...theme.shadow.quiet
  },
  tagText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 12.5,
    color: theme.ink[1]
  },

  /* Capture */
  captureFrame: {
    width: 220
  },
  captureFrameSettled: {
    padding: 10,
    paddingBottom: 12,
    backgroundColor: theme.palette.paper,
    borderRadius: 22,
    ...theme.shadow.lifted
  },
  capturePhoto: {
    width: "100%",
    aspectRatio: 1 / 1.15,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(28,26,23,0.08)"
  },
  capturePhotoSettled: {
    borderRadius: 14,
    borderWidth: 0
  },
  captureImage: {
    width: "100%",
    height: "100%"
  },
  reticle: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 22,
    height: 22,
    marginLeft: -11,
    marginTop: -11,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.7)"
  },
  captureChip: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(255,252,245,0.88)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)"
  },
  captureChipText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 10.5,
    color: theme.ink[1]
  },
  scanIconBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(255,252,245,0.9)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)"
  },
  scanGlyph: {
    width: 11,
    height: 11,
    position: "relative"
  },
  scanGlyphCorner: {
    position: "absolute",
    width: 4,
    height: 4,
    borderColor: theme.ink[1]
  },
  scanGlyphTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 1.3,
    borderLeftWidth: 1.3
  },
  scanGlyphTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 1.3,
    borderRightWidth: 1.3
  },
  scanGlyphBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 1.3,
    borderLeftWidth: 1.3
  },
  scanGlyphBottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 1.3,
    borderBottomWidth: 1.3
  },
  captureMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 4,
    paddingTop: 8
  },

  /* Scan */
  card220: {
    width: 220,
    padding: 10,
    paddingBottom: 12,
    backgroundColor: theme.palette.paper,
    borderRadius: 22,
    ...theme.shadow.lifted
  },
  scanPhoto: {
    width: "100%",
    aspectRatio: 1 / 1.05,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    backgroundColor: theme.palette.putty
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 28,
    backgroundColor: "rgba(250,247,240,0.26)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(28,26,23,0.24)",
    shadowColor: "#FAF7F0",
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 }
  },
  scanMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 4
  },
  swatchRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 4,
    paddingBottom: 6
  },
  swatchSkeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(28,26,23,0.06)",
    borderRadius: 6
  },
  scanTitleWrap: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 2,
    minHeight: 38
  },
  scanTitle: {
    fontFamily: theme.font.display,
    fontSize: 17,
    lineHeight: 19,
    color: theme.ink[1]
  },

  /* Refine */
  refineCard: {
    padding: 10,
    paddingBottom: 12,
    backgroundColor: theme.palette.paper,
    borderRadius: 22,
    ...theme.shadow.lifted
  },
  refinePhotoStrip: {
    width: "100%",
    height: 110,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative"
  },
  refineSweep: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: -72,
    width: 72,
    backgroundColor: "rgba(250,247,240,0.28)",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.42)",
    shadowColor: "#FAF7F0",
    shadowOpacity: 0.7,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 }
  },
  refineMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 4
  },
  refineDirection: {
    fontFamily: theme.font.sansMedium,
    fontSize: 11,
    color: theme.ink[1]
  },
  swatchRowTall: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 4,
    paddingBottom: 6
  },
  swatchStack: {
    position: "relative"
  },
  swatchRowTallOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0
  },
  swatchTall: {
    flex: 1,
    height: 28,
    borderRadius: 6
  },
  refinePill: {
    position: "absolute",
    top: -10,
    right: -10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: theme.ink[1],
    borderRadius: 999,
    ...theme.shadow.fab
  },
  refinePillText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 11.5,
    color: "#fff"
  },

  /* Share */
  shareThread: {
    width: 280,
    alignSelf: "flex-end",
    marginRight: 16,
    justifyContent: "flex-start",
    paddingTop: 10,
    gap: 10
  },
  outgoingMessage: {
    alignSelf: "flex-end",
    alignItems: "flex-end"
  },
  shareCard: {
    width: 190,
    padding: 8,
    paddingBottom: 10,
    backgroundColor: theme.palette.paper,
    borderRadius: 20,
    ...theme.shadow.lifted
  },
  shareCardPhoto: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.palette.putty
  },
  shareCardPalette: {
    flexDirection: "row",
    gap: 3,
    paddingTop: 6,
    paddingHorizontal: 2,
    paddingBottom: 2
  },
  shareCardSwatch: {
    flex: 1,
    height: 10,
    borderRadius: 2
  },
  shareCardTitle: {
    fontFamily: theme.font.display,
    fontSize: 14,
    lineHeight: 15.4,
    paddingHorizontal: 2,
    paddingTop: 4,
    color: theme.ink[1]
  },
  deliveredRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingRight: 2,
    paddingTop: 3
  },
  replySlot: {
    minHeight: 58,
    justifyContent: "flex-start",
    alignSelf: "stretch"
  },
  replyWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    maxWidth: 220
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#D9CBB1",
    alignItems: "center",
    justifyContent: "center"
  },
  replyBubble: {
    backgroundColor: theme.palette.paper,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...theme.shadow.quiet
  },
  replyText: {
    fontFamily: theme.font.sans,
    fontSize: 13.5,
    color: theme.ink[1]
  },

  /* Library */
  libraryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10
  },
  libraryTile: {
    width: "47%", // gives a 2-col grid with the 12px gap
    backgroundColor: theme.palette.paper,
    borderRadius: 14,
    overflow: "hidden",
    ...theme.shadow.quiet
  },
  libraryTitle: {
    fontFamily: theme.font.display,
    fontSize: 12,
    lineHeight: 13,
    color: theme.ink[1]
  }
});
