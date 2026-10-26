#include "PianoSampler.h"

namespace kh
{

namespace
{
    constexpr double maxSampleSeconds = 9.0;
    constexpr double attackSeconds    = 0.002;
    constexpr double releaseSeconds   = 0.22;

    /** "Ds4.mp3" -> 63 (Tone.js / Salamander naming: C, Ds, Fs, A per octave). */
    int midiNoteForSampleName (const juce::String& fileName)
    {
        const auto stem = fileName.upToFirstOccurrenceOf (".", false, false);

        if (stem.isEmpty())
            return -1;

        static const std::map<juce::String, int> pitchClasses {
            { "C", 0 }, { "Cs", 1 }, { "D", 2 }, { "Ds", 3 }, { "E", 4 }, { "F", 5 },
            { "Fs", 6 }, { "G", 7 }, { "Gs", 8 }, { "A", 9 }, { "As", 10 }, { "B", 11 } };

        const auto letters = stem.retainCharacters ("ABCDEFGs");
        const auto octave  = stem.retainCharacters ("0123456789-").getIntValue();
        const auto it = pitchClasses.find (letters);

        return it == pitchClasses.end() ? -1 : (octave + 1) * 12 + it->second;
    }
}

//==============================================================================
PianoSoundBank::PianoSoundBank() : juce::Thread ("KHIMAIRA piano loader")
{
    startThread (juce::Thread::Priority::low);
}

PianoSoundBank::~PianoSoundBank()
{
    stopThread (4000);
}

void PianoSoundBank::run()
{
    juce::AudioFormatManager formats;
   #if ! JUCE_USE_MP3AUDIOFORMAT
    #error "KHIMAIRA needs JUCE_USE_MP3AUDIOFORMAT=1 to decode the bundled piano samples"
   #endif
    formats.registerBasicFormats(); // includes MP3 when JUCE_USE_MP3AUDIOFORMAT=1

    struct Loaded { int root; std::unique_ptr<juce::AudioFormatReader> reader; };
    std::vector<Loaded> loaded;

    for (int i = 0; i < BinaryData::namedResourceListSize; ++i)
    {
        if (threadShouldExit())
            return;

        const auto* resourceName = BinaryData::namedResourceList[i];
        const juce::String original (BinaryData::getNamedResourceOriginalFilename (resourceName));

        if (! original.endsWithIgnoreCase (".mp3"))
            continue;

        const auto root = midiNoteForSampleName (original);
        int size = 0;
        const auto* data = BinaryData::getNamedResource (resourceName, size);

        if (root < 0 || data == nullptr || size <= 0)
            continue;

        auto stream = std::make_unique<juce::MemoryInputStream> (data, (size_t) size, false);

        if (auto* reader = formats.createReaderFor (std::move (stream)))
            loaded.push_back ({ root, std::unique_ptr<juce::AudioFormatReader> (reader) });
    }

    std::sort (loaded.begin(), loaded.end(), [] (const auto& a, const auto& b) { return a.root < b.root; });

    for (size_t i = 0; i < loaded.size(); ++i)
    {
        if (threadShouldExit())
            return;

        // Each sample covers the keys closest to it; the outer samples reach the piano's ends.
        const int root = loaded[i].root;
        const int low  = i == 0 ? 0 : (loaded[i - 1].root + root) / 2 + 1;
        const int high = i + 1 == loaded.size() ? 127 : (root + loaded[i + 1].root) / 2;

        juce::BigInteger range;
        range.setRange (low, high - low + 1, true);

        sounds.add (new juce::SamplerSound ("piano" + juce::String (root), *loaded[i].reader, range,
                                            root, attackSeconds, releaseSeconds, maxSampleSeconds));
    }

    ready = ! sounds.isEmpty();
}

//==============================================================================
PianoSampler::PianoSampler()
{
    for (int i = 0; i < 48; ++i)
        synth.addVoice (new juce::SamplerVoice());

    synth.setNoteStealingEnabled (true);
}

void PianoSampler::prepare (double sampleRate)
{
    synth.setCurrentPlaybackSampleRate (sampleRate);
}

bool PianoSampler::attachSoundsIfReady()
{
    if (attached)
        return true;

    if (! bank->isReady())
        return false;

    for (auto* s : bank->getSounds())
        synth.addSound (s);

    attached = true;
    return true;
}

void PianoSampler::render (juce::AudioBuffer<float>& buffer, const juce::MidiBuffer& midi, int numSamples)
{
    synth.renderNextBlock (buffer, midi, 0, numSamples);
}

void PianoSampler::allNotesOff()
{
    synth.allNotesOff (0, true);
}

} // namespace kh
