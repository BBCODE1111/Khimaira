#include "PluginEditor.h"
#include "BinaryData.h"
using namespace juce;
KhimairaEditor::KhimairaEditor(KhimairaProcessor& p):AudioProcessorEditor(p),processor(p),drag(p){
 auto input=new MemoryInputStream(BinaryData::ui_zip,BinaryData::ui_zipSize,false);ZipFile zip(input,true);
 for(int i=0;i<zip.getNumEntries();i++){auto* e=zip.getEntry(i);std::unique_ptr<InputStream> stream(zip.createStreamForEntry(i));MemoryBlock block;stream->readIntoMemoryBlock(block);auto name="/"+e->filename;String mime=name.endsWith(".js")?"text/javascript":name.endsWith(".css")?"text/css":name.endsWith(".svg")?"image/svg+xml":name.endsWith(".png")?"image/png":"text/html";WebBrowserComponent::Resource r;r.mimeType=mime;auto b=(const std::byte*)block.getData();r.data.assign(b,b+block.getSize());resources.emplace(name,std::move(r));}
 auto options=WebBrowserComponent::Options{}.withNativeIntegrationEnabled()
 .withResourceProvider([this](const String& path)->std::optional<WebBrowserComponent::Resource>{auto key=path.upToFirstOccurrenceOf("?",false,false);if(key=="/")key="/index.html";auto it=resources.find(key);return it==resources.end()?std::nullopt:std::optional<WebBrowserComponent::Resource>(it->second);})
 .withNativeFunction("snapshot",[this](const Array<var>&,auto done){done(processor.snapshot());})
 .withNativeFunction("update",[this](const Array<var>& args,auto done){done(args.isEmpty()?var():processor.update(args[0]));})
 .withNativeFunction("saveUi",[this](const Array<var>& args,auto done){if(!args.isEmpty())processor.saveUi(args[0]);done(true);})
 .withNativeFunction("transport",[this](const Array<var>& args,auto done){if(!args.isEmpty())processor.transport(args[0]);done(processor.status());})
 .withNativeFunction("status",[this](const Array<var>&,auto done){done(processor.status());});
 #if JUCE_WINDOWS
 // The default Windows browser is IE, which cannot run the embedded ES modules.
 // DAW executables often live in Program Files: use a writable per-user cache.
 options=options.withBackend(WebBrowserComponent::Options::Backend::webview2)
  .withWinWebView2Options(WebBrowserComponent::Options::WinWebView2{}
   .withUserDataFolder(File::getSpecialLocation(File::userApplicationDataDirectory).getChildFile("KHIMAIRA/WebView2")));
 #endif
 browser=std::make_unique<LocalBrowser>(options);addAndMakeVisible(*browser);browser->goToURL(WebBrowserComponent::getResourceProviderRoot());
 addAndMakeVisible(drag);drag.setColour(TextButton::buttonColourId,Colour(0xff2d495f));drag.setColour(TextButton::textColourOffId,Colour(0xffe5ecf1));drag.setTooltip("Drag into a DAW MIDI track. Click to save a MIDI file.");
 drag.onClick=[this]{auto file=processor.midiFile();if(!file.existsAsFile())return;chooser=std::make_unique<FileChooser>("Save KHIMAIRA MIDI",File::getSpecialLocation(File::userDocumentsDirectory).getChildFile("KHIMAIRA.mid"),"*.mid",true,false,this);Component::SafePointer<KhimairaEditor> safe(this);chooser->launchAsync(FileBrowserComponent::saveMode|FileBrowserComponent::canSelectFiles|FileBrowserComponent::warnAboutOverwriting,[safe,file](const FileChooser& c){if(safe){auto dest=c.getResult();if(dest!=File())file.copyFileTo(dest);}});};
 addAndMakeVisible(footer);footer.setText("KHIMAIRA 1.2 / Native MIDI / Host BPM",dontSendNotification);footer.setColour(Label::textColourId,Colour(0xffbdcad5));footer.setFont(FontOptions(12));
 setResizable(true,true);setResizeLimits(760,560,1400,1000);setSize(900,650);startTimerHz(15);
}
KhimairaEditor::~KhimairaEditor(){stopTimer();browser.reset();}
void KhimairaEditor::resized(){auto r=getLocalBounds();auto bottom=r.removeFromBottom(42).reduced(16,5);drag.setBounds(bottom.removeFromRight(172));footer.setBounds(bottom);browser->setBounds(r);}
void KhimairaEditor::paint(Graphics& g){g.fillAll(Colour(0xff0b1926));}
void KhimairaEditor::timerCallback(){browser->emitEventIfBrowserIsVisible("transportState",processor.status());}
