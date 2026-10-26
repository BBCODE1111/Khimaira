#include "PluginEditor.h"

//==============================================================================
const juce::Colour KhimairaLookAndFeel::navy   { 0xff08131f };
const juce::Colour KhimairaLookAndFeel::panel  { 0xff10243a };
const juce::Colour KhimairaLookAndFeel::bronze { 0xffb08a57 };
const juce::Colour KhimairaLookAndFeel::ivory  { 0xffe9e1d0 };
const juce::Colour KhimairaLookAndFeel::steel  { 0xff2b4355 };
const juce::Colour KhimairaLookAndFeel::glow   { 0xff4f87ad };

KhimairaLookAndFeel::KhimairaLookAndFeel()
{
    setColour (juce::TextButton::textColourOffId, ivory.withAlpha (0.78f));
    setColour (juce::TextButton::textColourOnId, ivory);
    setColour (juce::Label::textColourId, ivory.withAlpha (0.8f));
    setColour (juce::Slider::thumbColourId, bronze);
    setColour (juce::TooltipWindow::backgroundColourId, panel);
    setColour (juce::TooltipWindow::textColourId, ivory);
    setColour (juce::TooltipWindow::outlineColourId, bronze);
}

void KhimairaLookAndFeel::drawButtonBackground (juce::Graphics& g, juce::Button& b, const juce::Colour&,
                                                bool highlighted, bool down)
{
    auto r = b.getLocalBounds().toFloat().reduced (0.5f);
    const bool on = b.getToggleState();

    g.setColour (on ? glow.withAlpha (down ? 0.75f : 0.6f) : steel.withAlpha (highlighted ? 0.85f : 0.55f));
    g.fillRect (r);
    g.setColour (on ? bronze : bronze.withAlpha (highlighted ? 0.8f : 0.45f));
    g.drawRect (r, 1.0f);

    if (on) // small lamp so the state never depends on colour alone
    {
        g.setColour (ivory);
        g.fillEllipse (r.getX() + 8.0f, r.getCentreY() - 2.5f, 5.0f, 5.0f);
    }
}

juce::Font KhimairaLookAndFeel::getTextButtonFont (juce::TextButton&, int)
{
    return juce::Font (juce::FontOptions (11.5f, juce::Font::bold)).withExtraKerningFactor (0.12f);
}

void KhimairaLookAndFeel::drawLinearSlider (juce::Graphics& g, int x, int y, int w, int h, float pos, float,
                                            float, juce::Slider::SliderStyle, juce::Slider&)
{
    const auto cy = (float) y + (float) h * 0.5f;
    g.setColour (steel);
    g.fillRoundedRectangle ((float) x, cy - 1.5f, (float) w, 3.0f, 1.5f);
    g.setColour (bronze);
    g.fillRoundedRectangle ((float) x, cy - 1.5f, pos - (float) x, 3.0f, 1.5f);
    g.setColour (ivory);
    g.fillEllipse (pos - 5.0f, cy - 5.0f, 10.0f, 10.0f);
}

//==============================================================================
MidiDragTile::MidiDragTile (KhimairaProcessor& p, bool s, juce::String l)
    : processor (p), sustain (s), label (std::move (l))
{
    setMouseCursor (juce::MouseCursor::DraggingHandCursor);
    setTitle (label);
    setWantsKeyboardFocus (true);
    setTooltip (sustain ? "Drag the plain block chords (exact chord lengths) onto a MIDI track. Click to save to Documents/KHIMAIRA MIDI."
                        : "Drag the current performance onto a MIDI track. Click to save to Documents/KHIMAIRA MIDI.");
}

void MidiDragTile::paint (juce::Graphics& g)
{
    using L = KhimairaLookAndFeel;
    auto r = getLocalBounds().toFloat().reduced (0.5f);
    const bool hot = isMouseOver() || dragging;

    g.setColour (hot ? L::glow.withAlpha (0.5f) : L::panel);
    g.fillRect (r);
    g.setColour (L::bronze.withAlpha (hot ? 1.0f : 0.7f));
    const float dash[] = { 4.0f, 3.0f };
    juce::Path outline;
    outline.addRectangle (r);
    juce::Path dashed;
    juce::PathStrokeType (1.0f).createDashedStroke (dashed, outline, dash, 2);
    g.fillPath (dashed);

    // A small "clip" icon.
    auto icon = r.removeFromLeft (30.0f).withSizeKeepingCentre (14.0f, 16.0f);
    g.drawRect (icon, 1.0f);

    for (int i = 0; i < 3; ++i)
        g.fillRect (icon.getX() + 3.0f + (float) i * 3.0f, icon.getY() + 4.0f + (float) ((i * 5) % 7), 2.0f, 2.0f);

    g.setColour (L::ivory);
    g.setFont (juce::FontOptions (11.5f, juce::Font::bold));
    g.drawText (label, r.withTrimmedRight (6.0f), juce::Justification::centredLeft);
}

