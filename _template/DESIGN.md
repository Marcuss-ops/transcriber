---
name: Precision Utility
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 64px
  container-max: 1100px
---

## Brand & Style

The design system is built on the principles of **Industrial Precision** and **High-Fidelity Utility**. It aims to evoke the reliability of legacy desktop installers while utilizing the fluid, responsive capabilities of modern web technologies. The interface should feel like a specialized tool: robust, predictable, and remarkably clean.

The aesthetic blends **Minimalism** with a **Corporate Modern** foundation. It prioritizes information density without clutter, using ample negative space to frame functional zones. The emotional goal is to instill confidence in the user that the software is powerful enough for professional workloads but modern enough to be effortless.

## Colors

The palette is anchored in professional deep blues and slate grays, creating a "workspace" environment that reduces eye strain during long sessions.

- **Primary (#0F172A):** A deep Navy used for high-level navigation, headings, and critical structural elements.
- **Secondary (#64748B):** A muted Slate used for supporting text, icons, and secondary actions.
- **Accent (#0EA5E9):** A vibrant Electric Blue used sparingly for primary call-to-actions, progress indicators, and active states.
- **Neutral (#F8FAFC):** A crisp, cool white/gray base that provides the "modern installer" feel.

In dark mode, these colors shift to a higher-contrast logic where the neutral becomes the primary background, and deep blues act as surface containers.

## Typography

This design system utilizes **Inter** exclusively to maintain a systematic, utilitarian aesthetic. The type scale is optimized for high legibility in data-dense environments.

- **Headlines:** Use tighter letter spacing and heavier weights to create a strong hierarchy.
- **Body:** Standardized at 16px for primary reading and 14px for metadata/secondary descriptions.
- **Labels:** Small, uppercase labels are used for categorization and technical metadata to mimic the "pro tool" look.
- **Mobile Adjustments:** For viewport widths below 768px, `display-lg` should scale down to 24px to ensure the interface remains usable on smaller windows or devices.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The main application window acts as a fixed-width container (mimicking an installer) up to `1100px`, after which it centers with wide margins.

- **Grid:** An 8px base unit governs all dimensions.
- **Margins:** 24px (md) is the standard padding for cards and main content blocks.
- **Gutters:** 12px (sm) is used for spacing between related functional components.
- **Responsive Behavior:** On tablet, the sidebar collapses into a bottom bar or hamburger menu. On mobile, the 2-column transcription view stacks into a single vertical stream.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layering** supplemented by **Low-Contrast Outlines**.

- **Level 0 (Background):** Neutral #F8FAFC.
- **Level 1 (Containers):** White (#FFFFFF) surfaces with a subtle 1px border (#E2E8F0).
- **Level 2 (Interactive):** Elements like cards or dropdowns use a very soft ambient shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.05)`.
- **Active State:** Elements being dragged or actively edited receive a slightly deeper shadow and a 2px accent border to signal focus.

## Shapes

The shape language is consistent and "Soft-Industrial." 

- **Components:** Standard buttons, inputs, and chips use a `0.5rem` (8px) radius.
- **Large Containers:** Cards and main panel wrappers use `1rem` (16px) for a modern, distinct feel.
- **Micro-elements:** Checkboxes and radio buttons use a smaller `4px` radius to maintain a crisp, sharp look.

## Components

### Buttons
- **Primary:** Solid #0EA5E9 background with white text. High-contrast, rounded-md.
- **Secondary:** Transparent background with #64748B text and a 1px slate border.
- **Ghost:** No background or border; shifts to a very light gray on hover. Used for utility actions.

### Input Fields
- Structured with a light gray background (#F1F5F9) and a 1px border. Focus state triggers an `Accent` color ring with 20% opacity.

### Transcription Cards
- White background, 1px border, and `rounded-lg`. Headers should use `label-caps` for timestamps.

### Waveform Visualizer
- The core functional component. Use a simplified bar-style waveform in `Secondary` color, with the "played" portion filling in the `Accent` color.

### Progress Bars
- Thin (4px - 8px) with a subtle track background (#E2E8F0) and a vibrant `Accent` fill. No rounded caps for a more technical appearance.

### Chips / Badges
- Used for speaker identification (e.g., "Speaker 1"). Use low-saturation background tints of the primary colors to avoid visual noise.