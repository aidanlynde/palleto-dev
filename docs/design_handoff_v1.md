# design_handoff_v1.md

## 1. Overview

This app allows users to scan real-world inspiration and convert it into a structured, shareable inspiration card containing:
- color palette
- texture descriptors
- vibe tags
- font recommendations
- related inspiration

The app should feel premium, restrained, and content-first. The core UI should be neutral black and white with both light and dark mode support. User-uploaded inspiration, generated color palettes, textures, imagery, and inspo cards should provide the visual color in the experience.

---

## 2. Navigation Flow

- Splash → Onboarding (3 screens)
- Onboarding → Auth
- Auth → Home
- Home → Scan
- Scan → Processing
- Processing → Result Card
- Result Card → Save / Share / Library
- Library → Card Detail
- Paywall triggered after free scan limit

---

## 3. Core Screens

### Home Screen
Purpose: entry point  
Layout:
- title at top
- large Scan button
- recent cards horizontal scroll

---

### Scan Screen
- camera view
- capture button bottom center
- upload from gallery

---

### Processing Screen
- loader
- text: "Analyzing inspiration..."

---

### Result Card Screen (CORE)

Structure:
1. Image
2. Color Palette (4–6 swatches)
3. Texture tags
4. Vibe tags
5. Font recommendations
6. Related inspiration (list)
7. Actions: Save / Share

---

### Library Screen
- grid (2 columns)
- scrollable
- tap for detail

---

### Card Detail
- full scrollable card
- persistent actions

---

### Paywall
- headline: Unlock unlimited inspiration
- features:
  - unlimited scans
  - deeper analysis
  - full library
- pricing CTA

---

## 4. Components

Button:
- rounded
- neutral primary treatment
- high-contrast text
- subtle state changes

Card:
- neutral surface
- rounded corners
- padding

Tag:
- pill shape
- subtle background
- optional subtle color only when it helps communicate meaning

Color Swatch:
- clickable
- evenly spaced
- color comes from the analyzed inspiration, not the app theme

---

## 5. Design Tokens

Colors:
- light background: #FFFFFF
- light surface: #F6F6F6
- light border: #E5E5E5
- light text primary: #0A0A0A
- light text secondary: #5F5F5F
- dark background: #000000
- dark surface: #141414
- dark border: #2A2A2A
- dark text primary: #FFFFFF
- dark text secondary: #A3A3A3
- primary action light: #0A0A0A
- primary action dark: #FFFFFF
- semantic success: #2E7D32
- semantic warning: #B26A00
- semantic error: #C62828
- semantic info: #1565C0

Color Usage:
- The product chrome should stay black, white, and grayscale.
- Avoid branded color themes, large tinted backgrounds, and decorative gradients.
- User content is the main source of color: uploaded images, extracted palettes, inspo cards, and related inspiration.
- Use subtle semantic colors only for status, validation, alerts, and small indicators.
- Vibe tickers or vibe tags may use restrained accent colors when they clarify category or mood, but should not dominate the screen.

Radius:
- small: 8
- medium: 16
- large: 24

Spacing:
- xs: 4
- sm: 8
- md: 16
- lg: 24
- xl: 32

Typography:
- clean sans-serif
- bold headers
- readable body

---

## 6. Visual Style

- light and dark mode
- minimal, neutral, and content-first
- black and white product UI
- color reserved for user content, extracted palettes, semantic states, and subtle vibe indicators
- strong spacing
- smooth subtle animations
- avoid app-level color treatments that compete with uploaded inspiration

---

## 7. Assets

- app icon
- splash logo
- onboarding visuals
- paywall visual
- share card template