void MidiDragTile::mouseDown (const juce::MouseEvent&)
{
    dragging = false;
}

void MidiDragTile::mouseDrag (const juce::MouseEvent& e)
{
    if (dragging || e.getDistanceFromDragStart() < 6)
        return;

    const auto file = processor.writeMidiFile (sustain);

    if (! file.existsAsFile())
    {
        if (onStatus) onStatus ("Nothing to drag yet - generate or load chords first.");
        return;
    }

    dragging = true;
    repaint();
    juce::DragAndDropContainer::performExternalDragDropOfFiles ({ file.getFullPathName() }, false, this,
        [safe = juce::Component::SafePointer<MidiDragTile> (this)]
        {
            if (safe != nullptr) { safe->dragging = false; safe->repaint(); }
        });
}

void MidiDragTile::mouseUp (const juce::MouseEvent& e)
{
    if (dragging || e.getDistanceFromDragStart() >= 6)
        return;

    saveMidi();
}

bool MidiDragTile::keyPressed (const juce::KeyPress& key)
{
    if (key == juce::KeyPress::returnKey || key == juce::KeyPress::spaceKey) { saveMidi(); return true; }
    return false;
}

std::unique_ptr<juce::AccessibilityHandler> MidiDragTile::createAccessibilityHandler()
{
    return std::make_unique<juce::AccessibilityHandler> (*this, juce::AccessibilityRole::button,
        juce::AccessibilityActions{}.addAction (juce::AccessibilityActionType::press, [this] { saveMidi(); }));
}

void MidiDragTile::saveMidi()
{
    const auto file = processor.writeMidiFile (sustain);

    if (! file.existsAsFile())
    {
        if (onStatus) onStatus ("Nothing to save yet - generate or load chords first.");
        return;
    }

    const auto target = processor.getExportFolder().getNonexistentChildFile (file.getFileNameWithoutExtension(), ".mid");

    if (file.copyFileTo (target))
    {
        target.revealToUser();
        if (onStatus) onStatus ("Saved " + target.getFileName() + " to Documents/KHIMAIRA MIDI");
    }
}

//==============================================================================
static juce::String publicSiteFor (const juce::String& url)
{
    const auto root = juce::WebBrowserComponent::getResourceProviderRoot();
    return url.startsWith (root) ? "https://bbcode1111.github.io/Khimaira/" + url.substring (root.length()) : url;
}

bool KhimairaWebView::pageAboutToLoad (const juce::String& url)
{
    const auto root = juce::WebBrowserComponent::getResourceProviderRoot();

    if (url.startsWith (root) || url.startsWith ("about:") || url.startsWith ("blob:") || url.startsWith ("data:"))
        return true;

    if (url.startsWithIgnoreCase ("http"))
        juce::URL (url).launchInDefaultBrowser();

    return false;
}

void KhimairaWebView::newWindowAttemptingToLoad (const juce::String& url)
{
    const auto target = publicSiteFor (url);

    if (target.startsWithIgnoreCase ("http"))
        juce::URL (target).launchInDefaultBrowser();
}

//==============================================================================
static const char* mimeFor (const juce::String& path)
{
    const auto ext = path.fromLastOccurrenceOf (".", false, false).toLowerCase();

    static const std::map<juce::String, const char*> types {
        { "html", "text/html" }, { "htm", "text/html" }, { "js", "text/javascript" }, { "mjs", "text/javascript" },
        { "css", "text/css" }, { "json", "application/json" }, { "svg", "image/svg+xml" }, { "png", "image/png" },
        { "jpg", "image/jpeg" }, { "jpeg", "image/jpeg" }, { "webp", "image/webp" }, { "mp3", "audio/mpeg" },
        { "woff2", "font/woff2" }, { "woff", "font/woff" }, { "ttf", "font/ttf" }, { "txt", "text/plain" },
        { "ico", "image/x-icon" } };

    const auto it = types.find (ext);
    return it != types.end() ? it->second : "application/octet-stream";
}

