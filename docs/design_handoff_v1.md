# Palleto Design System

## Overview

Palleto uses the v2 "Bone" design system: a warm, editorial, iOS-native interface where the app chrome stays quiet and scanned inspiration provides the color. Product surfaces should feel like paper, glass, and collected visual artifacts rather than a dark utility dashboard.

This document is the canonical source for new product work. Preserve existing behavior, routes, auth, paywall gates, analytics, and API contracts when applying these visual patterns.

## Visual Direction

- Background: warm bone `#F2EEE4`.
- Elevated surfaces: paper white `#FFFFFF`, linen `#FAF7F0`, putty `#F7F4ED`.
- Ink: primary `#1C1A17`, body `#4A4640`, meta `#8B847A`, hint `#B8B1A4`.
- Lines: soft warm hairlines using `rgba(28,26,23,0.07)` and stronger dividers using `rgba(28,26,23,0.14)`.
- Color usage: scanned images, extracted palettes, share cards, and user content carry the chromatic energy. Do not introduce dominant app-level accent colors or gradients.
- Shape: generous rounded rectangles and pills. Use `24-32px` radius for content cards and `999px` radius for pills.
- Depth: use soft layered shadows, especially for floating navigation, cards, and CTAs.

## Typography

- Display/editorial: Instrument Serif.
- UI/body: Inter Tight.
- Meta/code/system labels: JetBrains Mono.
- Keep letter spacing at `0` unless a mono uppercase meta label needs subtle positive tracking.
- Use large serif type for hero/result titles and restrained sans type for controls and body copy.

## Mobile Tokens

Use `mobile/src/theme.ts` for all new mobile styling.

Key token groups:

- `theme.palette`: `bone`, `linen`, `paper`, `putty`, `glass`, `line`, `lineStrong`.
- `theme.ink`: `1`, `2`, `3`, `4`.
- `theme.font`: `display`, `displayItalic`, `sans`, `sansMedium`, `sansSemibold`, `mono`, `monoMedium`.
- `theme.shadow`: `quiet`, `lifted`, `floating`, `pill`, `fab`.

Legacy fields like `theme.colors.background`, `theme.colors.surface`, and `theme.radius.medium` remain for older screens and map into the new visual system.

## Mobile Components

Prefer the primitives in `mobile/src/ui` for new or touched screens:

- `Screen` / `ScrollScreen`: bone screen wrappers with safe-area handling.
- `Display`, `DisplayItalic`, `Headline`, `Body`, `Meta`: typography primitives.
- `Pill`, `Button`, `Chip`, `ProjectChip`: controls and compact labels.
- `TopBar`, `TabBar`: floating navigation chrome.
- `SectionCard`, `Tile`: content containers.
- `PaletteRow`, `PaletteGrid`, `PaletteHero`: palette display.

## Core Screens

- Onboarding: keep the real pre-auth scan hook intact. Use warm bone surfaces, serif headlines, glass/ink pills, and user scan imagery as the color source.
- Capture: preserve camera/library behavior. Visual controls should feel floating and minimal over the capture surface.
- Processing: keep the visual scanning/processing loop alive until generation finishes; avoid dead loading time.
- Result/Card Detail: prioritize the image, palette, creative read, project lens, type direction, related inspiration, and locked Share/Save/Refine gateways.
- Library: use artifact-like tiles, palette strips, and floating bottom navigation.
- Profile/Project Intake/Auth/Locked Feature/Refine: inherit tokens at minimum, then convert to primitives when touched.

## Sharing Surfaces

Public share URLs and share images must use the same Bone system:

- `/s/{share_token}`: warm share page with paper panels, serif title, ink/body/meta hierarchy, and palette-driven color.
- `/og/share/{share_token}.png`: iMessage/social preview image using bone background, paper card, rounded captured image, title/read, and palette chips.
- `/share/card/{share_token}.png`: shareable artifact image using the same palette and typography direction.

Do not change the public route contracts or metadata fields while updating visuals.

## Behavior Guardrails

Visual updates must not change:

- Auth/onboarding routing.
- RevenueCat entitlement checks and locked feature gates.
- Capture permissions, selected image shape, upload quality, or scan API calls.
- Library refresh behavior.
- Share creation, share URL generation, native share flows, or public share routes.
- Analytics event names and trigger points.
