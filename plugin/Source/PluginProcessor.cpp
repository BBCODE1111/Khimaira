#include "PluginProcessor.h"
#include "PluginEditor.h"

namespace
{
    const juce::String stateTag     = "KHIMAIRA";
    const juce::String webTag       = "WEB";
    const juce::String perfTag      = "PERFORMANCE";
    const juce::String sustainTag   = "SUSTAIN";
    const juce::String paramsTag    = "PARAMS";

    juce::String patternToString (const kh::Pattern& p)
    {
        juce::String s;
        s.preallocateBytes ((size_t) p.notes.size() * 24);
        s << juce::String (p.lengthBeats, 6) << "|";

        for (const auto& n : p.notes)
            s << juce::String (n.beat, 5) << "," << juce::String (n.length, 5) << ","
              << n.note << "," << juce::String (n.velocity, 4) << ";";

        return s;
    }

    kh::Pattern patternFromString (const juce::String& text)
    {
        kh::Pattern p;
        p.lengthBeats = juce::jmax (0.0, text.upToFirstOccurrenceOf ("|", false, false).getDoubleValue());

        for (const auto& item : juce::StringArray::fromTokens (text.fromFirstOccurrenceOf ("|", false, false), ";", ""))
        {
            const auto f = juce::StringArray::fromTokens (item, ",", "");

            if (f.size() == 4)
                p.notes.push_back ({ f[0].getDoubleValue(), f[1].getDoubleValue(),
                                     juce::jlimit (0, 127, f[2].getIntValue()),
                                     (float) juce::jlimit (0.0, 1.0, f[3].getDoubleValue()) });
        }

        return p;
    }
}

//==============================================================================
juce::AudioProcessorValueTreeState::ParameterLayout KhimairaProcessor::createLayout()
{
    using namespace juce;
    AudioProcessorValueTreeState::ParameterLayout layout;

    layout.add (std::make_unique<AudioParameterBool>   (ParameterID { "hostSync", 1 }, "Host Sync", true));
    layout.add (std::make_unique<AudioParameterBool>   (ParameterID { "piano", 1 }, "Built-in Piano", true));
    layout.add (std::make_unique<AudioParameterFloat>  (ParameterID { "volume", 1 }, "Piano Volume",
                                                        NormalisableRange<float> (0.0f, 1.0f), 0.75f));
    layout.add (std::make_unique<AudioParameterChoice> (ParameterID { "source", 1 }, "Play",
                                                        StringArray { "Performance", "Sustain chords" }, 0));
    layout.add (std::make_unique<AudioParameterInt>    (ParameterID { "channel", 1 }, "MIDI Channel", 1, 16, 1));
    layout.add (std::make_unique<AudioParameterBool> (ParameterID { "pedal", 1 }, "Host Pedal CC64", false));
    return layout;
}

KhimairaProcessor::KhimairaProcessor()
    : AudioProcessor (BusesProperties().withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
      params (*this, nullptr, "PARAMS", createLayout())
{
    hostSyncParam = params.getRawParameterValue ("hostSync");
    pianoParam    = params.getRawParameterValue ("piano");
    volumeParam   = params.getRawParameterValue ("volume");
    sourceParam   = params.getRawParameterValue ("source");
    channelParam  = params.getRawParameterValue ("channel");
    pedalParam = params.getRawParameterValue ("pedal");

    hostPlayer.prepare();
    startTimerHz (10);
}

KhimairaProcessor::~KhimairaProcessor()
{
    stopTimer();
}

//==============================================================================
void KhimairaProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    currentSampleRate = sampleRate;
    currentBlockSize = juce::jmax (32, samplesPerBlock);
    piano.prepare (sampleRate);
    hostPlayer.reset();
    pedalPlayer = {};
    audioPattern = nullptr;
    preview.reset();
    activeOutputChannel = juce::jlimit (1, 16, (int) channelParam->load());
    generated.ensureSize (8192);
    gain.reset (sampleRate, 0.03);
    gain.setCurrentAndTargetValue (volumeParam->load());
}

void KhimairaProcessor::releaseResources()
{
    piano.allNotesOff();
}

bool KhimairaProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    const auto out = layouts.getMainOutputChannelSet();
    return out == juce::AudioChannelSet::mono() || out == juce::AudioChannelSet::stereo();
}

void KhimairaProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi)
{
    juce::ScopedNoDenormals noDenormals;
    const int numSamples = buffer.getNumSamples();
    const double sr = getSampleRate() > 0.0 ? getSampleRate() : currentSampleRate.load();
    const int channel = juce::jlimit (1, 16, (int) channelParam->load());

    buffer.clear();
    generated.clear();
    generated.addEvents (midi, 0, numSamples, 0); // keyboard input still plays the piano and passes through

    bool playing = false;
    double ppq = 0.0, bpm = 120.0;

    if (auto* ph = getPlayHead())
    {
        if (const auto pos = ph->getPosition())
        {
            playing = pos->getIsPlaying();

            if (const auto p = pos->getPpqPosition())
                ppq = *p;
            else
                playing = false;

            if (const auto b = pos->getBpm())
                bpm = *b;
        }
    }

    hostPlaying = playing;
    hostPpq = ppq;
    hostBpm = bpm;

    auto emit = [&] (const kh::MidiOut& e)
    {
        const auto vel = (juce::uint8) juce::jlimit (1, 127, (int) std::lround (e.velocity * 127.0f));
        generated.addEvent (e.on ? juce::MidiMessage::noteOn (activeOutputChannel, e.note, vel)
                                 : juce::MidiMessage::noteOff (activeOutputChannel, e.note),
                            e.offset);
    };

    static const kh::Pattern empty;
    patternReaders.fetch_add (1);
    const auto* pattern = livePattern.load();
    const bool sync = hostSyncParam->load() > 0.5f;

    auto emitPedal = [&] (const kh::PedalOut& e)
    { generated.addEvent (juce::MidiMessage::controllerEvent (e.channel, 64, e.value), e.offset); };
    // End held notes on their original MIDI channel before switching routes.
    if (activeOutputChannel != channel)
    {
        pedalPlayer.stop (0, emitPedal);
        hostPlayer.process (empty, false, ppq, bpm, sr, numSamples, emit);
        preview.push ({ kh::PreviewCommand::stopAll });
        preview.process (sampleClock.load(), numSamples, emit);
        activeOutputChannel = channel;
    }
    // A synced host owns playback. Stop audition voices before new host notes arrive.
    if (playing && sync)
    {
        preview.push ({ kh::PreviewCommand::stopAll });
        preview.process (sampleClock.load(), numSamples, emit);
    }
    if (audioPattern != pattern)
    {
        pedalPlayer.stop (0, emitPedal);
        hostPlayer.process (empty, false, ppq, bpm, sr, numSamples, emit);
        audioPattern = pattern;
    }
    const auto& current = pattern != nullptr ? *pattern : empty;
    pedalPlayer.process (current.pedals, current.lengthBeats, playing && sync && pedalParam->load() > .5f,
                         ppq, bpm, sr, numSamples, channel, emitPedal);
    hostPlayer.process (current, playing && sync, ppq, bpm, sr, numSamples, emit);
    patternReaders.fetch_sub (1);

    // Notes from the editor's PLAY button.
    {
        const auto scope = previewFifo.read (previewFifo.getNumReady());

        for (int i = 0; i < scope.blockSize1; ++i) preview.push (previewBuffer[(size_t) (scope.startIndex1 + i)]);
        for (int i = 0; i < scope.blockSize2; ++i) preview.push (previewBuffer[(size_t) (scope.startIndex2 + i)]);
    }

    const auto clock = sampleClock.load();
    if (playing && sync) preview.reset(); // discard queued auditions during host playback
    else preview.process (clock, numSamples, emit);
    sampleClock = clock + numSamples;

    // Built-in piano.
    const bool pianoOn = pianoParam->load() > 0.5f;

    if (pianoOn)
    {
        piano.render (buffer, generated, numSamples);
        gain.setTargetValue (volumeParam->load() * 0.9f);
        gain.applyGain (buffer, numSamples);
    }
    else if (pianoWasOn)
    {
        piano.allNotesOff();
    }

    pianoWasOn = pianoOn;
    midi.swapWith (generated);
}

//==============================================================================
void KhimairaProcessor::timerCallback()
{
    piano.attachSoundsIfReady();

    const bool wantSustain = sourceParam->load() > 0.5f;

    if (wantSustain != sustainSourceActive)
    {
        sustainSourceActive = wantSustain;
        publishPattern (wantSustain ? sustainPattern : performancePattern);
    }
}

void KhimairaProcessor::publishPattern (const kh::Pattern& p)
{
    auto copy = std::make_unique<kh::Pattern> (p);
    livePattern = copy.get();
    patternHistory.push_back (std::move (copy));

    // Retire snapshots only when no audio callback can still be reading an older one.
    while (patternReaders.load() == 0 && patternHistory.size() > 1)
        patternHistory.pop_front();
}

