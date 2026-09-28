---
name: bailao-ps-skill
description: Use Photoshop through Codex to rearrange layouts, update text and design elements, rebuild flattened references as layered PSDs, and prepare editable design handoffs.
---

# bailao-ps-skill

Turn the user's plain-language design request into actual Photoshop edits and a checked PSD. Work from an existing PSD when available; reconstruct the required independent elements when the input is flat. Preserve approved wording, assets and design intent.

## Choose the work

- **Rearrange or resize:** reuse the same assets and revise position, scale and reading order for the target dimensions. Reflow the design; a crop or uniform resize alone does not satisfy a new layout request.
- **Edit an existing PSD:** inspect layers, work on a task-owned copy, and change the requested text, information, objects or effects. Read [design decisions](references/design-agent.md) for broader refinement.
- **Rebuild a flat image:** inspect the reference, plan independently editable elements and prepare clean assets. Read [reconstruction](references/reconstruction.md).
- **Use selected elements:** rebuild only the requested objects or graphics and identify concealed parts requiring repair.
- **Batch an approved simple layout:** use the [batch renderer](references/renderer.md) when the design consists mainly of clean photos, text and simple shapes. Inspect each output.

## Establish the working environment

Use the local Photoshop connection available to the agent; see [setup](docs/installation.md) for macOS AppleScript and Windows COM scripting routes. Confirm the actual host, application, file paths and permissions before execution. Do not assume this skill installs Photoshop, supplies image generation, grants permissions or controls another computer automatically.

Keep one writer operating Photoshop at a time. Use task-owned files and preserve unrelated documents. Respect the user's screenshot and privacy preferences. Read [Photoshop production](references/photoshop-production.md) for script execution, document lifecycle and saved-file checks.

## Inspect and plan

Read the source at full resolution and intended viewing size. Confirm target dimensions, exact copy, focal elements, front-to-back order, lighting and required editing operations. For an existing PSD, inspect its structure before rebuilding anything. Mark unclear text or product details instead of inventing them.

Use [typography](references/typography.md) for OCR, font matching and live text. Check candidate fonts in Photoshop; neither OCR nor a visual match proves exact original typography. Obtain fonts only from appropriately licensed sources and explain substitutions.

Choose native text and shapes where suitable, independently replaceable Smart Objects for complex assets, and masks or effects where adjustment matters. See [effect recipes](references/effect-recipes.md), [occlusion and assemblies](references/occlusion-and-assemblies.md), and [methods by design type](references/case-methods.md) as needed. For atmospheric fades, use [native depth fades](references/native-depth-fades.md).

## Prepare independent assets

A crop containing baked text, background or neighboring objects is not a clean independent element. Obtain or repair the underlying pixels first. For photographic material, read [cutout preparation](references/photo-cutouts.md).

When a clean source is unavailable or native shapes cannot reproduce complex material, use an available image-generation tool within the user's authorization to create the needed asset separately. Check silhouette, geometry, pose, perspective, light, focal depth and transparent edges before placing it. Keep source and generated provenance with the task, and explain inferred hidden areas. If no generation tool is available, report that limitation and use an agreed alternative.

## Build and refine

Use the [manifest runner](references/manifest-runner.md) for reviewed layer plans within its supported fields. It builds explicit instructions; it does not discover objects, fonts or clean assets by itself. For other edits, use the actual Photoshop scripting or UI tools available in the environment. Verify any added technique before describing it as supported.

Keep words editable where feasible, graphic paths native and complex objects separately replaceable. Group by intended edit ownership, including attached details and relevant shadows. Preserve proportions and keep blur on the correct focal plane. A flat image inside a PSD or text pasted over a complete generated background does not establish independent editing.

Open the result in Photoshop when the user wants to review it. Apply follow-up requests to the working PSD instead of unnecessarily regenerating the entire design.

## Check and deliver

Reopen the saved PSD and export its actual preview. Check wording, layout, object geometry, masks, effects, boundaries and visual differences. Verify the editing operations promised for this task: live text changes, native shape edits, independent replacements or semantic group movement. Inspect both moved objects and newly exposed surfaces. Use the [quality protocol](references/quality-protocol.md) and relevant probes; a successful script or layer count is not visual acceptance.

Deliver the PSD, a matching PNG/JPG and any assets needed for continued editing. The manifest runner exports PNG; use Photoshop's available export route when JPG is requested. Explain font substitutions, outlined lettering, raster details, inferred regions and remaining differences. Package a ZIP when requested. Publication and client sends remain separate actions governed by the user's instructions.
