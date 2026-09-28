# Quality protocol

A reconstruction must look right and remain useful to edit. Check visual fidelity and editability separately, using the user's reference and acceptance requirements.

## Record each design

Keep a task-owned folder containing the reference and its provenance, dimensions, exact copy, source assets, layer plan, generated JSX, saved PSD, reopened preview, layer inventory, build log, comparison outputs and known differences. Record generated assets, prompts and inferred hidden regions. Keep task material in the user’s working folder; include only requested deliverables in a handoff.

## Inspect the visual result

Reopen the saved PSD and export a fresh preview. Inspect the reference and preview at fit-to-screen and at 100% zoom. Compare copy, font shape, hierarchy, silhouettes, topology, texture, geometry, perspective, highlight direction, translucency, focus, masks, halos, shadows and color.

Use region-by-region observations. Pixel differences and perceptual diagnostics can locate defects; they do not establish a percentage of visual fidelity. A low average error can conceal an incorrect subject or unreadable text. Reexport both sides consistently when investigating renderer differences.

## Check actual editability

- Edit and restore representative live text. Check font identity, exact wording and any character-level styles after reopening.
- Move and recolor a visible native shape, and edit a path anchor when native paths are promised. An operation on an invisible target is not evidence.
- Hide and move complete semantic groups. Check both the moving object and the exposed receiving surface for missing anatomy, holes, baked shadows and leftover fragments.
- Replace image Smart Objects independently. Check placement, masks and neighboring elements after replacement; different intrinsic bounds may require refitting.
- Verify that native masks, vector masks, layer styles and Smart Filters persist after save/reopen.
- Restore the original state and compare the resulting preview with the baseline. Check visibility explicitly; history restoration may not restore every visibility change.

Use the shape and group probes described in the [manifest runner](manifest-runner.md). A successful probe covers its selected target and operation. It does not establish whole-document editability. The group probe's `PIXEL_CHECKS_PASSED_VISUAL_REVIEW_REQUIRED` result still requires visual inspection.

## Check generated and repaired assets

Compare generated replacements against the reference for silhouette, landmarks, pose, perspective, material, lighting and focal depth. Better texture alone does not make a replacement accurate. Preserve visible identity and reconstruct only the missing or unsuitable portion when possible. Reject candidates whose geometry cannot fit the reference.

Keep separate assets independently replaceable. Disclose baked reflections, raster details, estimated hidden surfaces, approximate fonts and outlined lettering. Outlined text must not be described as live type. A generated background with text overlays does not establish element separation.

## Use engineering fixtures within their scope

The synthetic [soft-mask example](../examples/soft-mask/README.md) checks native mask handling with known color and alpha values through save/reopen, movement, replacement, inversion and restoration. The [native-effects example](../examples/native-effects/README.md) covers its documented opacity, blur and fade operations. Run the relevant check in the current environment; these examples do not establish segmentation quality or full-design fidelity.

## Revise and deliver

Keep a fresh version for each attempt. Record: visible defect → suspected cause → operation or asset correction → new preview → observed result. Preserve an earlier version when a revision makes the result worse. Rejected local techniques remain rejected until their observed defect is repaired and checked; related references retain those technical lessons.

Deliver the verified PSD, its corresponding preview, required assets and a short list of remaining differences. State which editing operations were actually checked. Describe visual approval and editing evidence separately; do not promise universal accuracy or processing time.