void KhimairaProcessor::setPatterns (kh::Pattern performance, kh::Pattern sustain, const juce::String& name)
{
    JUCE_ASSERT_MESSAGE_THREAD
    performance.pedals.clear();
    for (const auto& n : sustain.notes)
        if (n.length > 0 && n.beat >= 0 && n.beat < sustain.lengthBeats)
            performance.pedals.push_back ({ n.beat, std::min (n.length, sustain.lengthBeats - n.beat) });
    std::sort (performance.pedals.begin(), performance.pedals.end(), [] (auto a, auto b) { return a.beat < b.beat; });
    performance.pedals.erase (std::unique (performance.pedals.begin(), performance.pedals.end(),
        [] (auto a, auto b) { return a.beat == b.beat; }), performance.pedals.end());
    sustain.pedals = performance.pedals;
    performancePattern = std::move (performance);
    sustainPattern = std::move (sustain);
    patternName = juce::File::createLegalFileName (name.isNotEmpty() ? name : juce::String ("KHIMAIRA"));
    sustainSourceActive = sourceParam->load() > 0.5f;
    publishPattern (sustainSourceActive ? sustainPattern : performancePattern);
}

void KhimairaProcessor::setWebState (const juce::String& json)
{
    const juce::ScopedLock sl (stateLock);
    webState = json;
}

juce::String KhimairaProcessor::getWebState() const
{
    const juce::ScopedLock sl (stateLock);
    return webState;
}

KhimairaProcessor::HostStatus KhimairaProcessor::getHostStatus() const
{
    const auto* p = livePattern.load();
    return { hostPlaying.load(), hostPpq.load(), hostBpm.load(),
             p != nullptr && ! p->notes.empty(), p != nullptr ? p->lengthBeats : 0.0 };
}

//==============================================================================
int64_t KhimairaProcessor::secondsToClock (double seconds) const
{
    // Two blocks of safety so a note sent "now" is never placed in a block already rendered.
    return sampleClock.load() + 2 * currentBlockSize.load()
         + (int64_t) std::llround (juce::jmax (0.0, seconds) * currentSampleRate.load());
}

void KhimairaProcessor::queuePreview (const kh::PreviewCommand& c)
{
    const auto scope = previewFifo.write (1);

    if (scope.blockSize1 > 0)      previewBuffer[(size_t) scope.startIndex1] = c;
    else if (scope.blockSize2 > 0) previewBuffer[(size_t) scope.startIndex2] = c;
}

void KhimairaProcessor::previewNoteOn (int id, int note, float velocity, double delaySeconds, double durationSeconds)
{
    if (id <= 0 || note < 0 || note > 127)
        return;

    kh::PreviewCommand c;
    c.type = kh::PreviewCommand::noteOn;
    c.id = id;
    c.note = note;
    c.velocity = juce::jlimit (0.05f, 1.0f, velocity);
    c.startSample = secondsToClock (delaySeconds);
    c.endSample = c.startSample + (int64_t) std::llround (juce::jmax (0.01, durationSeconds) * currentSampleRate.load());
    queuePreview (c);
}

void KhimairaProcessor::previewRetime (int id, double endDelaySeconds)
{
    kh::PreviewCommand c;
    c.type = kh::PreviewCommand::retime;
    c.id = id;
    c.endSample = secondsToClock (endDelaySeconds);
    queuePreview (c);
}

void KhimairaProcessor::previewCancel (int id)
{
    kh::PreviewCommand c;
    c.type = kh::PreviewCommand::cancel;
    c.id = id;
    c.endSample = secondsToClock (0.0);
    queuePreview (c);
}

void KhimairaProcessor::previewStopAll()
{
    kh::PreviewCommand c;
    c.type = kh::PreviewCommand::stopAll;
    queuePreview (c);
}

//==============================================================================
juce::String KhimairaProcessor::getExportBaseName() const
{
    return patternName;
}

juce::File KhimairaProcessor::getExportFolder() const
{
    auto folder = juce::File::getSpecialLocation (juce::File::userDocumentsDirectory).getChildFile ("KHIMAIRA MIDI");
    folder.createDirectory();
    return folder;
}

