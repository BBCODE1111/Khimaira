#include "../../Source/PluginProcessor.h"
#include "../../Source/ChordPicker.h"
#include "../../Source/PluginEditor.h"
#include <iostream>
using namespace juce;
void check(bool b,const char* s){if(!b)throw std::runtime_error(s);}
struct Clock:AudioPlayHead {double beat=0,tempo=120;int64 frame=0;bool play=true;Optional<PositionInfo> getPosition()const override{PositionInfo p;p.setBpm(tempo);p.setPpqPosition(beat);p.setTimeInSamples(frame);p.setIsPlaying(play);return p;}};
int main(){ScopedJuceInitialiser_GUI init;try{
 auto p=std::make_unique<KhimairaProcessor>();if(p->lastError.isNotEmpty())throw std::runtime_error(p->lastError.toStdString());
 if(!CHORD_SEIREN){
  MemoryBlock initial;p->getStateInformation(initial);
  p->command("set","F | Dm | Bb | C","sourceText");p->command("load");
  check((int)p->uiState()["key"]==5,"F backbone detection");
  const auto backbone=JSON::toString(p->uiState()["harmony"]["backbone"]);
  p->command("set","arp","pattern");p->command("generate");
  check((int)p->uiState()["key"]==5,"GENERATE changed key");
  check(JSON::toString(p->uiState()["harmony"]["backbone"])==backbone,"GENERATE overwrote backbone");
  p->command("set",2,"key");p->command("restoreBackbone");
  check(p->uiState()["bars"][0]["chords"][0]["symbol"].toString()=="D","degree transpose and RESTORE");
  auto examples=p->command("examples");check(examples.size()>0,"key-filtered examples missing");
  p->command("example",examples[0]["id"]);check((int)p->uiState()["key"]==2,"LOAD changed locked key");
  p->command("inspire");check((int)p->uiState()["key"]==2,"INSPIRE changed locked key");
  MemoryBlock recalled;p->getStateInformation(recalled);p->setStateInformation(recalled.getData(),(int)recalled.getSize());
  check((int)p->uiState()["key"]==2&&p->uiState()["harmony"].isObject(),"degree state recall");
  p->setStateInformation(initial.getData(),(int)initial.getSize());
  // Real JUCE/QuickJS engine: old preset IDs receive the repaired bar grid.
  p->command("set","C:2 G:2","sourceText");p->command("load");p->command("set","house","pattern");
  p->command("set",1,"genreRevision");p->command("set",0,"human");p->command("set",0,"swing");
  auto grid=p->snapshot();bool bassPickup=false,upperPickup=false,lateUpper=false;
  for(auto n:*grid["notes"].getArray()){
   const double beat=(double)n["beat"];const bool upper=n["part"].toString()=="upper";
   bassPickup|=!upper&&std::abs(beat-1.5)<1e-8;
   upperPickup|=upper&&std::abs(beat-1.75)<1e-8&&(double)n["duration"]>.25;
   lateUpper|=upper&&std::abs(beat-3.5)<1e-8;
   check(!(upper&&std::abs(beat-2)<1e-8),"pickup reattacked at split");
  }
  check(bassPickup&&upperPickup&&lateUpper,"house restarted its grid at split chord");
  p->getStateInformation(recalled);p->setStateInformation(recalled.getData(),(int)recalled.getSize());
  check(JSON::toString(p->snapshot()["notes"])==JSON::toString(grid["notes"]),"grid recall changed notes");
  p->command("set","house","pattern");check((int)p->uiState()["genreRevision"]==2,"explicit genre selection did not upgrade");
  check((int)p->uiState()["swing"]==9,"new house swing");
  auto modern=p->snapshot();bool offbeat=false;
  for(auto n:*modern["notes"].getArray()){if(n["part"].toString()=="upper"&&std::abs((double)n["beat"]-.5)<1e-8)offbeat=true;}
  check(offbeat,"modern house offbeat missing");
  p->getStateInformation(recalled);p->setStateInformation(recalled.getData(),(int)recalled.getSize());
  check(JSON::toString(p->snapshot()["notes"])==JSON::toString(modern["notes"]),"modern recall changed notes");
  std::cout<<"PASS actual QuickJS legacy/new house grid, explicit template upgrade and state recall.\n";
  p->setStateInformation(initial.getData(),(int)initial.getSize());
  auto operation=new DynamicObject;operation->setProperty("operation","select");operation->setProperty("bar",0);operation->setProperty("symbol","Dm7");p->command("backboneEdit",var(operation));
  check(p->uiState()["bars"][0]["chords"][0]["symbol"].toString()=="Dm7","native tap did not write backbone");
  NativeChordPicker picker(p->uiState(),0,[&](var value){p->command("backboneEdit",value);});
  auto pickerImage=picker.createComponentSnapshot(picker.getLocalBounds());File pickerFile=File::getCurrentWorkingDirectory().getChildFile("khimaira-chord-picker.png");pickerFile.deleteFile();FileOutputStream pickerOut(pickerFile);check(PNGImageFormat().writeImageToStream(pickerImage,pickerOut),"native picker snapshot");
  bool pressed=false;for(auto* child:picker.getChildren())if(auto* button=dynamic_cast<TextButton*>(child)){if(button->getButtonText().contains(" · ")){button->onClick();pressed=true;break;}}
  check(pressed,"native chord choice button missing");check(p->uiState()["harmony"]["origin"]["type"].toString()=="backbone","tap bypassed backbone");
  p->setStateInformation(initial.getData(),(int)initial.getSize());
 }
 // Desktop piano: actual embedded sample decoder and renderer, identical MIDI schedule.
 {
 auto audible=std::make_unique<KhimairaProcessor>(),silent=std::make_unique<KhimairaProcessor>();
 audible->pianoEnabled.store(true);silent->pianoEnabled.store(false);audible->prepareToPlay(48000,256);silent->prepareToPlay(48000,256);
 auto play=new DynamicObject;play->setProperty("play",true);var playRequest(play);audible->transport(playRequest);silent->transport(playRequest);
 double energy=0;float peak=0;
 for(int i=0;i<200;i++){AudioBuffer<float> a(2,256),b(2,256);MidiBuffer ma,mb;audible->processBlock(a,ma);silent->processBlock(b,mb);check(ma.getNumEvents()==mb.getNumEvents(),"piano changed MIDI count");auto other=mb.begin();for(auto event:ma){auto peer=*other++;check(event.samplePosition==peer.samplePosition&&event.numBytes==peer.numBytes&&std::memcmp(event.data,peer.data,(size_t)event.numBytes)==0,"piano changed MIDI timing");}
 for(int ch=0;ch<2;ch++)for(int j=0;j<256;j++){auto v=a.getSample(ch,j);check(std::isfinite(v),"piano NaN");energy+=v*v;peak=std::max(peak,std::abs(v));check(b.getSample(ch,j)==0,"disabled piano emitted audio");}}
 check(energy>1&&peak<1,"piano sample decoding/sound/headroom failed");audible->pianoEnabled.store(false);AudioBuffer<float> a(2,256);MidiBuffer m;audible->processBlock(a,m);check(a.getMagnitude(0,256)==0,"piano mute failed");
 std::cout<<"PASS embedded piano energy "<<energy<<" peak "<<peak<<"; MIDI unchanged; mute silent.\n";
 }
 auto meta=p->metadata();int patterns=0;for(auto row:*meta["patterns"].getArray()){auto id=row["id"].toString();if(id.startsWith("piano")||id.startsWith("texture")||(id.startsWith("pop")&&id.length()>3)){p->command("set",id,"pattern");check(p->snapshot()["notes"].size()>0,"Missing piano notes");patterns++;}}check(patterns==18,"18 patterns");
 if(CHORD_SEIREN){p->command("demo");check(p->snapshot()["melody"].size()>0,"No demo melody");p->command("transpose",1);p->command("transpose",-1);
  for(auto row:*meta["patterns"].getArray()){auto id=row["id"].toString();if(id.startsWith("texture")||id.startsWith("pop")){try{p->command("set",id,"pattern");}catch(const std::exception& e){throw std::runtime_error(id.toStdString()+": "+e.what());}check(p->snapshot()["notes"].size()>0,"Melody-aware pattern empty");}}
  p->command("set",Array<var>{},"melody");}
 p->command("set","| Cmaj7 | Am7 | Dm7 | G7 | Em7 | A7 | Dm7 | G7 |","sourceText");p->command("load");p->command("set","arp","pattern");check(p->arpParameters().swing==0,"ARP inherited swing");check(p->previewNoteCount()==128,"ARP displayed count");
 Clock clock;p->setPlayHead(&clock);p->prepareToPlay(48000,257);std::array<bool,128> held{};int on=0,off=0;double maxError=0;MidiMessageSequence recorded;
 for(int64 frame=0;frame<96*24000;frame+=257){int count=(int)std::min<int64>(257,96*24000-frame);AudioBuffer<float> audio(2,count);MidiBuffer midi;clock.frame=frame;clock.beat=frame/24000.;p->processBlock(audio,midi);for(auto event:midi){auto m=event.getMessage();m.setTimeStamp((frame+event.samplePosition)/24000.*480);recorded.addEvent(m);if(m.isNoteOn()){check(!held[m.getNoteNumber()],"duplicate note-on");held[m.getNoteNumber()]=true;on++;double beat=(frame+event.samplePosition)/24000.;maxError=std::max(maxError,std::abs(beat*4-std::round(beat*4))*120);}else if(m.isNoteOff()){check(held[m.getNoteNumber()],"unmatched note-off");held[m.getNoteNumber()]=false;off++;}}}
 clock.play=false;AudioBuffer<float> audio(2,257);MidiBuffer midi;p->processBlock(audio,midi);for(auto event:midi)if(event.getMessage().isNoteOff())off++;check(on==384&&on==off,"three cycles / note pairing");check(maxError<=1,"16th grid exceeds 1 tick");
 {MidiFile recordedFile;recordedFile.setTicksPerQuarterNote(480);recordedFile.addTrack(recorded);File dest=File::getCurrentWorkingDirectory().getChildFile("processor-arp-three-loops.mid");dest.deleteFile();FileOutputStream out(dest);check(recordedFile.writeTo(out,0),"processor capture export");}
 check(p->parameters.getParameter("arpMode")&&p->getParameters().size()==14,"ARP automation parameters");p->setParameter("arpSwing",16);p->setParameter("arpMode",6);MemoryBlock state;p->getStateInformation(state);auto restored=std::make_unique<KhimairaProcessor>();restored->setStateInformation(state.getData(),(int)state.getSize());check(restored->arpParameters().swing==.16&&restored->arpParameters().mode==6,"automation state recall");
 // Actual 1.2 JSON state, no nativeParameters / arpSwing, selected pattern and chart retained.
 auto legacy=p->snapshot();legacy.getDynamicObject()->removeProperty("nativeParameters");auto* ui=legacy["ui"].getDynamicObject();ui->removeProperty("arpSwing");ui->setProperty("swing",16);ui->setProperty("arpMode","down");ui->setProperty("arpRate","8");ui->setProperty("arpOctaves",3);auto old=JSON::toString(legacy);restored->setStateInformation(old.toRawUTF8(),(int)old.getNumBytesAsUTF8());check(restored->arpParameters().swing==0&&restored->arpParameters().mode==1&&restored->arpParameters().rate==1&&restored->arpParameters().octaves==3,"legacy ARP migration");
 ui->setProperty("swing",12);old=JSON::toString(legacy);restored->setStateInformation(old.toRawUTF8(),(int)old.getNumBytesAsUTF8());check(std::abs(restored->arpParameters().swing-.12)<1e-8,"explicit legacy swing lost");
 p->preset(0);p->command("set",true,"midiPedal");auto file=p->midiFile();check(file.existsAsFile(),"native export");FileInputStream stream(file);MidiFile exported;check(exported.readFrom(stream),"export parse");int cc=0;for(int t=0;t<exported.getNumTracks();t++)for(int i=0;i<exported.getTrack(t)->getNumEvents();i++)if(exported.getTrack(t)->getEventPointer(i)->message.isControllerOfType(64))cc++;check(cc>0,"CC64 not exported");
 auto invalid=p->snapshot();invalid["plan"].getArray()->getReference(0).getDynamicObject()->setProperty("beats",-1);check(!(bool)p->update(invalid)["ok"],"negative chord duration accepted");
 invalid=p->snapshot();invalid["plan"].getArray()->getReference(0)["notes"].getArray()->getReference(0)=-100;check(!(bool)p->update(invalid)["ok"],"out of range chord pitch accepted");
 for(auto pattern:{String("arp"),String("textureTriplet")}){p->command("set",pattern,"pattern");auto editor=std::unique_ptr<AudioProcessorEditor>(p->createEditor());for(auto size:{std::pair<int,int>{1120,820},{900,650},{760,560}}){editor->setSize(size.first,size.second);if(pattern=="arp")for(auto* child:editor->getChildren())if(auto* b=dynamic_cast<TextButton*>(child))if(b->getButtonText()=="Performance")b->onClick();auto image=editor->createComponentSnapshot(editor->getLocalBounds());auto dest=File::getCurrentWorkingDirectory().getChildFile(String(CHORD_SEIREN?"seiren":"khimaira")+"-native-"+pattern+"-"+String(size.first)+".png");dest.deleteFile();FileOutputStream out(dest);check(out.openedOk()&&PNGImageFormat().writeImageToStream(image,out),"snapshot write");}}
 // Native editor controls, 16-bar follow and intentional manual-scroll pause.
 {
 String chart="C:2 Am:2";for(int i=1;i<16;i++)chart+=" | G";p->command("set",chart,"sourceText");p->command("load");
 auto editor=std::unique_ptr<AudioProcessorEditor>(p->createEditor());ScoreViewport* view=nullptr;
 for(auto* child:editor->getChildren())if(auto* candidate=dynamic_cast<ScoreViewport*>(child))view=candidate;
 check(view!=nullptr,"native score viewport missing");auto* score=dynamic_cast<ScoreCanvas*>(view->getViewedComponent());check(score&&score->cells.size()==17,"16-bar/dense score missing");
 auto tick=[&](){static_cast<KhimairaEditor*>(editor.get())->updatePlaybackDisplay();};p->position.store(60.5);p->playing.store(true);tick();check(view->getViewPositionX()>1000,"playhead did not follow to bar 16");
 score->scroll(-100000);check(view->getViewPositionX()==0,"manual score scroll failed");tick();check(view->getViewPositionX()==0,"follow stole manual scroll");
 for(auto* child:editor->getChildren())if(auto* button=dynamic_cast<TextButton*>(child))if(button->getButtonText()=="Resume follow")button->onClick();tick();check(view->getViewPositionX()>1000,"resume follow failed");
 score->selectedBar=0;score->selectedChord=1;score->selected(0,1);check(score->selectedChord==1,"second chord selection failed");
 std::function<TextButton*(Component&,const String&)> findButton=[&](Component& root,const String& label)->TextButton*{if(auto* b=dynamic_cast<TextButton*>(&root))if(b->getButtonText()==label)return b;for(auto* c:root.getChildren())if(auto* b=findButton(*c,label))return b;return nullptr;};
 auto* invert=findButton(*editor,"Invert");check(invert!=nullptr,"native inspector action missing");invert->onClick();check(p->uiState()["bars"][0]["chords"][1]["symbol"].toString()=="Am/C","native inspector edited wrong chord");
 check(p->uiState()["bars"][0]["chords"][0]["symbol"].toString()=="C","native inspector changed neighbour");
 p->position.store(2.5);tick();int active=0;for(auto& c:score->cells)active+=score->beat>=c.beat&&score->beat<c.beat+c.beats;check(active==1,"more than one chord highlighted");
 auto image=editor->createComponentSnapshot(editor->getLocalBounds());File file=File::getCurrentWorkingDirectory().getChildFile("desktop-inspector-playhead.png");file.deleteFile();FileOutputStream out(file);PNGImageFormat().writeImageToStream(image,out);
 std::cout<<"PASS native inspector exact chord edit, 16-bar auto-follow, manual pause, resume and single-chord playhead.\n";
 }
 std::cout<<"PASS "<<patterns<<" native piano patterns; actual processor three 8-bar loops / "<<on<<" notes / max "<<maxError<<" tick; 10 ARP + 2 START + 2 TEMPO automation parameters; legacy migration; pedal export; real JUCE snapshots.\n";
 }catch(const std::exception& e){std::cerr<<e.what()<<"\n";return 1;}}
