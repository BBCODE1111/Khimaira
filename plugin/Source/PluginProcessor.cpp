#include "PluginProcessor.h"
#include "PluginEditor.h"
using namespace juce;
KhimairaProcessor::KhimairaProcessor():AudioProcessor(
#if KHIMAIRA_MIDI_FX
 BusesProperties()
#else
 BusesProperties().withOutput("Output",AudioChannelSet::stereo(),true)
#endif
){
 followHost.store(!JUCEApplicationBase::isStandaloneApp());armed.store(!JUCEApplicationBase::isStandaloneApp());
 // A useful restored-free default, available even before the editor is opened.
 auto object=new DynamicObject;object->setProperty("schema",1);object->setProperty("length",16);
 Array<var> notes;for(int bar=0;bar<4;bar++){int roots[]={48,45,53,55};for(int interval:{0,bar==1?3:4,7}){auto n=new DynamicObject;n->setProperty("beat",bar*4.0);n->setProperty("duration",4.0);n->setProperty("note",roots[bar]+interval);n->setProperty("velocity",.72);notes.add(var(n));}}
 object->setProperty("notes",notes);object->setProperty("ui",var(new DynamicObject));update(var(object));
}
void KhimairaProcessor::prepareToPlay(double sr,int){sampleRateHz=sr;manualBeat=0;restart.fetch_add(1);wasRunning=wasHostMode=wasHostPlaying=false;}
bool KhimairaProcessor::isBusesLayoutSupported(const BusesLayout& l) const{
#if KHIMAIRA_MIDI_FX
 return l.inputBuses.isEmpty() && l.outputBuses.isEmpty();
#else
 return l.getMainOutputChannelSet()==AudioChannelSet::stereo()||l.getMainOutputChannelSet()==AudioChannelSet::mono();
#endif
}
void KhimairaProcessor::processBlock(AudioBuffer<float>& audio,MidiBuffer& midi){
 ScopedNoDenormals noDenormals;
 audio.clear(); // AU MIDI FX has no audio buses; VST3 exposes a silent instrument bus.
 const int samples=audio.getNumSamples();
 if(samples<=0 || sampleRateHz<=0)return;
 double tempo=hostTempo.load(),hostBeat=0;
 bool hostRunning=false,found=false;
 if(auto* ph=getPlayHead())if(auto pos=ph->getPosition()){
  if(auto t=pos->getBpm())if(std::isfinite(*t)&&*t>0)tempo=*t;
  if(auto q=pos->getPpqPosition())if(std::isfinite(*q)){hostBeat=*q;found=true;hostRunning=pos->getIsPlaying();}
 }
 if(isStandalone())tempo=bpm.load();
 hasHost.store(found);hostTempo.store(tempo);
 const bool follow=followHost.load();
 if(follow && hostRunning && !wasHostPlaying)armed.store(true);
 wasHostPlaying=hostRunning;
 const bool hostMode=follow && hostRunning;
 if(hostMode)previewRequested.store(false);
 bool run=armed.load() && (hostMode||previewRequested.load());
 double at=hostMode?hostBeat:manualBeat;
 bool changed=hostMode!=wasHostMode;
 wasHostMode=hostMode;
 const int reset=restart.load();
 if(reset!=lastRestart){lastRestart=reset;manualBeat=0;if(!hostMode)at=0;changed=true;}
 const double bps=tempo/(60*sampleRateHz);
 auto* seq=mailbox.getCurrent();
 if(!seq || !run || !wasRunning || changed){bool swapped=false;seq=mailbox.consume(swapped);changed=changed||swapped;}
 if(!loop.load()&&seq&&at>=seq->length){run=false;previewRequested.store(false);}
 if(run)midi.clear(); // Same channel-1 generator behavior as 0.3.
 int base=0;
 auto emit=[&](int pitch,double velocity,int offset){
  const auto value=(uint8)jlimit(1,127,roundToInt(velocity*127));
  midi.addEvent(velocity>0?MidiMessage::noteOn(1,pitch,value):MidiMessage::noteOff(1,pitch),base+offset);
 };
 // A pending chart becomes active at the next 4/4 bar boundary, even when that
 // boundary falls inside the current host block. No waits, locks or allocations.
 while(base<samples){
  double start=at+base*bps;
  if(mailbox.hasPending() && (std::abs(start/4-std::round(start/4))<bps/4 || !run)){
   bool swapped=false;seq=mailbox.consume(swapped);changed=changed||swapped;
  }
  int count=samples-base;
  if(mailbox.hasPending() && run){
   double boundary=(std::floor(start/4)+1)*4;
   count=std::min(count,std::max(1,(int)std::ceil((boundary-start)/bps-1e-8)));
  }
  scheduler.render(seq,start,bps,count,run,loop.load(),changed,emit);
  changed=false;base+=count;
  // Rounding a boundary to a sample may land just after the exact beat.
  if(base<samples && mailbox.hasPending()){
   bool swapped=false;seq=mailbox.consume(swapped);changed=swapped;
  }
 }
 position.store(seq&&loop.load()?std::fmod(std::max(0.0,at),seq->length):at);playing.store(run);wasRunning=run;
 if(!hostMode&&run)manualBeat=at+samples*bps;
}
var KhimairaProcessor::update(const var& data){
 auto fail=[](String msg){auto d=new DynamicObject;d->setProperty("ok",false);d->setProperty("message",msg);return var(d);};
 if(!data.isObject()||!data["notes"].isArray())return fail("Invalid sequence");
 auto seq=std::make_unique<khimaira::Sequence>();std::vector<khimaira::Note> notes;
 const auto* array=data["notes"].getArray();if(array->size()>khimaira::Sequence::maxNotes)return fail("Too many notes");
 for(const auto& v:*array){double velocity=(double)v["velocity"],pitch=(double)v["note"];if(!v.hasProperty("note")||!v.hasProperty("beat")||!v.hasProperty("duration")||!std::isfinite(pitch)||pitch!=std::floor(pitch)||pitch<0||pitch>127||!std::isfinite(velocity)||velocity<=0||velocity>1)return fail("Invalid velocity");notes.push_back({(double)v["beat"],(double)v["duration"],(int)v["note"],velocity});}
 if(!seq->assign(notes,(double)data["length"]))return fail("Invalid or overlapping notes");
 const ScopedLock lock(stateLock);if(!mailbox.publish(*seq))return fail("Sequence busy; retry");saved=data.clone();
 auto d=new DynamicObject;d->setProperty("ok",true);d->setProperty("count",seq->noteCount);return var(d);
}
void KhimairaProcessor::saveUi(const var& ui){if(!ui.isObject())return;const ScopedLock lock(stateLock);saved.getDynamicObject()->setProperty("ui",ui.clone());}
var KhimairaProcessor::snapshot(){const ScopedLock lock(stateLock);return saved.clone();}
var KhimairaProcessor::status(){auto d=new DynamicObject;d->setProperty("playing",playing.load());d->setProperty("armed",armed.load());d->setProperty("host",followHost.load());d->setProperty("hostAvailable",hasHost.load());d->setProperty("bpm",hostTempo.load());d->setProperty("beat",position.load());d->setProperty("standalone",isStandalone());d->setProperty("preview",previewRequested.load());d->setProperty("pending",mailbox.hasPending());return var(d);}
void KhimairaProcessor::transport(const var& v){
 if(v.hasProperty("host")){followHost.store((bool)v["host"]);previewRequested.store(false);armed.store(true);restart.fetch_add(1);}
 if(v.hasProperty("loop"))loop.store((bool)v["loop"]);
 // Plugin audition always uses the most recently supplied host BPM.
 if(v.hasProperty("bpm")&&isStandalone()){double t=(double)v["bpm"];if(std::isfinite(t))bpm.store(jlimit(30.,300.,t));}
 if(v.hasProperty("play")){bool play=(bool)v["play"];armed.store(play);previewRequested.store(play);if(play)restart.fetch_add(1);}
}
void KhimairaProcessor::getStateInformation(MemoryBlock& dest){auto data=snapshot();data.getDynamicObject()->setProperty("transportHost",followHost.load());data.getDynamicObject()->setProperty("transportLoop",loop.load());data.getDynamicObject()->setProperty("transportBpm",bpm.load());auto s=JSON::toString(data);dest.replaceAll(s.toRawUTF8(),s.getNumBytesAsUTF8());}
void KhimairaProcessor::setStateInformation(const void* data,int bytes){if(bytes<=0||bytes>8*1024*1024)return;auto v=JSON::parse(String::fromUTF8((const char*)data,bytes));if((bool)update(v)["ok"]){if(v.hasProperty("transportHost"))followHost.store((bool)v["transportHost"]);if(v.hasProperty("transportLoop"))loop.store((bool)v["transportLoop"]);if(v.hasProperty("transportBpm")){double t=(double)v["transportBpm"];if(std::isfinite(t))bpm.store(jlimit(30.,300.,t));}armed.store(followHost.load());restart.fetch_add(1);}}
File KhimairaProcessor::midiFile(){
 const auto data=snapshot();MidiMessageSequence track;constexpr int ppq=480;
 std::vector<khimaira::Note> notes;for(const auto& n:*data["notes"].getArray())notes.push_back({(double)n["beat"],(double)n["duration"],(int)n["note"],(double)n["velocity"]});
 auto sequence=std::make_unique<khimaira::Sequence>();if(!sequence->assign(notes,(double)data["length"]))return {};
 for(int i=0;i<sequence->eventCount;i++){auto e=sequence->events[i];auto m=e.on?MidiMessage::noteOn(1,e.pitch,(uint8)jlimit(1,127,roundToInt(e.velocity*127))):MidiMessage::noteOff(1,e.pitch);m.setTimeStamp(std::round(e.beat*ppq));track.addEvent(m);}
 track.sort();auto end=MidiMessage::endOfTrack();end.setTimeStamp((double)data["length"]*ppq);track.addEvent(end);
 MidiFile midi;midi.setTicksPerQuarterNote(ppq);midi.addTrack(track);
 auto dir=File::getSpecialLocation(File::tempDirectory).getChildFile("KHIMAIRA-MIDI");dir.createDirectory();auto file=dir.getChildFile("KHIMAIRA-"+instance+"-"+String(++exportVersion)+".mid");
 FileOutputStream stream(file);if(!stream.openedOk()||!midi.writeTo(stream,0))return {};return file;
}
AudioProcessorEditor* KhimairaProcessor::createEditor(){return new KhimairaEditor(*this);}
AudioProcessor* JUCE_CALLTYPE createPluginFilter(){return new KhimairaProcessor;}
