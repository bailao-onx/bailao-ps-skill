# Native effects example

This synthetic example checks shape opacity, Smart Filter blur and a native group fade without third-party artwork or fonts.

1. Build `manifest.json` with the standard runner and execute the JSX in Photoshop.
2. On a duplicate, call `shape_smart_blur.jsx` for `Quarter white` (8 px) and `Cyan sixty` (12 px).
3. Add a group fade to `Fade probe` from `[40,400]` to `[600,400]`.
4. Restore RGB component channels, save and reopen. Compare interior samples at `[160,225]` and `[435,225]` with the baseline; inspect blur edges and retained Smart Filters.
5. Try adding a second group mask. The helper should refuse without changing pixels.

Expected opaque-interior RGB values are `[64,64,64]` for white at 25% and `[0,153,153]` for cyan at 60%. Check opacity and fade direction in your own result. This example does not verify arbitrary masks, layer styles or full-design fidelity.
