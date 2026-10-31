#pragma once
#include "PluginProcessor.h"
#include "ProductLookAndFeel.h"
class ScoreCanvas final:public juce::Component {
public:
 struct Cell {int bar=0,chord=0;double beat=0,beats=0;juce::Rectangle<float> bounds;juce::String symbol,degree;};
 std::vector<Cell> cells;juce::var chart,degrees;int selectedBar=0,selectedChord=0;double beat=0;bool playing=false;
 std::function<void(int,int)> selected;std::function<void(float)> scroll;
 void update(const juce::var&,int width);void paint(juce::Graphics&)override;
 void mouseDown(const juce::MouseEvent&)override;void mouseDrag(const juce::MouseEvent&)override;void mouseUp(const juce::MouseEvent&)override;void mouseWheelMove(const juce::MouseEvent&,const juce::MouseWheelDetails&)override;
private:int lastX=0;bool dragged=false;
};
class ScoreViewport final:public juce::Viewport {
public:bool automatic=false;std::function<void()> moved;
 void visibleAreaChanged(const juce::Rectangle<int>&)override{if(!automatic&&moved)moved();}
 void moveTo(int x){automatic=true;setViewPosition(x,0);automatic=false;}
};
class MidiDragButton final:public juce::TextButton {
 KhimairaProcessor& processor;bool dragged=false;
public:MidiDragButton(KhimairaProcessor& p):TextButton("Export MIDI"),processor(p){}
 void mouseDown(const juce::MouseEvent& e)override{dragged=false;TextButton::mouseDown(e);}
 void mouseUp(const juce::MouseEvent& e)override{if(dragged){setState(buttonNormal);return;}TextButton::mouseUp(e);}
 void mouseDrag(const juce::MouseEvent& e)override{if(!dragged&&e.getDistanceFromDragStart()>5){dragged=true;auto f=processor.midiFile();if(f.existsAsFile())juce::DragAndDropContainer::performExternalDragDropOfFiles({f.getFullPathName()},false,this);}}
};
class KhimairaEditor final:public juce::AudioProcessorEditor,private juce::Timer {
public:KhimairaEditor(KhimairaProcessor&);~KhimairaEditor()override;void paint(juce::Graphics&)override;void resized()override;bool keyPressed(const juce::KeyPress&)override;void updatePlaybackDisplay();
private:
 KhimairaProcessor& processor;ProductLookAndFeel look;juce::TooltipWindow tooltips{this,650};juce::Image art,emblem;
 ScoreCanvas score;ScoreViewport scoreView;juce::Viewport workView;juce::Component work,harmony,performance;
 juce::Label title,subtitle,clock,status,inspector,provenance;juce::TextEditor source,chordText;
 juce::TextButton open{"Open"},save{"Save"},play{"Play"},stop{"Stop"},loop{"Loop"},piano{"Piano"},follow{"Follow playhead"},key{"C major"},autoKey{"Auto"},down{juce::String::fromUTF8("−")},up{"+"},sync{"Sync"},tabHarmony{"Harmony"},tabPerformance{"Performance"};
 juce::TextButton load{"Load backbone"},morph{"MORPH"},inspire{"Inspire"},keep{"Keep"},restore{"Restore"},undo{"Undo"},compareA{juce::String::fromUTF8("A · Backbone")},compareB{juce::String::fromUTF8("B · Morph")},exampleLoad{"Load example"},applyChord{"Apply"},invert{"Invert"},parallel{"Parallel"},cadence{juce::String::fromUTF8("ii–V")},sourceRestore{"Restore source"},backboneEdit{"Edit backbone"};
 MidiDragButton midi;juce::Slider tempo,anchor,volume,gate,swing,human,groove,pianoGate,pianoHuman;
 juce::ComboBox styles,amplitude,density,examples,history,patterns,voicing,phrase,fills,startMode,arpMode,arpRate,arpOctaves,arpAccent,arpPhase,arpFoundation;
 juce::ToggleButton inversion{"Inversions"},parallelRule{"Parallel colour"},iiVRule{juce::String::fromUTF8("ii–V approach")},preserveBass{"Keep bass"},pedal{"Export sustain CC64"};
 juce::OwnedArray<juce::Label> labels;std::vector<std::pair<juce::Label*,juce::Component*>> fields;
 std::vector<juce::String> styleIds,patternIds,exampleIds;
 std::vector<std::unique_ptr<juce::AudioProcessorValueTreeState::ComboBoxAttachment>> comboAttachments;
 std::vector<std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment>> sliderAttachments;
 std::unique_ptr<juce::FileChooser> chooser;juce::var state;int tab=0,lastRevision=-1;bool refreshing=false,following=true;double noticeUntil=0;
 void act(const juce::String&,const juce::var& = {},const juce::String& = {});void refresh();void refreshSelection();void notice(const juce::String&);void timerCallback()override{updatePlaybackDisplay();}
 void addField(juce::Component&,juce::Component&,const juce::String&);void fieldBounds(juce::Component&,int,int,int,int=34);void keyMenu();void projectFile(bool);void exportMidi();juce::var selection()const;
 JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(KhimairaEditor)
};
