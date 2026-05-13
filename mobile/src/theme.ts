/**
 * Palleto · v2 "Bone" theme
 *
 * Drop-in replacement for src/theme.ts. Backward-compatible with the
 * legacy field names (colors.background, colors.surface, etc.) so
 * untouched screens compile + inherit the new look immediately.
 *
 * Add `palette`, `ink`, `font`, `shadow` for new components.
 */

export const theme = {
  // ─── Legacy field names — keep for back-compat ───────────────
  colors: {
    background: "#F2EEE4",     // warm bone (was pure black)
    surface: "#FFFFFF",        // floating card (was #141414)
    surfaceSoft: "#F7F4ED",    // inset chip
    border: "rgba(28,26,23,0.07)", // warm hairline (was #2A2A2A)
    borderStrong: "rgba(28,26,23,0.14)",
    primary: "#1C1A17",        // ink (was #FFFFFF)
    textPrimary: "#1C1A17",    // ink
    textSecondary: "#8B847A",  // ink-3
    error: "#9B2B2B"           // muted warm red (was #C62828)
  },

  // ─── New token groups ───────────────────────────────────────
  ink: {
    1: "#1C1A17",  // primary
    2: "#4A4640",  // body
    3: "#8B847A",  // tertiary, meta
    4: "#B8B1A4"   // hint
  },

  palette: {
    bone: "#F2EEE4",
    linen: "#FAF7F0",
    paper: "#FFFFFF",
    putty: "#F7F4ED",
    glass: "rgba(255,252,245,0.78)",  // for blur pills
    line: "rgba(28,26,23,0.07)",
    lineStrong: "rgba(28,26,23,0.14)"
  },

  radius: {
    // legacy
    small: 12,
    medium: 18,
    large: 24,
    // new
    xs: 8,
    sm: 12,
    md: 18,
    lg: 24,
    xl: 32,
    pill: 999
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },

  font: {
    display: "InstrumentSerif_400Regular",
    displayItalic: "InstrumentSerif_400Italic",
    sans: "InterTight_400Regular",
    sansMedium: "InterTight_500Medium",
    sansSemibold: "InterTight_600SemiBold",
    mono: "JetBrainsMono_400Regular",
    monoMedium: "JetBrainsMono_500Medium"
  },

  // RN shadow helpers — spread these into style objects.
  shadow: {
    quiet: {
      shadowColor: "#1C160A",
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1
    },
    lifted: {
      shadowColor: "#1C160A",
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3
    },
    floating: {
      shadowColor: "#1C160A",
      shadowOpacity: 0.10,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 12 },
      elevation: 6
    },
    pill: {
      shadowColor: "#1C160A",
      shadowOpacity: 0.07,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2
    },
    fab: {
      shadowColor: "#1C160A",
      shadowOpacity: 0.22,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8
    }
  }
} as const;

export type Theme = typeof theme;
