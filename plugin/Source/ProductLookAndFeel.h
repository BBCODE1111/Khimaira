#pragma once
#include <juce_gui_basics/juce_gui_basics.h>
#include "BinaryData.h"
namespace productArt {
inline const juce::Colour background(0xff07131f),field(0xff294459),ink(0xffe5ecf1),muted(0xffaebfcc),accent(0xffc8ad7e),line(0xffa18a66),selected(0xff45667b),selectedInk(0xffedf2f6),glass(0x99071927);
}
class ProductLookAndFeel final:public juce::LookAndFeel_V4 {
 juce::Typeface::Ptr display=juce::Typeface::createSystemTypefaceFor(BinaryData::Cinzel_ttf,BinaryData::Cinzel_ttfSize),sans=juce::Typeface::createSystemTypefaceFor(BinaryData::DMSans_ttf,BinaryData::DMSans_ttfSize);
public:
 juce::Component* popupParent=nullptr;
 ProductLookAndFeel(){using namespace productArt;
  setColour(juce::Label::textColourId,ink);setColour(juce::TextButton::textColourOffId,ink);setColour(juce::TextButton::textColourOnId,ink);
  setColour(juce::ComboBox::textColourId,ink);setColour(juce::PopupMenu::backgroundColourId,background);setColour(juce::PopupMenu::textColourId,ink);
  setColour(juce::TextEditor::backgroundColourId,field.withAlpha(.48f));setColour(juce::TextEditor::textColourId,ink);setColour(juce::TextEditor::outlineColourId,line.withAlpha(.3f));setColour(juce::TextEditor::focusedOutlineColourId,accent);
  setColour(juce::Slider::textBoxTextColourId,ink);setColour(juce::Slider::textBoxOutlineColourId,juce::Colours::transparentBlack);setColour(juce::Slider::trackColourId,accent);setColour(juce::Slider::thumbColourId,accent);
  setColour(juce::ToggleButton::textColourId,ink);setColour(juce::ToggleButton::tickColourId,accent);setColour(juce::ScrollBar::thumbColourId,accent.withAlpha(.45f));
 }
 juce::Font brandFont(float s)const{return juce::Font(juce::FontOptions(display).withHeight(s));}
 juce::Font controlFont(float s)const{return juce::Font(juce::FontOptions(sans).withHeight(s));}
 juce::Font getTextButtonFont(juce::TextButton&,int)override{return controlFont(15);}
 juce::Font getComboBoxFont(juce::ComboBox&)override{return controlFont(15);}
 juce::Font getPopupMenuFont()override{return controlFont(15);}
 void drawButtonBackground(juce::Graphics& g,juce::Button& b,const juce::Colour&,bool hover,bool down)override{
  using namespace productArt;auto r=b.getLocalBounds().toFloat().reduced(.5f);bool primary=(bool)b.getProperties()["primary"];
  if(primary||b.getToggleState()||hover||down){g.setColour(primary?accent.withAlpha(down?.65f:.9f):field.withAlpha(down?.9f:.7f));g.fillRoundedRectangle(r,5);}
  if(b.hasKeyboardFocus(true)){g.setColour(accent);g.drawRoundedRectangle(r,5,1.5f);}
 }
 void drawButtonText(juce::Graphics& g,juce::TextButton& b,bool,bool)override{g.setFont(getTextButtonFont(b,b.getHeight()));g.setColour(((bool)b.getProperties()["primary"]?productArt::background:productArt::ink).withAlpha(b.isEnabled()?1.f:.35f));g.drawFittedText(b.getButtonText(),b.getLocalBounds().reduced(5,1),juce::Justification::centred,1);}
 void drawComboBox(juce::Graphics& g,int w,int h,bool,int,int,int,int,juce::ComboBox& b)override{using namespace productArt;g.setColour(field.withAlpha(b.isEnabled()?.62f:.2f));g.fillRoundedRectangle(0,0,(float)w,(float)h,5);g.setColour(line.withAlpha(.35f));g.drawHorizontalLine(h-1,7,(float)w-7);juce::Path p;p.startNewSubPath(w-18.f,h*.44f);p.lineTo(w-13.f,h*.58f);p.lineTo(w-8.f,h*.44f);g.setColour(muted);g.strokePath(p,juce::PathStrokeType(1.2f));}
};
