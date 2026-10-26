#pragma once

#include <JuceHeader.h>
#include "PluginProcessor.h"

//==============================================================================
/** Bronze-on-navy look matching the KHIMAIRA website. */
class KhimairaLookAndFeel : public juce::LookAndFeel_V4
{
public:
    KhimairaLookAndFeel();

    void drawButtonBackground (juce::Graphics&, juce::Button&, const juce::Colour&, bool highlighted, bool down) override;
    juce::Font getTextButtonFont (juce::TextButton&, int buttonHeight) override;
    void drawLinearSlider (juce::Graphics&, int x, int y, int w, int h, float pos, float min, float max,
                           juce::Slider::SliderStyle, juce::Slider&) override;

    static const juce::Colour navy, panel, bronze, ivory, steel, glow;
};

//==============================================================================
/** A tile the user drags straight onto a DAW track to drop the current pattern as a MIDI clip. */
class MidiDragTile : public juce::Component, public juce::SettableTooltipClient
{
public:
    MidiDragTile (KhimairaProcessor&, bool sustain, juce::String label);

    void paint (juce::Graphics&) override;
    void mouseEnter (const juce::MouseEvent&) override { repaint(); }
    void mouseExit (const juce::MouseEvent&) override  { repaint(); }
    void mouseDown (const juce::MouseEvent&) override;
    void mouseDrag (const juce::MouseEvent&) override;
    void mouseUp (const juce::MouseEvent&) override;

    std::function<void (juce::String)> onStatus;

private:
    KhimairaProcessor& processor;
    bool sustain;
    juce::String label;
    bool dragging = false;
};

//==============================================================================
class KhimairaWebView : public juce::WebBrowserComponent
{
public:
    using juce::WebBrowserComponent::WebBrowserComponent;

    bool pageAboutToLoad (const juce::String& url) override;
    void newWindowAttemptingToLoad (const juce::String& url) override;
};

//==============================================================================
class KhimairaEditor : public juce::AudioProcessorEditor,
                       private juce::Timer
{
public:
    explicit KhimairaEditor (KhimairaProcessor&);
    ~KhimairaEditor() override;

    void paint (juce::Graphics&) override;
    void resized() override;

private:
    void timerCallback() override;
    void handleWebEvent (const juce::var& event);
    std::optional<juce::WebBrowserComponent::Resource> getResource (const juce::String& url);
    juce::String buildIndexHtml (const juce::String& original) const;
    void setStatus (const juce::String& text);

    KhimairaProcessor& processor;
    KhimairaLookAndFeel lookAndFeel;

    std::unique_ptr<juce::ZipFile> webArchive;
    std::unique_ptr<juce::MemoryInputStream> webArchiveStream;
    std::unique_ptr<KhimairaWebView> web;

    juce::TextButton syncButton    { "HOST SYNC" };
    juce::TextButton pianoButton   { "PIANO" };
    juce::TextButton sustainButton { "SUSTAIN" };
    juce::Slider volume;
    juce::Label hostLabel, statusLabel;
    MidiDragTile dragPerformance, dragSustain;

    juce::AudioProcessorValueTreeState::ButtonAttachment syncAttachment, pianoAttachment, sustainAttachment;
    juce::AudioProcessorValueTreeState::SliderAttachment volumeAttachment;
    juce::TooltipWindow tooltips { this, 500 };

    juce::String statusText;
    juce::uint32 statusTime = 0;

    static constexpr int footerHeight = 58;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (KhimairaEditor)
};