juce::File KhimairaProcessor::writeMidiFile (bool sustain) const
{
    const auto& p = sustain ? sustainPattern : performancePattern;

    if (p.notes.empty())
        return {};

    constexpr int ppqn = 480;
    juce::MidiMessageSequence track;
    track.addEvent (juce::MidiMessage::textMetaEvent (3, patternName), 0.0);

    auto sorted = p.notes;
    std::sort (sorted.begin(), sorted.end(), [] (const auto& a, const auto& b)
               { return a.beat < b.beat || (a.beat == b.beat && a.note < b.note); });

    std::array<double, 128> lastEnd {};
    lastEnd.fill (-1.0);
    std::array<int, 128> lastIndex {};

    struct Tick { int note, start, end, vel; };
    std::vector<Tick> ticks;

    for (const auto& n : sorted)
    {
        const int start = (int) std::lround (n.beat * ppqn);
        const int end = juce::jmax (start + 1, (int) std::lround ((n.beat + n.length) * ppqn));
        const int vel = juce::jlimit (1, 127, (int) std::lround (n.velocity * 127.0f));

        if (lastEnd[(size_t) n.note] >= 0.0)
        {
            auto& prev = ticks[(size_t) lastIndex[(size_t) n.note]];

            if (prev.start == start) { prev.end = juce::jmax (prev.end, end); prev.vel = juce::jmax (prev.vel, vel); continue; }
            if (prev.end > start)    prev.end = start;
        }

        lastIndex[(size_t) n.note] = (int) ticks.size();
        lastEnd[(size_t) n.note] = end;
        ticks.push_back ({ n.note, start, end, vel });
    }

    for (const auto& t : ticks)
    {
        track.addEvent (juce::MidiMessage::noteOn (1, t.note, (juce::uint8) t.vel), t.start);
        track.addEvent (juce::MidiMessage::noteOff (1, t.note), t.end);
    }

    if (pedalParam->load() > .5f)
        for (const auto& span : p.pedals)
        {
            const auto on = std::lround ((span.beat + std::min (1.0 / 64.0, span.length / 4)) * ppqn);
            const auto off = std::lround (std::min (p.lengthBeats, span.beat + span.length) * ppqn);
            track.addEvent (juce::MidiMessage::controllerEvent (1, 64, 127), on);
            track.addEvent (juce::MidiMessage::controllerEvent (1, 64, 0), off);
        }
    track.updateMatchedPairs();
    track.addEvent (juce::MidiMessage::endOfTrack(), juce::jmax ((double) track.getEndTime(), p.lengthBeats * ppqn));

    juce::MidiFile file;
    file.setTicksPerQuarterNote (ppqn);
    file.addTrack (track);

    auto dir = juce::File::getSpecialLocation (juce::File::tempDirectory).getChildFile ("KHIMAIRA");
    dir.createDirectory();
    auto out = dir.getChildFile (patternName + (sustain ? "-sustain" : "") + ".mid");
    out.deleteFile();

    if (auto stream = out.createOutputStream())
    {
        file.writeTo (*stream, 1);
        stream->flush();
        return out;
    }

    return {};
}

//==============================================================================
void KhimairaProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    juce::XmlElement root (stateTag);
    root.setAttribute ("version", 1);
    root.setAttribute ("name", patternName);
    root.setAttribute ("editorW", editorSize.x);
    root.setAttribute ("editorH", editorSize.y);

    if (auto p = params.copyState().createXml())
    {
        p->setTagName (paramsTag);
        root.addChildElement (p.release());
    }

    root.createNewChildElement (webTag)->addTextElement (getWebState());
    root.createNewChildElement (perfTag)->addTextElement (patternToString (performancePattern));
    root.createNewChildElement (sustainTag)->addTextElement (patternToString (sustainPattern));

    copyXmlToBinary (root, destData);
}

void KhimairaProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    const auto xml = getXmlFromBinary (data, sizeInBytes);

    if (xml == nullptr || ! xml->hasTagName (stateTag))
        return;

    editorSize = { xml->getIntAttribute ("editorW", 1180), xml->getIntAttribute ("editorH", 820) };

    if (auto* p = xml->getChildByName (paramsTag))
    {
        auto copy = std::make_unique<juce::XmlElement> (*p);
        copy->setTagName (params.state.getType().toString());
        params.replaceState (juce::ValueTree::fromXml (*copy));
    }

    if (auto* w = xml->getChildByName (webTag))
        setWebState (w->getAllSubText());

    kh::Pattern perf, sus;

    if (auto* e = xml->getChildByName (perfTag))    perf = patternFromString (e->getAllSubText());
    if (auto* e = xml->getChildByName (sustainTag)) sus  = patternFromString (e->getAllSubText());

    const auto name = xml->getStringAttribute ("name", "KHIMAIRA");

    juce::MessageManager::callAsync ([safe = juce::WeakReference<KhimairaProcessor> (this), perf, sus, name]() mutable
    {
        if (auto* self = safe.get())
            self->setPatterns (std::move (perf), std::move (sus), name);
    });
}

//==============================================================================
juce::AudioProcessorEditor* KhimairaProcessor::createEditor()
{
    return new KhimairaEditor (*this);
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new KhimairaProcessor();
}