KhimairaEditor::KhimairaEditor (KhimairaProcessor& p)
    : AudioProcessorEditor (&p),
      processor (p),
      dragPerformance (p, false, "DRAG MIDI"),
      dragSustain (p, true, "DRAG SUSTAIN"),
      syncAttachment (p.params, "hostSync", syncButton),
      pianoAttachment (p.params, "piano", pianoButton),
      sustainAttachment (p.params, "source", sustainButton),
      pedalAttachment (p.params, "pedal", pedalButton),
      volumeAttachment (p.params, "volume", volume)
{
    setLookAndFeel (&lookAndFeel);

    int size = 0;
    if (const auto* data = BinaryData::getNamedResource ("web_zip", size))
    {
        webArchiveStream = std::make_unique<juce::MemoryInputStream> (data, (size_t) size, false);
        webArchive = std::make_unique<juce::ZipFile> (*webArchiveStream);
    }

    const auto options = juce::WebBrowserComponent::Options{}
        .withBackend (juce::WebBrowserComponent::Options::Backend::webview2)
        .withWinWebView2Options (juce::WebBrowserComponent::Options::WinWebView2{}
                                     .withUserDataFolder (juce::File::getSpecialLocation (juce::File::tempDirectory)
                                                              .getChildFile ("KHIMAIRA-WebView2"))
                                     .withBackgroundColour (KhimairaLookAndFeel::navy)
                                     .withStatusBarDisabled())
        .withKeepPageLoadedWhenBrowserIsHidden()
        .withNativeIntegrationEnabled()
        .withEventListener ("khimaira", [this] (juce::var e) { handleWebEvent (e); })
        .withResourceProvider ([this] (const juce::String& url) { return getResource (url); });

    web = std::make_unique<KhimairaWebView> (options);
    addAndMakeVisible (*web);

    for (auto* b : { &syncButton, &pianoButton, &sustainButton, &pedalButton })
    {
        b->setClickingTogglesState (true);
        addAndMakeVisible (*b);
    }

    syncButton.setTooltip ("Follow the DAW transport: bar 1 of the chart starts at bar 1 of your project and loops.");
    pianoButton.setTooltip ("Built-in Salamander grand piano. Turn off to drive your own instrument from the MIDI output.");
    sustainButton.setTooltip ("Play plain block chords instead of the selected performance pattern.");

    pedalButton.setTooltip ("Optional CC64 for DAW-synced playback and DRAG MIDI. Lifts at each chord, rest and stop. Web PLAY keeps its note-length pedal simulation.");

    volume.setSliderStyle (juce::Slider::LinearHorizontal);
    volume.setTextBoxStyle (juce::Slider::NoTextBox, false, 0, 0);
    volume.setTooltip ("Built-in piano volume");
    addAndMakeVisible (volume);

    hostLabel.setFont (juce::FontOptions (12.0f, juce::Font::bold));
    statusLabel.setFont (juce::FontOptions (11.5f));
    statusLabel.setColour (juce::Label::textColourId, KhimairaLookAndFeel::bronze.brighter (0.3f));
    addAndMakeVisible (hostLabel);
    addAndMakeVisible (statusLabel);

    for (auto* tile : { &dragPerformance, &dragSustain })
    {
        tile->onStatus = [this] (juce::String s) { setStatus (s); };
        addAndMakeVisible (*tile);
    }

    setResizable (true, true);
    setResizeLimits (720, 520, 2800, 1900);
    setSize (juce::jlimit (720, 2800, processor.editorSize.x), juce::jlimit (520, 1900, processor.editorSize.y));

    web->goToURL (juce::WebBrowserComponent::getResourceProviderRoot());
    startTimerHz (12);
}

KhimairaEditor::~KhimairaEditor()
{
    processor.previewStopAll();
    setLookAndFeel (nullptr);
}

