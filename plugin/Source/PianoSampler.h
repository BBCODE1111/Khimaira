#pragma once

#include <JuceHeader.h>

namespace kh
{

/** Salamander Grand Piano samples (the same set the website uses), decoded once and shared by
    every KHIMAIRA instance in the host process. Decoding runs on a background thread so plugin
    scanning and project loading stay fast. */
class PianoSoundBank : private juce::Thread
{
public:
    PianoSoundBank();
    ~PianoSoundBank() override;

    bool isReady() const noexcept { return ready.load(); }
    const juce::ReferenceCountedArray<juce::SynthesiserSound>& getSounds() const noexcept { return sounds; }

private:
    void run() override;

    juce::ReferenceCountedArray<juce::SynthesiserSound> sounds;
    std::atomic<bool> ready { false };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PianoSoundBank)
};

/** Built-in piano voice: a small sampler with a soft damper release. */
class PianoSampler
{
public:
    PianoSampler();

    void prepare (double sampleRate);
    /** Call from the message thread until it returns true. */
    bool attachSoundsIfReady();
    void render (juce::AudioBuffer<float>& buffer, const juce::MidiBuffer& midi, int numSamples);
    void allNotesOff();

private:
    juce::SharedResourcePointer<PianoSoundBank> bank;
    juce::Synthesiser synth;
    bool attached = false;
};

} // namespace kh
