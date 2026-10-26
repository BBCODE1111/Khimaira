#include "../Source/PluginProcessor.h"
#include <cstdio>
struct TestPlayHead : juce::AudioPlayHead
{
    double beat = 1; bool playing = true;
    juce::Optional<PositionInfo> getPosition() const override {
        PositionInfo p; p.setPpqPosition(beat); p.setBpm(120); p.setIsPlaying(playing); return p;
    }
};
int main()
{
    juce::ScopedJuceInitialiser_GUI gui;
    int failures=0;
    #define CHECK(c) do {if (!(c)) {++failures;std::printf("Failure line %d\n",__LINE__);}} while(false)
    KhimairaProcessor processor;
    kh::Pattern perf {{{0,.5,60,.7f},{2,.5,65,.7f}},4};
    kh::Pattern sus {{{0,2,60,.7f},{0,2,64,.7f},{2,2,65,.7f}},4};
    processor.setPatterns(perf,sus,"KHIMAIRA-integration-test");
    for(bool enabled : {false,true}) {
        processor.params.getParameter("pedal")->setValueNotifyingHost(enabled?1.0f:0.0f);
        auto file=processor.writeMidiFile(false);auto stream=file.createInputStream();juce::MidiFile midi;
        CHECK(stream && midi.readFrom(*stream));int ons=0,offs=0,notes=0;
        const auto* track=midi.getTrack(0);
        if(track)for(int i=0;i<track->getNumEvents();++i){const auto& m=track->getEventPointer(i)->message;
            if(m.isNoteOn())++notes;
            if(m.isController()&&m.getControllerNumber()==64){m.getControllerValue()?++ons:++offs;CHECK(m.getTimeStamp()<=1920);}}
        CHECK(notes==2);CHECK(ons==(enabled?2:0));CHECK(offs==ons);
    }
    processor.setWebState("{\"test\":\"state roundtrip\"}");
    juce::MemoryBlock state;processor.getStateInformation(state);
    KhimairaProcessor restored;restored.setStateInformation(state.getData(),(int)state.getSize());
    juce::MessageManager::getInstance()->runDispatchLoopUntil(100);
    CHECK(restored.params.getRawParameterValue("pedal")->load()>.5f);
    CHECK(restored.getWebState()==processor.getWebState());CHECK(restored.getHostStatus().lengthBeats==4);
    auto f=restored.writeMidiFile(false);CHECK(f.existsAsFile());
    // Start between note attacks; channel changes must release the old route and chase the new one.
    TestPlayHead playhead;
    processor.setPlayHead(&playhead);
    processor.params.getParameter("piano")->setValueNotifyingHost(0);
    processor.params.getParameter("pedal")->setValueNotifyingHost(0);
    processor.setPatterns(sus,sus,"host-routing-test");
    processor.prepareToPlay(48000,512);
    juce::AudioBuffer<float> audio(2,512); juce::MidiBuffer events;
    processor.processBlock(audio,events);
    CHECK(events.getNumEvents()==2);
    for(auto e:events) CHECK(e.getMessage().isNoteOn() && e.getMessage().getChannel()==1);
    processor.params.getParameter("channel")->setValueNotifyingHost(1.0f/15.0f);
    playhead.beat+=512.0/24000; events.clear(); processor.processBlock(audio,events);
    int oldOffs=0,newOns=0;
    for(auto e:events) {const auto m=e.getMessage(); if(m.isNoteOff()&&m.getChannel()==1)++oldOffs; if(m.isNoteOn()&&m.getChannel()==2)++newOns;}
    CHECK(oldOffs==2 && newOns==2);
    // Preview events are suppressed while the host owns transport.
    processor.previewNoteOn(999,80,.8f,0,1); events.clear();
    playhead.beat+=512.0/24000; processor.processBlock(audio,events);
    for(auto e:events) CHECK(!e.getMessage().isNoteOn());
    playhead.playing=false; events.clear(); processor.processBlock(audio,events);
    CHECK(events.getNumEvents()==2);
    for(auto e:events) CHECK(e.getMessage().isNoteOff() && e.getMessage().getChannel()==2);
    processor.setPlayHead(nullptr);
    std::printf("Processor/export/state: %d failures\n",failures);return failures?1:0;
}
