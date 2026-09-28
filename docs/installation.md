# Installation and Photoshop setup

## What you need

- Codex with local file access, image inspection and permission to run local tools.
- Photoshop on the same machine as those tools. The routes below cover **macOS or Windows with Photoshop 2026**.
- Source images or a PSD, the requested wording and output dimensions.
- An available image-generation tool only when the task needs newly generated assets.

The Windows COM connection and PSD save/reopen/export route were checked on Windows 11 with Photoshop 27.10.0 and PowerShell 7.6.5. These version details describe the checked environment, not a minimum-version guarantee. The skill does not install Photoshop, provide a product subscription or grant control permissions.

## 1. Install the skill

Download with **Code → Download ZIP**, unzip and rename the folder to `bailao-ps-skill`. Put it inside `~/.codex/skills/` (on Windows, `$env:USERPROFILE\.codex\skills\` in PowerShell). If you configured `CODEX_HOME`, use its `skills/` directory instead.

```text
skills/bailao-ps-skill/
├── SKILL.md
├── agents/
├── scripts/
├── references/
└── examples/
```

Keep the files together and avoid an extra nested copy. Start a new Codex session; restart Codex if the skill is not recognized. Invoke it with `$bailao-ps-skill`.

## 2. Check the local Photoshop connection on macOS

The supplied builder emits JSX. Photoshop executes that script through its own scripting interface. Codex needs a local command tool capable of calling that interface, or a working UI tool for Photoshop's **File → Scripts → Browse** menu.

Ask Codex to check the installed application name and read its version without changing documents. For an application named `Adobe Photoshop 2026`, the local command is:

```sh
osascript -e 'tell application "Adobe Photoshop 2026" to get version'
```

Use the actual installed application name. Photoshop may open, and macOS may ask whether the requesting app can control it. Allow the request only for the app you intend to use. If permission was denied, review the matching entry under **System Settings → Privacy & Security → Automation**, then retry the read-only version check. If Codex's command environment itself blocks execution, resolve that permission separately.

A returned version confirms this small Apple-event request works. It does not yet confirm that PSD construction or UI interaction works. Accessibility permission applies to UI-control tools when needed; screen-recording permission applies to tools that capture the display. Neither substitutes for the scripting connection.

## 2b. Check the local Photoshop connection on Windows

Open Photoshop in your Windows user session and finish any startup prompts. In PowerShell, check its version without changing a document:

```powershell
$ErrorActionPreference = 'Stop'
$photoshop = New-Object -ComObject Photoshop.Application
$photoshop.Version
```

This route uses Photoshop's registered COM interface; Python does not need `pywin32` or `comtypes` to emit JSX. Run through an execution environment authorized to access the same user session as Photoshop. If Codex requests permission to run the command outside a restricted environment, review that request through its normal approval flow. Installing the skill does not grant that permission.

A `0x80080005` COM failure does not by itself mean the builder is broken. Check that Photoshop finished starting and that the command can reach its user session. Inspect existing outputs before retrying. Do not disable security controls or repeatedly launch Photoshop instances. If the approved scripting route remains unavailable, **File → Scripts → Browse** can execute the generated JSX.

## 3. Prepare helper dependencies

Use an environment in your working project rather than installing packages into the skill folder:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install Pillow numpy scipy
```

On Windows, use an available Python 3 interpreter. For a project-local environment, no activation or execution-policy change is needed:

```powershell
python -m venv .venv
& .\.venv\Scripts\python.exe -m pip install Pillow numpy scipy
```

If `python` opens the Microsoft Store, select an installed Python executable or use the interpreter already provided by your Codex environment. In later commands, use that same interpreter.

Use only the dependencies required for the chosen helpers:

| Helper | Requirements |
| :--- | :--- |
| Manifest validation and JSX generation | Python 3; Pillow for image masks and alpha separation |
| Preview comparisons and edit probes | Pillow, NumPy; SciPy for perceptual comparisons |
| Optional measured type fitting | fonttools and uharfbuzz, plus image-analysis dependencies |
| macOS OCR | Swift and the system Vision framework |
| PSD construction | Photoshop JSX scripting |

For optional type fitting:

```sh
python -m pip install fonttools uharfbuzz
```

The optional `ocr_macos.swift` uses macOS Vision and does not run on Windows. Use an OCR tool available to your agent there. `fetch_google_font.py` can download a font and its license on either platform; its `--install` option is macOS-only. On Windows, install the downloaded font through the Windows font installer, then confirm its Photoshop PostScript name.

## 4. Build a small example without extra fonts

From the installed skill folder, using the chosen Python environment, emit a script for the [soft-mask example](../examples/soft-mask/README.md). Replace paths with a new folder in your working project:

```sh
python scripts/reconstruct_psd.py \
  --manifest examples/soft-mask/manifest.json \
  --output /absolute/path/to/new-check/output \
  --emit /absolute/path/to/new-check/build.jsx
```

This creates a script, not a PSD. On macOS, execute it in Photoshop:

```sh
osascript -e 'with timeout of 600 seconds' \
  -e 'tell application "Adobe Photoshop 2026" to do javascript file (POSIX file "/absolute/path/to/new-check/build.jsx")' \
  -e 'end timeout'
```

On Windows, from the skill folder, replace the output paths with a fresh working directory and use your chosen Python executable:

```powershell
$ErrorActionPreference = 'Stop'
python .\scripts\reconstruct_psd.py --manifest .\examples\soft-mask\manifest.json --output 'C:\ps-check\output' --emit 'C:\ps-check\build.jsx'
if ($LASTEXITCODE -ne 0) { throw 'JSX generation failed.' }
$photoshop = New-Object -ComObject Photoshop.Application
$photoshop.DoJavaScriptFile('C:\ps-check\build.jsx')
```

Alternatively choose **File → Scripts → Browse** and select the emitted JSX. Only one operator should write to Photoshop at a time. If execution times out, inspect the output before retrying; Photoshop may still be working.

Check `output/build-log.txt`, `output/editable.psd` and `output/preview.png`. Reopen the PSD, inspect the native mask and follow the example's movement/replacement checks as needed. A log reporting success is necessary but does not replace looking at the saved file. This simple example checks the connection and mask workflow, not complex-design quality.

The separate `smoke` example uses Poppins Bold; install that font with its license or use an available PostScript font name. Fonts are not bundled.

## 5. Work on your design

Attach a reference or PSD and describe what should change. For example:

```text
Use $bailao-ps-skill. Keep the subject and approved text, but rearrange this
into a portrait layout. Work on a copy, keep elements independently editable,
open the result in Photoshop for review, and deliver the checked PSD and PNG.
```

For a flat input, Codex must first plan and rebuild the required elements. An existing PSD can often be revised directly. Asset generation is available only if the agent has a suitable tool and authorization to use it.

## Troubleshooting

| Symptom | Check |
| :--- | :--- |
| Skill not recognized | Folder nesting, `SKILL.md`, configured skill root and a new session |
| Photoshop not found | Installed application name and the host running local commands |
| Automation denied on macOS | The requesting app's Automation permission and command environment |
| COM fails on Windows | Photoshop startup, the active user session and approved command permissions |
| Python import error | The Python environment containing the required packages |
| JSX created but no PSD | Whether Photoshop actually executed it; inspect the build log |
| Missing font | Install a licensed font or choose and disclose a local substitute |
| PSD looks wrong | Reopened preview, typography, assets, masks and supported effects |

Do not treat installing a skill or seeing an open Photoshop window as proof that a complete design workflow has passed.
