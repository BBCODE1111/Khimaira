#pragma once
#include "PluginProcessor.h"
#include <juce_gui_extra/juce_gui_extra.h>
class LocalBrowser : public juce::WebBrowserComponent {
public:using WebBrowserComponent::WebBrowserComponent;
 bool pageAboutToLoad(const juce::String& url) override{return url=="about:blank"||url.startsWith(getResourceProviderRoot());}
 void newWindowAttemptingToLoad(const juce::String&) override{}
};
class MidiDragButton : public juce::TextButton {
public:MidiDragButton(KhimairaProcessor& p):TextButton("DRAG MIDI"),processor(p){}
 void mouseDown(const juce::MouseEvent& e) override{dragged=false;TextButton::mouseDown(e);}
 void mouseUp(const juce::MouseEvent& e) override{if(dragged){setState(buttonNormal);return;}TextButton::mouseUp(e);}
 void mouseDrag(const juce::MouseEvent& e) override{if(!dragged&&e.getDistanceFromDragStart()>5){dragged=true;auto f=processor.midiFile();if(f.existsAsFile())juce::DragAndDropContainer::performExternalDragDropOfFiles({f.getFullPathName()},false,this);}}
private:KhimairaProcessor& processor;bool dragged=false;
};
class KhimairaEditor final: public juce::AudioProcessorEditor,private juce::Timer {
public:KhimairaEditor(KhimairaProcessor&);~KhimairaEditor() override;
 void resized() override;void paint(juce::Graphics&) override;
private:
 KhimairaProcessor& processor;std::unique_ptr<LocalBrowser> browser;MidiDragButton drag;
 juce::Label footer;std::unique_ptr<juce::FileChooser> chooser;
 std::map<juce::String,juce::WebBrowserComponent::Resource> resources;
 void timerCallback() override;
 JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(KhimairaEditor)
};
