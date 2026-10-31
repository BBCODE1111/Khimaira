#pragma once
#include <juce_audio_utils/juce_audio_utils.h>
#include "Sequence.h"
#include "HostTimeline.h"
#include "StartPosition.h"
#include "NativeEngine.h"
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
 juce::AudioProcessorValueTreeState parameters;
 static juce::AudioProcessorValueTreeState::ParameterLayout parameterLayout();
 juce::var command(const juce::String& action,const juce::var& value={},const juce::String& key={});
 juce::var metadata();juce::var uiState();
 void setParameter(const juce::String&,float);void preset(int);
 khimaira::ArpParameters arpParameters() const;
 std::atomic<bool> arpEnabled{false};
 std::atomic<bool> pianoEnabled{false};
 std::atomic<float> pianoVolume{0.7f};
 int revision() const {return sequenceRevision.load();}
 int previewNoteCount();
 int arpStep()const{return liveArp.displayStep.load();}int arpPitch()const{return liveArp.displayPitch.load();}
 juce::String lastError;

 std::atomic<bool> followHost{true},armed{true},loop{true},previewRequested{false};
 std::atomic<double> bpm{120},position{0},hostTempo{120};
 std::atomic<bool> playing{false},hasHost{false},waitingForStart{false},hostPlaying{false},hostTempoAvailable{false},unsupportedMeter{false};
 std::atomic<int> hostNumerator{4},hostDenominator{4};
 bool syncTempo()const{return syncValue->load()>.5f;}
 double userTempo()const{return tempoValue->load();}
 std::atomic<double> startOrigin{0};
private:
 std::unique_ptr<NativeEngine> engine;
 juce::Synthesiser piano;
 bool pianoWasEnabled=false;
 void loadPiano();
 khimaira::LiveArpeggiator liveArp;bool wasArp=false;
 std::array<std::atomic<float>*,10> arpValues{};
 std::atomic<float>* syncValue=nullptr;std::atomic<float>* tempoValue=nullptr;
 std::atomic<float>* startModeValue=nullptr;std::atomic<float>* startBarValue=nullptr;
 khimaira::StartPosition startPosition;
 khimaira::Mailbox mailbox;khimaira::Scheduler scheduler;khimaira::HostTimeline hostTimeline;
 juce::CriticalSection stateLock;juce::var saved;
 khimaira::ArpPlan previewPlan;std::atomic<int> sequenceRevision{0};int countRevision=-1,cachedCount=0;khimaira::ArpParameters countParameters;
 std::atomic<int> restart{0};int lastRestart=0;double manualBeat=0,sampleRateHz=48000;
 bool wasHostPlaying=false, wasHostMode=false, wasRunning=false;
 juce::String instance=juce::Uuid().toString();int exportVersion=0;
 bool isStandalone() const{return wrapperType==wrapperType_Standalone;}
 JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(KhimairaProcessor)
};
