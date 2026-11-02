# Mobile wide-diagram workspace

New files: `web/calisma-alani.js`, `web/calisma-alani.css` (MIT).
Load the stylesheet after the original styles and the classic script after the
source application. The source `app.js` and solver are unchanged.

At viewport widths up to 900 px, the existing `#cizim` plot is displayed as a
1120 × 720 px landscape canvas within a bounded mobile viewport. The point
inputs and original view presets stay outside it at normal readable size.
The overall page does not acquire horizontal scrolling.

- **Pan / Gezin**: one-finger dragging, two-finger pinching, wheel/trackpad
  scrolling and accessible arrow buttons move the plot. Translation is not
  clamped, so blank workspace can be explored in any direction.
- **Select point / Nokta seç**: the gesture shield is removed from pointer hit
  testing. Original diagram selection and keyboard-operable constituent labels
  continue to work. The source `svgNokta()` helper is wrapped to divide by the
  workspace CSS zoom; this retains correct C/T coordinates without dispatching
  synthetic pointer events or changing the original file.
- **Lock view / Görünümü kilitle**: disables workspace translation and zoom.
  Point selection still works in selection mode. Zoom and pan buttons expose
  their disabled state and the lock button exposes `aria-pressed`.
- **+/−**, **1:1**, **fit**, and four directional buttons provide single-pointer
  alternatives to dragging and pinching. When the workspace itself is focused,
  arrow keys pan, +/− zoom, and 0 resets. When the actual SVG is focused, its
  original arrow-key point selection remains unchanged.

The plot zoom is bounded to 20–300%; translation is unbounded. Zoom is anchored
to the viewport centre or pinch midpoint. The lock applies to the workspace
view, not to the thermodynamic calculation or editable C/T inputs.

Above 900 px the wrappers use `display: contents`; the original desktop diagram
layout and point-coordinate function are restored. Resize observation only
updates the gesture viewport dimensions. Page exit disconnects that observer,
aborts listeners and restores the original point helper.

Testing API: `FazCalismaAlani.createController(options)` exposes deterministic
pan/zoom/fit/reset coordinate math. `FazCalismaGorunumu` exposes the mounted
controller, viewport, stage and disposal method. No phase data is generated or
altered by this module.
