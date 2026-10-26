#pragma once
#include <juce_audio_utils/juce_audio_utils.h>
#include "Sequence.h"
class KhimairaProcessor final : public juce::AudioProcessor {
public:
 KhimairaProcessor();
 const juce::String getName() const override {return JucePlugin_Name;}
 bool acceptsMidi() const override{return true;} bool producesMidi() const override{return true;}
 bool isMidiEffect() const override{return KHIMAIRA_MIDI_FX!=0;}
 double getTailLengthSeconds() const override{return 0;}
 int getNumPrograms() override{return 1;} int getCurrentProgram() override{return 0;}
 void setCurrentProgram(int) override{} const juce::String getProgramName(int) override{return {};}
 void changeProgramName(int,const juce::String&) override{}
 void prepareToPlay(double,int) override;void releaseResources() override{}
 bool isBusesLayoutSupported(const BusesLayout&) const override;
 void processBlock(juce::AudioBuffer<float>&,juce::MidiBuffer&) override;
 bool hasEditor() const override{return true;} juce::AudioProcessorEditor* createEditor() override;
 void getStateInformation(juce::MemoryBlock&) override;void setStateInformation(const void*,int) override;
 void saveUi(const juce::var&);juce::var update(const juce::var&);juce::var snapshot();juce::var status();
 void transport(const juce::var&);juce::File midiFile();
 std::atomic<bool> followHost{true},armed{true},loop{true},previewRequested{false};
 std::atomic<double> bpm{120},position{0},hostTempo{120};
 std::atomic<bool> playing{false},hasHost{false};
private:
 khimaira::Mailbox mailbox;khimaira::Scheduler scheduler;
 juce::CriticalSection stateLock;juce::var saved;
 std::atomic<int> restart{0};int lastRestart=0;double manualBeat=0,sampleRateHz=48000;
 bool wasHostPlaying=false, wasHostMode=false, wasRunning=false;
 juce::String instance=juce::Uuid().toString();int exportVersion=0;
 bool isStandalone() const{return wrapperType==wrapperType_Standalone;}
 JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(KhimairaProcessor)
};