void KhimairaEditor::paint (juce::Graphics& g)
{
    using L = KhimairaLookAndFeel;
    g.fillAll (L::navy);

    auto footer = getLocalBounds().removeFromBottom (footerHeight);
    g.setGradientFill (juce::ColourGradient (L::panel, 0.0f, (float) footer.getY(),
                                             L::navy, 0.0f, (float) footer.getBottom(), false));
    g.fillRect (footer);
    g.setColour (L::bronze.withAlpha (0.8f));
    g.fillRect (footer.removeFromTop (1));

    g.setColour (L::ivory);
    g.setFont (juce::FontOptions (11.5f, juce::Font::bold).withKerningFactor (0.25f));
    g.drawText ("KHIMAIRA 1.1", footer.withX (16).withWidth (110).withTrimmedBottom (14), juce::Justification::centredLeft);
    g.setColour (L::bronze);
    g.setFont (juce::FontOptions (9.5f).withKerningFactor (0.2f));
    g.drawText ("PLUGIN " JucePlugin_VersionString, footer.withX (16).withWidth (110).withTrimmedTop (22),
                juce::Justification::centredLeft);
}

void KhimairaEditor::resized()
{
    auto r = getLocalBounds();
    auto footer = r.removeFromBottom (footerHeight).reduced (12, 11).withTrimmedTop (1);
    web->setBounds (r);

    footer.removeFromLeft (112);
    auto controls = footer.removeFromTop (30);
    syncButton.setBounds (controls.removeFromLeft (98)); controls.removeFromLeft (6);
    sustainButton.setBounds (controls.removeFromLeft (80)); controls.removeFromLeft (6);
    pedalButton.setBounds (controls.removeFromLeft (94)); controls.removeFromLeft (6);
    pianoButton.setBounds (controls.removeFromLeft (70)); controls.removeFromLeft (8);
    volume.setBounds (controls.removeFromLeft (80));
    footer.removeFromTop (5);
    dragSustain.setBounds (footer.removeFromRight (118)); footer.removeFromRight (8);
    dragPerformance.setBounds (footer.removeFromRight (108)); footer.removeFromRight (12);
    hostLabel.setBounds (footer.removeFromTop (footer.getHeight() / 2 + 2));
    statusLabel.setBounds (footer);

    processor.editorSize = { getWidth(), getHeight() };
}

void KhimairaEditor::setStatus (const juce::String& text)
{
    statusText = text;
    statusTime = juce::Time::getMillisecondCounter();
    statusLabel.setText (text, juce::dontSendNotification);
}

void KhimairaEditor::timerCallback()
{
    const auto s = processor.getHostStatus();
    const bool sync = syncButton.getToggleState();
    juce::String text;

    if (! s.hasPattern)
        text = "Generate or load chords above";
    else if (! sync)
        text = "Sync off - use PLAY above to audition";
    else if (s.playing && s.lengthBeats > 0.0)
    {
        const auto local = std::fmod (juce::jmax (0.0, s.ppq), s.lengthBeats);
        text << juce::String::fromUTF8 ("\xe2\x96\xb6 ") << "DAW  BAR " << (int) (local / 4.0) + 1
             << " / " << (int) std::ceil (s.lengthBeats / 4.0) << "  " << juce::String (s.bpm, 1) << " BPM";
    }
    else
        text << "Ready - press play in your DAW (" << (int) std::ceil (s.lengthBeats / 4.0) << " bars, loops from bar 1)";

    hostLabel.setText (text, juce::dontSendNotification);
    auto* transport = new juce::DynamicObject();
    transport->setProperty ("playing", s.playing && sync && s.hasPattern);
    transport->setProperty ("ppq", s.ppq);
    transport->setProperty ("bpm", s.bpm);
    transport->setProperty ("beats", s.lengthBeats);
    web->emitEventIfBrowserIsVisible ("hostTransport", juce::var (transport));

    if (statusText.isNotEmpty() && juce::Time::getMillisecondCounter() - statusTime > 7000)
    {
        statusText.clear();
        statusLabel.setText ({}, juce::dontSendNotification);
    }
}

//==============================================================================
static std::vector<kh::NoteEvent> notesFrom (const juce::var& flat)
{
    std::vector<kh::NoteEvent> out;

    if (const auto* a = flat.getArray())
    {
        out.reserve ((size_t) a->size() / 4);

        for (int i = 0; i + 3 < a->size(); i += 4)
            out.push_back ({ (double) a->getReference (i), (double) a->getReference (i + 1),
                             juce::jlimit (0, 127, (int) a->getReference (i + 2)),
                             (float) juce::jlimit (0.0, 1.0, (double) a->getReference (i + 3)) });
    }

    return out;
}

