# design_handoff_v1.md

## 1. Overview

This app allows users to scan real-world inspiration and convert it into a structured, shareable inspiration card containing:
- color palette
- texture descriptors
- vibe tags
- font recommendations
- related inspiration

The app is dark-mode-first, premium, and visually expressive but clean.

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
- purple primary
- white text

Card:
- dark surface
- rounded corners
- padding

Tag:
- pill shape
- subtle background

Color Swatch:
- clickable
- evenly spaced

---

## 5. Design Tokens

Colors:
- background: #0F0F0F
- surface: #1A1A1A
- primary: #7B61FF
- text primary: #FFFFFF
- text secondary: #A0A0A0

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

- dark mode only
- minimal but expressive
- purple accent usage
- strong spacing
- smooth subtle animations

---

## 7. Assets

- app icon
- splash logo
- onboarding visuals
- paywall visual
- share card template
