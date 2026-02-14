# Preferred Tech Stack & Implementation Rules

When generating code or UI components for Laapak, you **MUST** strictly adhere to the following technology choices and "feel" guidelines.

## Core Stack

* **Framework:** Flutter (Dart)
* **Design System:** Material 3 (Customized for "Calm & Minimal" feel)
* **Typography Engine:** `google_fonts` package (Noto Sans Arabic)
* **Icons:** Material Icons (Outlined preferred)
* **Animations:** Lottie (for loading and transitions)

## Implementation Guidelines

### 1. System "Feel" & UX
* **Calm & Minimal:** Avoid loud animations or excessive shadows. The app should feel quiet and efficient.
* **Flat Design:** Most components should have **Elevation 0**. Use subtle background colors (`surfaceVariant`) or thin borders instead of shadows to create hierarchy.
* **Interaction:** Disable standard Material ripple effects and splash shadows to maintain the "calm" feel (`NoSplash.splashFactory`).

### 2. Component Patterns

* **Buttons (The Laapak Style):**
    * **Shape:** Always Pill-shaped (`Responsive.buttonRadius` = 30.0).
    * **State:** Use `LoadingButton` widget. It must show a Lottie animation instead of a standard spinner.
    * **Feedback:** NO ripple, NO shadow on press. The interaction is visual via state change, not through standard Material ink sparks.
    * **Primary:** `laapakGreenGradient` or solid `primary`.
* **Inputs:** 12px radius, `surfaceVariant` background. Should feel "integrated" rather than "floating".
* **Cards & Dialogs:** 14px-16px radius. Flat by default, only use elevation/shadow for critical overlays or lists.

### 3. Navigation Style
* **RTL-First:** All navigation must default to Right-to-Left (Arabic). Use `Directionality` widgets if not inherited.
* **App Bars:**
    * **Flat:** Elevation must be **0**.
    * **Colors:** Background should always match the scaffold background.
    * **Icons:** Use `Icons.arrow_back_ios_outlined`. Note that in RTL, the back arrow points right.
* **Dashboard Navigation:** For main menus, use a list of `OutlinedButton` or `TextButton` items spanning the full width. Text should be on the right (start) and a trailing icon on the left (end).
* **Transitions:** Maintain standard `MaterialPageRoute` but ensure no ripple noise is present during interaction.
* **Global Overlays:** Respect global UI elements like the `CartOverlay` which may sit above the main navigator.

### 4. Forbidden Patterns

* **NO Ripple/Splash:** Do not allow standard `InkWell` or button ripples.
* **NO Harsh Shadows:** Avoid large, dark shadows.
* **NO Hardcoded Sizing:** Always use the `Responsive` utility class for any padding, margin, or radius.
* **NO Material Defaults:** Never use default Material 3 color schemes or button styles without customization.
* **NO Elevation:** Avoid non-zero elevation on AppBars or Cards unless creating a specific overlay effect.
