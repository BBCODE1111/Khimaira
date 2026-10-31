#pragma once
#include <juce_gui_basics/juce_gui_basics.h>
// Native JUCE controls consume the same choices/edit actions as the website.
class NativeChordPicker:public juce::Component {
 juce::OwnedArray<juce::TextButton> buttons;juce::ComboBox half,extras,roots,quality,bass,quick,destination;juce::Label title;
 std::function<void(juce::var)> apply;int bar;
 void action(juce::String operation,juce::String property={},juce::var value={}){auto d=new juce::DynamicObject;d->setProperty("operation",operation);d->setProperty("bar",bar);d->setProperty("chord",juce::jmax(0,half.getSelectedId()-1));if(property.isNotEmpty())d->setProperty(property,value);apply(juce::var(d));if(auto* c=findParentComponentOfClass<juce::CallOutBox>())c->dismiss();}
 void button(juce::String text,int x,int y,int w,std::function<void()> fn){auto* b=buttons.add(new juce::TextButton(text));addAndMakeVisible(b);b->setBounds(x,y,w,44);b->onClick=std::move(fn);}
public:
 NativeChordPicker(juce::var state,int index,std::function<void(juce::var)> callback):apply(std::move(callback)),bar(index){using namespace juce;setSize(500,500);
 title.setText(String::fromUTF8("BAR ")+String(bar+1)+String::fromUTF8(" · 編輯骨幹"),dontSendNotification);addAndMakeVisible(title);title.setBounds(12,8,330,32);
 auto list=state["backboneBars"][bar]["chords"];for(int i=0;i<jmax(1,list.size());i++)half.addItem(String(i+1)+juce::String::fromUTF8(" · ")+list[i]["symbol"].toString(),i+1);half.setSelectedId(1);addAndMakeVisible(half);half.setBounds(345,8,143,44);
 auto choices=state["chordChoices"];int i=0;for(auto c:*choices.getArray()){const auto symbol=c["symbol"].toString();button(symbol+juce::String::fromUTF8(" · ")+c["label"].toString(),12+(i%4)*122,60+(i/4)*50,116,[this,symbol]{action("select","symbol",symbol);});i++;}
 int id=1;for(auto c:*choices.getArray())extras.addItem(c["seventh"].toString(),id++);for(auto c:*state["extraChordChoices"].getArray())extras.addItem(c["symbol"].toString(),id++);
 extras.setTextWhenNothingSelected(String::fromUTF8("七和弦／次屬／借用"));addAndMakeVisible(extras);extras.setBounds(12,164,350,44);button(String::fromUTF8("選取"),370,164,118,[this]{if(extras.getSelectedId())action("select","symbol",extras.getText());});
 button(String::fromUTF8("分成兩半"),12,218,150,[this]{action("split");});button(String::fromUTF8("清除此小節"),174,218,150,[this]{action("clear");});button(String::fromUTF8("複製到下一格"),336,218,152,[this]{action("copy");});
 StringArray names{"C","Db","D","Eb","E","F","F#","G","Ab","A","Bb","B"};roots.addItemList(names,1);roots.setSelectedId(1);quality.addItemList({"major","m","7","maj7","m7","9","maj9","m9","sus2","sus4","add9","6","m6","m7b5","dim","dim7","13","7#11"},1);quality.setSelectedId(1);bass.addItem(String::fromUTF8("根音"),1);bass.addItemList(names,2);bass.setSelectedId(1);
 for(auto* c:{&roots,&quality,&bass})addAndMakeVisible(c);roots.setBounds(12,276,100,44);quality.setBounds(120,276,120,44);bass.setBounds(248,276,112,44);button(String::fromUTF8("套用和弦"),370,276,118,[this]{action("select","symbol",roots.getText()+(quality.getSelectedId()==1?String():quality.getText())+(bass.getSelectedId()==1?String():"/"+bass.getText()));});
 id=1;for(auto name:*state["quickProgressions"].getArray())quick.addItem(name.toString(),id++);quick.setTextWhenNothingSelected(String::fromUTF8("快速起手"));addAndMakeVisible(quick);quick.setBounds(12,332,350,44);button(String::fromUTF8("載入進行"),370,332,118,[this]{if(quick.getSelectedId())action("quick","name",quick.getText());});
 for(int j=0;j<state["bars"].size();j++)destination.addItem("BAR "+String(j+1),j+1);destination.setSelectedId(bar+1);addAndMakeVisible(destination);destination.setBounds(12,388,350,44);button(String::fromUTF8("交換位置"),370,388,118,[this]{action("move","to",destination.getSelectedId()-1);});
 button("RESTORE",12,444,150,[this]{auto d=new DynamicObject;d->setProperty("operation","restore");apply(var(d));if(auto* c=findParentComponentOfClass<CallOutBox>())c->dismiss();});
 }
 void paint(juce::Graphics& g)override{g.fillAll(juce::Colour(0xff102b3b));}
};
