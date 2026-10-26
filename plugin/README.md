# KHIMAIRA Plug-in (VST3 · AU · Standalone)

**1.1 development** — based on Web `web-v1.0.2`. [Milestone 1 validation](../docs/plugin-development-20261027/REPORT.md): optional host/export CC64, accessible MIDI export controls, macOS arm64 builds, strict auval and Logic Pro 11.2.2 load/tempo/state/export checks. Windows and Universal releases remain pending.

The website in `../dist` running inside a DAW instrument plug-in. The web UI is embedded unchanged;
a small bridge (`web/`) connects it to native code that plays in sync with the DAW.

| Platform | Formats | Installer |
| --- | --- | --- |
| macOS 10.15+ (Universal: Apple Silicon + Intel) | VST3, AU, Standalone | `KHIMAIRA-<ver>-mac.pkg` |
| Windows 10/11 x64 | VST3, Standalone | `KHIMAIRA-<ver>-windows-setup.exe` |

Pro Tools (AAX) is not included: it requires Avid's developer program and PACE signing.

## Get the installers (no Mac/PC toolchain needed)

1. Push this repository to GitHub (the `plugin/` folder and `.github/workflows/plugin.yml`).
2. GitHub → **Actions** → **Build KHIMAIRA Plug-in** → **Run workflow**.
3. When it finishes (~15 min), download the artifact **KHIMAIRA-Plugin-1.1.0**. That folder is
   what you give to people: Mac installer, Windows installer and `安裝說明 Install Guide.txt`.
4. For a public release, push a tag: `git tag plugin-v1.1.0 && git push --tags`. The zip is then
   attached to a GitHub Release with a download link.

Change the version in `CMakeLists.txt` (`project(... VERSION x.y.z)`) and `VERSION:` in the workflow.

## How it works

```
 web UI (dist/, unchanged) ──save() → localStorage──▶ kh-bridge.js ──▶ processor
   PLAY button → piano.js  (served as plugin-piano.js) ──notes──▶ preview scheduler ─┐
                                                                                    ├─▶ MIDI out + built-in piano
 DAW transport (PPQ, BPM) ─────────────────────────────────▶ PatternPlayer ────────┘
```

- **Host sync**: bar 1 of the chart = bar 1 of the project, looping every N bars, at the DAW tempo.
- **Built-in piano**: the same Salamander samples, decoded natively (shared by all instances).
- **MIDI out**: every note also goes to the plug-in's MIDI output (Live, Bitwig, Reaper, FL, Cubase…).
- **Drag MIDI**: the footer tiles create a .mid on the fly and start an OS drag onto a DAW track.
- **State**: the chart, settings and pattern are stored in the DAW project, so playback works
  even when the editor is closed.

Files:

- `Source/PatternPlayer.h` – sample-accurate, allocation-free schedulers (unit tested in `tests/`).
- `Source/PluginProcessor.*` – parameters, MIDI generation, state, MIDI file export.
- `Source/PluginEditor.*` – WebView (WKWebView / WebView2), resource provider, footer controls.
- `Source/PianoSampler.*` – background-loaded sampler.
- `web/` – bridge files added to the web bundle (`kh-bridge.js`, `plugin-piano.js`, `plugin.css`).
- `installer/` – macOS pkg script, Inno Setup script, end-user install guide.

## Building locally

Requirements: CMake 3.22+, and Xcode (macOS) or Visual Studio 2022 (Windows). JUCE 8.0.15 is
downloaded automatically.

```sh
# macOS
cmake -S plugin -B build -G Xcode -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64"
cmake --build build --config Release

# Windows (WebView2 SDK: nuget install Microsoft.Web.WebView2 -Version 1.0.3485.44 -OutputDirectory C:\webview2)
cmake -S plugin -B build -G "Visual Studio 17 2022" -A x64 -DJUCE_WEBVIEW2_PACKAGE_LOCATION=C:/webview2
cmake --build build --config Release
```

Output: `build/Khimaira_artefacts/Release/{VST3,AU,Standalone}`.

## Signing (optional but recommended before wide distribution)

Unsigned builds work, but macOS asks users to approve them once ("Open Anyway") and Windows
SmartScreen shows "More info → Run anyway". To remove those prompts:

- **macOS** – Apple Developer Program (US$99/year). Add repository secrets
  `MACOS_CERTIFICATE` (base64 .p12 with *Developer ID Application* and *Developer ID Installer*),
  `MACOS_CERTIFICATE_PWD`, `MACOS_DEV_ID_APP`, `MACOS_DEV_ID_INSTALLER`, `APPLE_ID`,
  `APPLE_TEAM_ID`, `APPLE_APP_PASSWORD`. The workflow then signs, notarizes and staples automatically.
- **Windows** – an OV/EV code-signing certificate (or Azure Trusted Signing), applied to the setup .exe.

## Licences

- JUCE 8: used under the JUCE licence (free Starter tier up to the revenue limit, or AGPLv3).
- VST is a trademark of Steinberg Media Technologies GmbH.
- Piano: Salamander Grand Piano by Alexander Holm, CC BY 3.0 (credit kept in the UI and install guide).
- Bundled fonts Cinzel and DM Sans: SIL Open Font License.


## Integration validation (2026-10-26)

Integrated from `BETATEST/KHIMAIRA-Plugin-Source` with the 1.0.1 web fixes. Native MIDI velocity now matches the web exporter (127 scale); the bridge includes walking bass, Ballad entry and BPM options, persists the initial state, and retains empty bars. Fonts are sourced from `../dist/fonts` and WebP/font changes trigger web repacking.

Local macOS arm64 builds of VST3, AU and Standalone succeeded with JUCE 8.0.15, and the C++ scheduler tests passed. Browser tests cover initial bridge state, empty bars, preview note messages and two-track MIDI downloads. Universal/Windows builds, auval and actual DAW host tests remain unverified. No plug-in was installed into system folders.

The web MIDI buttons support Bass/Chords track splitting. Native DRAG MIDI / DRAG SUSTAIN still export a single track. Local builds are not Developer ID signed or notarized.

## Pedal CC64 (1.1 development)

The native PEDAL CC64 switch is off by default. When enabled, host-synced playback and the native DRAG MIDI / DRAG SUSTAIN tiles include sustain controller messages. Pedal lifts on harmony changes, rests, seeks, stop, and MIDI-channel changes, then repedals after a short gap. It is saved in the DAW project. Web PLAY and the web MIDI buttons keep their existing note-length simulation; use the native tiles for CC64 exports. Clicking a tile, or pressing Enter/Space while it has focus, saves a MIDI file to Documents/KHIMAIRA MIDI.