void KhimairaEditor::handleWebEvent (const juce::var& e)
{
    const auto type = e["type"].toString();

    if (type == "note")
        processor.previewNoteOn ((int) e["id"], (int) e["note"], (float) (double) e["velocity"],
                                 (double) e["delay"], (double) e["duration"]);
    else if (type == "retime")
        processor.previewRetime ((int) e["id"], (double) e["endDelay"]);
    else if (type == "cancel")
        processor.previewCancel ((int) e["id"]);
    else if (type == "stopPreview")
        processor.previewStopAll();
    else if (type == "sequence")
    {
        kh::Pattern perf, sus;
        perf.lengthBeats = sus.lengthBeats = juce::jmax (0.0, (double) e["beats"]);
        perf.notes = notesFrom (e["notes"]);
        sus.notes = notesFrom (e["sustain"]);
        processor.setPatterns (std::move (perf), std::move (sus), e["name"].toString());
    }
    else if (type == "state")
        processor.setWebState (e["json"].toString());
    else if (type == "midiFile")
    {
        juce::MemoryOutputStream bytes;

        if (juce::Base64::convertFromBase64 (bytes, e["data"].toString()) && bytes.getDataSize() > 0)
        {
            auto name = juce::File::createLegalFileName (e["name"].toString());
            if (! name.endsWithIgnoreCase (".mid")) name << ".mid";

            const auto target = processor.getExportFolder().getNonexistentChildFile (name.upToLastOccurrenceOf (".", false, false), ".mid");

            if (target.replaceWithData (bytes.getData(), bytes.getDataSize()))
                setStatus ("Saved " + target.getFileName() + " to Documents/KHIMAIRA MIDI - or use DRAG MIDI");
        }
    }
}

juce::String KhimairaEditor::buildIndexHtml (const juce::String& original) const
{
    auto state = processor.getWebState();
    juce::String stateLiteral = state.isEmpty() ? juce::String ("null") : juce::JSON::toString (juce::var (state));
    stateLiteral = stateLiteral.replace ("</", "<\\/");

    juce::String inject;
    inject << "<script>window.KHIMAIRA_PLUGIN={version:'" JucePlugin_VersionString "'};"
           << "(function(){var s=" << stateLiteral << ";try{['khimaira-v4','khimaira-v3','chord-advisor-v2','chord-advisor-v1']"
           << ".forEach(function(k){localStorage.removeItem(k)});if(s)localStorage.setItem('khimaira-v4',s);}catch(e){}})();</script>"
           << "<link rel=\"stylesheet\" href=\"plugin/plugin.css\">"
           << "<script src=\"plugin/kh-bridge.js\"></script>";

    const auto at = original.indexOfIgnoreCase ("</head>");
    return at < 0 ? inject + original : original.substring (0, at) + inject + original.substring (at);
}

std::optional<juce::WebBrowserComponent::Resource> KhimairaEditor::getResource (const juce::String& url)
{
    if (webArchive == nullptr)
        return std::nullopt;

    auto path = url.upToFirstOccurrenceOf ("?", false, false).upToFirstOccurrenceOf ("#", false, false)
                   .trimCharactersAtStart ("/");
    path = juce::URL::removeEscapeChars (path);

    if (path.isEmpty())
        path = "index.html";

    // The website's Web Audio piano is replaced by a bridge to the plugin's own sampler.
    if (path == "piano.js")
        path = "plugin/plugin-piano.js";

    auto* entry = webArchive->getEntry (path);

    if (entry == nullptr)
        return std::nullopt;

    std::unique_ptr<juce::InputStream> stream (webArchive->createStreamForEntry (*entry));

    if (stream == nullptr)
        return std::nullopt;

    juce::MemoryBlock block;
    stream->readIntoMemoryBlock (block);

    if (path == "index.html")
    {
        const auto html = buildIndexHtml (block.toString());
        block.reset();
        block.append (html.toRawUTF8(), html.getNumBytesAsUTF8());
    }

    std::vector<std::byte> bytes (block.getSize());
    std::memcpy (bytes.data(), block.getData(), block.getSize());
    return juce::WebBrowserComponent::Resource { std::move (bytes), mimeFor (path) };
}
