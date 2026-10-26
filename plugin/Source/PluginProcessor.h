#pragma once

#include <JuceHeader.h>
#include <deque>
#include "PatternPlayer.h"
#include "PianoSampler.h"

class KhimairaProcessor : public juce::AudioProcessor,
                          private juce::Timer
{
public:
    KhimairaProcessor();
    ~KhimairaProcessor() override;

    //==============================================================================
    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    bool isBusesLayoutSupported (const BusesLayout&) const override;
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
    using AudioProcessor::processBlock;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return true; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.3; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return "Default"; }
    void changeProgramName (int, const juce::String&) override {}

    void getStateInformation (juce::MemoryBlock&) override;
    void setStateInformation (const void*, int) override;

    //==============================================================================
    // Message-thread API used by the editor / web bridge.
    void setPatterns (kh::Pattern performance, kh::Pattern sustain, const juce::String& name);
    void setWebState (const juce::String& json);
    juce::String getWebState() const;

    void previewNoteOn (int id, int note, float velocity, double delaySeconds, double durationSeconds);
    void previewRetime (int id, double endDelaySeconds);
    void previewCancel (int id);
    void previewStopAll();

    /** Writes the current pattern as a standard MIDI file and returns it (empty File if none). */
    juce::File writeMidiFile (bool sustain) const;
    juce::String getExportBaseName() const;
    juce::File getExportFolder() const;

    struct HostStatus { bool playing = false; double ppq = 0.0; double bpm = 0.0; bool hasPattern = false; double lengthBeats = 0.0; };
    HostStatus getHostStatus() const;

    juce::AudioProcessorValueTreeState params;
    juce::Point<int> editorSize { 1180, 820 };

    static juce::AudioProcessorValueTreeState::ParameterLayout createLayout();

private:
    void timerCallback() override;
    void publishPattern (const kh::Pattern& p);
    void queuePreview (const kh::PreviewCommand&);
    int64_t secondsToClock (double seconds) const;

    kh::PianoSampler piano;
    kh::PatternPlayer hostPlayer;
    kh::PedalPlayer pedalPlayer;
    const kh::Pattern* audioPattern = nullptr;
    std::atomic<int> patternReaders { 0 };
    kh::PreviewScheduler preview;

    // Patterns are immutable once published; the audio thread reads through an atomic pointer.
    std::deque<std::unique_ptr<kh::Pattern>> patternHistory;
    std::atomic<const kh::Pattern*> livePattern { nullptr };
    kh::Pattern performancePattern, sustainPattern;
    juce::String patternName { "KHIMAIRA" };
    bool sustainSourceActive = false;

    juce::AbstractFifo previewFifo { 2048 };
    std::array<kh::PreviewCommand, 2048> previewBuffer;

    std::atomic<int64_t> sampleClock { 0 };
    std::atomic<double> currentSampleRate { 44100.0 };
    std::atomic<int> currentBlockSize { 512 };

    std::atomic<bool> hostPlaying { false };
    std::atomic<double> hostPpq { 0.0 }, hostBpm { 0.0 };

    juce::MidiBuffer generated;
    juce::SmoothedValue<float> gain;

    mutable juce::CriticalSection stateLock;
    juce::String webState;

    std::atomic<float>* hostSyncParam = nullptr;
    std::atomic<float>* pianoParam    = nullptr;
    std::atomic<float>* volumeParam   = nullptr;
    std::atomic<float>* sourceParam   = nullptr;
    std::atomic<float>* channelParam  = nullptr;
    std::atomic<float>* pedalParam = nullptr;
    bool pianoWasOn = true;

    JUCE_DECLARE_WEAK_REFERENCEABLE (KhimairaProcessor)
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (KhimairaProcessor)
};
