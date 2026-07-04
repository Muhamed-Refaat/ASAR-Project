---
name: Industrial Control Interface
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb3ad'
  on-tertiary: '#68000a'
  tertiary-container: '#ff5451'
  on-tertiary-container: '#5c0008'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  telemetry-lg:
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.01em
  telemetry-md:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.2'
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-page: 24px
  card-padding: 20px
  stack-gap: 12px
---

## Brand & Style

The design system is engineered for high-stakes industrial environments where precision, safety, and rapid data interpretation are paramount. The brand personality is authoritative, technical, and hyper-functional, evoking the feeling of advanced aerospace or robotics mission control. 

The aesthetic leverages a **Modern Industrial** style, blending a dark, foundational palette with **Glassmorphism** for depth and **Technical Minimalism** for clarity. This design system prioritizes a "heads-up display" (HUD) experience, where critical information is surfaced through high-contrast alerts and secondary telemetry is recessed into logical, translucent containers. The goal is to reduce cognitive load during complex robotic operations while maintaining an ultra-modern, futuristic edge.

## Colors

The color strategy is rooted in a deep charcoal and navy foundation to minimize eye strain in low-light industrial settings.

*   **Foundation:** The base uses a deep navy (#0F172A) with a darker canvas (#020617) to provide maximum depth.
*   **Primary (Cyber Blue):** Used for active controls, navigation, and standard telemetry data. It represents the "pulse" of the system.
*   **Status (Emerald Green):** Reserved exclusively for "Ready," "Online," or "Successful" states.
*   **Alert (Safety Red):** High-impact usage for "STOP" commands, emergency overrides, and critical hardware failures.
*   **Neutral/Data:** Grays and off-whites are used for secondary labels and inactive states to ensure the primary action colors pop against the dark background.

## Typography

This design system utilizes a dual-font approach to distinguish between interface guidance and technical data.

1.  **Inter (Sans-Serif):** Used for all UI labels, buttons, navigation, and instructional text. It provides a clean, neutral, and highly legible foundation across all resolutions.
2.  **JetBrains Mono (Monospace):** Reserved for all numeric output, coordinates, sensor readings, and timestamps. The fixed-width character alignment ensures that rapidly changing values do not cause visual "jitter" on the dashboard.

For mobile or small-scale industrial tablets, reduce `headline-lg` to 24px and prioritize `telemetry-md` for primary data readouts to maintain density without sacrificing legibility.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy on desktop, utilizing a 12-column system to align complex telemetry modules. On mobile and handheld control units, the system reflows into a single-column stack with persistent bottom-anchored safety controls.

*   **Grid:** 16px gutters provide breathing room between dense data cards.
*   **Rhythm:** A 4px baseline grid ensures consistent vertical alignment of telemetry rows.
*   **Grouping:** Information is logically grouped into "Control Modules" (cards). Spacing between modules is larger (24px) than the spacing within a module (12px) to clearly define functional boundaries.

## Elevation & Depth

Visual hierarchy in this design system is achieved through **Glassmorphism** and **Tonal Layering** rather than traditional drop shadows.

*   **Layer 0 (Canvas):** Darkest navy, pure matte background.
*   **Layer 1 (Modules):** Semi-transparent cards with a `backdrop-filter: blur(12px)` and a subtle 1px border (`rgba(255,255,255,0.1)`). This creates a sense of the UI floating over the machine's operating system.
*   **Layer 2 (Overlays/Modals):** Increased transparency and a brighter border to signify high-priority temporary interaction.
*   **Interactive States:** Elements "glow" rather than "lift." Use outer glows (bloom) for active status indicators and primary buttons instead of heavy shadows.

## Shapes

The shape language reflects a "Precision Industrial" aesthetic. While the core foundation is geometric and rigid, corners are softened to 12px (Rounded) to make the high-tech interface feel modern and ergonomic.

*   **Standard Containers:** 12px corner radius.
*   **Inner Elements:** Small buttons or input fields within cards use a nested radius of 8px to maintain visual harmony.
*   **Status Indicators:** Small circular pips for "Live" indicators, but rectangular with 4px radii for "Mode" tags.

## Components

*   **Emergency Stop (E-Stop):** A massive, high-contrast button using Safety Red (#EF4444). It should be the most prominent element on the screen, often persistent or anchored.
*   **Telemetry Cards:** These utilize the Glassmorphism effect. The header contains the label in Monospaced text, while the value is displayed in `telemetry-lg`.
*   **Primary Buttons:** Cyber Blue foundation with white text. Use a subtle glow effect on hover to indicate system responsiveness.
*   **Action Chips:** Small, semi-transparent pills used for toggling robot modes (e.g., "Manual," "Auto," "Teach").
*   **Input Fields:** Darker than the card background with a 1px Cyber Blue border focus state. Use monospaced font for numeric inputs.
*   **Live Graphs:** Line charts should use a 2px stroke width in Cyber Blue or Emerald Green, set against a subtle grid background within the telemetry cards.
*   **Status Badges:** High-saturation backgrounds with white text for immediate state identification (e.g., "CALIBRATING," "EXECUTING").