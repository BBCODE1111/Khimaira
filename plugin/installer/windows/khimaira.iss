; KHIMAIRA Windows installer (Inno Setup 6)
; iscc /DAppVersion=1.1.0 /DBuildDir=<...\Khimaira_artefacts\Release> /DWebView2Setup=<...\MicrosoftEdgeWebview2Setup.exe> /DOutDir=<dir> khimaira.iss

#ifndef AppVersion
  #define AppVersion "1.1.0"
#endif
#ifndef BuildDir
  #define BuildDir "..\..\build\Khimaira_artefacts\Release"
#endif
#ifndef OutDir
  #define OutDir "Output"
#endif

[Setup]
AppId={{7A0E4C6B-3F4B-4E77-9C41-6B1C2D7E9A11}
AppName=KHIMAIRA
AppVersion={#AppVersion}
AppVerName=KHIMAIRA {#AppVersion}
AppPublisher=KHIMAIRA
AppPublisherURL=https://bbcode1111.github.io/Khimaira/
DefaultDirName={autopf}\KHIMAIRA
DefaultGroupName=KHIMAIRA
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
OutputDir={#OutDir}
OutputBaseFilename=KHIMAIRA-{#AppVersion}-windows-setup
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=KHIMAIRA {#AppVersion}

[Types]
Name: "full"; Description: "VST3 plug-in + standalone app"
Name: "custom"; Description: "Custom"; Flags: iscustom

[Components]
Name: "vst3"; Description: "VST3 plug-in (C:\Program Files\Common Files\VST3)"; Types: full custom; Flags: fixed
Name: "standalone"; Description: "Standalone app"; Types: full

[Files]
Source: "{#BuildDir}\VST3\KHIMAIRA 1.1.vst3\*"; DestDir: "{commoncf64}\VST3\KHIMAIRA 1.1.vst3"; Components: vst3; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BuildDir}\Standalone\KHIMAIRA 1.1.exe"; DestDir: "{app}"; Components: standalone; Flags: ignoreversion
#ifdef WebView2Setup
Source: "{#WebView2Setup}"; DestDir: "{tmp}"; DestName: "MicrosoftEdgeWebview2Setup.exe"; Flags: deleteafterinstall; Check: NeedsWebView2
#endif

[Icons]
Name: "{group}\KHIMAIRA"; Filename: "{app}\KHIMAIRA 1.1.exe"; Components: standalone
Name: "{group}\Uninstall KHIMAIRA"; Filename: "{uninstallexe}"

[Run]
#ifdef WebView2Setup
Filename: "{tmp}\MicrosoftEdgeWebview2Setup.exe"; Parameters: "/silent /install"; StatusMsg: "Installing Microsoft WebView2 Runtime (needed for the KHIMAIRA interface)..."; Check: NeedsWebView2; Flags: waituntilterminated
#endif
Filename: "{app}\KHIMAIRA 1.1.exe"; Description: "Open KHIMAIRA standalone"; Components: standalone; Flags: nowait postinstall skipifsilent unchecked

[Code]
const
  WebView2Key = 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';
  WebView2UserKey = 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';

function HasVersion(Root: Integer; Key: String): Boolean;
var
  V: String;
begin
  Result := RegQueryStringValue(Root, Key, 'pv', V) and (V <> '') and (V <> '0.0.0.0');
end;

function NeedsWebView2: Boolean;
begin
  Result := not (HasVersion(HKLM, WebView2Key) or HasVersion(HKCU, WebView2UserKey));
end;
