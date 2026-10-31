#include "PluginProcessor.h"
#include "PluginEditor.h"
#include "BinaryData.h"
using namespace juce;
KhimairaProcessor::KhimairaProcessor():AudioProcessor(
#if KHIMAIRA_MIDI_FX
 BusesProperties()
#else
 BusesProperties().withOutput("Output",AudioChannelSet::stereo(),true)
#endif
),parameters(*this,nullptr,"PARAMETERS",parameterLayout()){
 const char* ids[]={"arpMode","arpRate","arpOctaves","arpAccent","arpPhase","arpFoundation","arpSeed","arpGate","arpSwing","arpHuman"};for(int i=0;i<10;i++)arpValues[i]=parameters.getRawParameterValue(ids[i]);
 syncValue=parameters.getRawParameterValue("tempoSync");tempoValue=parameters.getRawParameterValue("previewTempo");
 startModeValue=parameters.getRawParameterValue("startMode");startBarValue=parameters.getRawParameterValue("startBar");
 followHost.store(!JUCEApplicationBase::isStandaloneApp());armed.store(!JUCEApplicationBase::isStandaloneApp());
 if(JUCEApplicationBase::isStandaloneApp()){setParameter("tempoSync",0);pianoEnabled.store(true);}
 // A useful restored-free default, available even before the editor is opened.
 auto object=new DynamicObject;object->setProperty("schema",1);object->setProperty("length",16);
 Array<var> notes;for(int bar=0;bar<4;bar++){int roots[]={48,45,53,55};for(int interval:{0,bar==1?3:4,7}){auto n=new DynamicObject;n->setProperty("beat",bar*4.0);n->setProperty("duration",4.0);n->setProperty("note",roots[bar]+interval);n->setProperty("velocity",.72);notes.add(var(n));}}
 object->setProperty("notes",notes);object->setProperty("ui",var(new DynamicObject));update(var(object));
 try{engine=std::make_unique<NativeEngine>();command("init");}catch(const std::exception& e){lastError=e.what();}

}
void KhimairaProcessor::loadPiano(){
#if !KHIMAIRA_MIDI_FX
 if(piano.getNumSounds())return;
 AudioFormatManager formats;formats.registerBasicFormats();
 const char* names[]={"C2","Ds2","Fs2","A2","C3","Ds3","Fs3","A3","C4","Ds4","Fs4","A4","C5","Ds5","Fs5","A5","C6"};
 for(int i=0;i<17;i++){
  int size=0;auto* bytes=BinaryData::getNamedResource((String(names[i])+"_mp3").toRawUTF8(),size);
  if(!bytes)continue;auto reader=std::unique_ptr<AudioFormatReader>(formats.createReaderFor(std::make_unique<MemoryInputStream>(bytes,(size_t)size,false)));
  if(!reader)continue;BigInteger range;const int root=36+i*3;range.setRange(i==0?0:root-1,(i==16?128:root+2)-(i==0?0:root-1),true);
  piano.addSound(new SamplerSound(names[i],*reader,range,root,.003,.25,12.0));
 }
 for(int i=0;i<48;i++)piano.addVoice(new SamplerVoice());
#endif
}
void KhimairaProcessor::prepareToPlay(double sr,int){loadPiano();piano.setCurrentPlaybackSampleRate(sr);sampleRateHz=sr;hostTimeline.reset();startPosition.reset();manualBeat=0;restart.fetch_add(1);wasRunning=wasHostMode=wasHostPlaying=false;}
bool KhimairaProcessor::isBusesLayoutSupported(const BusesLayout& l) const{
#if KHIMAIRA_MIDI_FX
 return l.inputBuses.isEmpty() && l.outputBuses.isEmpty();
#else
 return l.getMainOutputChannelSet()==AudioChannelSet::stereo()||l.getMainOutputChannelSet()==AudioChannelSet::mono();
#endif
}
void KhimairaProcessor::processBlock(AudioBuffer<float>& audio,MidiBuffer& midi){
 ScopedNoDenormals noDenormals;
 audio.clear(); // MIDI generation stays sample-clock driven; optional native piano renders below.
 const int samples=audio.getNumSamples();
 if(samples<=0 || sampleRateHz<=0)return;
 double tempo=hostTempo.load(),hostBeat=0;
 bool hostRunning=false,found=false,tempoFound=false;int numerator=4,denominator=4;std::optional<int64_t> hostSample;
 if(auto* ph=getPlayHead())if(auto pos=ph->getPosition()){
  if(auto t=pos->getTimeInSamples())hostSample=*t;
  hostRunning=pos->getIsPlaying();
  if(auto meter=pos->getTimeSignature()){numerator=meter->numerator;denominator=meter->denominator;}
  if(auto t=pos->getBpm())if(std::isfinite(*t)&&*t>0){tempo=*t;tempoFound=true;}
  if(auto q=pos->getPpqPosition())if(std::isfinite(*q)){hostBeat=*q;found=true;}
 }
 hasHost.store(found);hostPlaying.store(hostRunning);hostTempoAvailable.store(tempoFound);
 hostNumerator.store(numerator);hostDenominator.store(denominator);unsupportedMeter.store(numerator!=4||denominator!=4);
 if(tempoFound)hostTempo.store(tempo);
 bpm.store(userTempo());
 if(hostRunning&&!wasHostPlaying)armed.store(true);
 wasHostPlaying=hostRunning;
 // MIDI output always uses the DAW clock while the host plays, regardless of SYNC.
 const bool hostMode=hostRunning&&found;
 if(hostRunning)previewRequested.store(false);
 const bool hostClockReady=hostMode&&tempoFound&&!unsupportedMeter.load();
 bool run=hostRunning?(armed.load()&&hostClockReady):(armed.load()&&previewRequested.load());
 if(!hostRunning)tempo=syncTempo()?hostTempo.load():userTempo();
 const double bps=tempo/(60*sampleRateHz);
 const double stableBeat=hostTimeline.resolve(hostBeat,hostSample,bps,samples,hostClockReady);
 const auto mapped=startPosition.resolve(stableBeat,hostSample,bps,samples,hostClockReady,(int)startModeValue->load(),(int)startBarValue->load());
 if(hostMode)startOrigin.store(mapped.origin);
 double at=hostMode?mapped.beat:manualBeat;
 bool changed=hostMode!=wasHostMode||mapped.changed;
 waitingForStart.store(hostClockReady&&at<0);
 wasHostMode=hostMode;
 const int reset=restart.load();
 if(reset!=lastRestart){lastRestart=reset;manualBeat=0;if(!hostMode)at=0;changed=true;}
 auto* seq=mailbox.getCurrent();
 if(!seq || !run || !wasRunning || changed){bool swapped=false;seq=mailbox.consume(swapped);changed=changed||swapped;}
 if(!loop.load()&&seq&&at>=seq->length){run=false;previewRequested.store(false);}
 if(run)midi.clear(); // Same channel-1 generator behavior as 0.3.
 int base=0;
 auto emit=[&](int pitch,double velocity,int offset){
  const auto value=(uint8)jlimit(1,127,roundToInt(velocity*127));
  midi.addEvent(velocity>0?MidiMessage::noteOn(1,pitch,value):MidiMessage::noteOff(1,pitch),base+offset);
 };
 const bool useArp=arpEnabled.load();
 if(useArp!=wasArp){scheduler.flush(emit);liveArp.flush(emit);changed=true;wasArp=useArp;}
 if(useArp){bool swapped=false;seq=mailbox.consume(swapped);changed=changed||swapped;liveArp.render(seq?&seq->arpPlan:nullptr,arpParameters(),at,bps,samples,run,loop.load(),changed,emit);}
 // A pending chart becomes active at the next 4/4 bar boundary, even when that
 // boundary falls inside the current host block. No waits, locks or allocations.
 while(!useArp&&base<samples){
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
 position.store(seq&&loop.load()?std::fmod(std::max(0.0,at),seq->length):at);playing.store(run&&at+samples*bps>0);wasRunning=run;
 if(!hostMode&&run)manualBeat=at+samples*bps;
#if !KHIMAIRA_MIDI_FX
 const bool audible=pianoEnabled.load();
 if(audible!=pianoWasEnabled){piano.allNotesOff(0,false);pianoWasEnabled=audible;}
 if(audible){piano.renderNextBlock(audio,midi,0,samples);audio.applyGain(pianoVolume.load()*.24f);}
#endif
}
var KhimairaProcessor::update(const var& data){
 auto fail=[](String msg){auto d=new DynamicObject;d->setProperty("ok",false);d->setProperty("message",msg);return var(d);};
 if(!data.isObject()||!data["notes"].isArray())return fail("Invalid sequence");
 auto seq=std::make_unique<khimaira::Sequence>();std::vector<khimaira::Note> notes;
 const auto* array=data["notes"].getArray();if(array->size()>khimaira::Sequence::maxNotes)return fail("Too many notes");
 for(const auto& v:*array){double velocity=(double)v["velocity"],pitch=(double)v["note"];if(!v.hasProperty("note")||!v.hasProperty("beat")||!v.hasProperty("duration")||!std::isfinite(pitch)||pitch!=std::floor(pitch)||pitch<0||pitch>127||!std::isfinite(velocity)||velocity<=0||velocity>1)return fail("Invalid velocity");notes.push_back({(double)v["beat"],(double)v["duration"],(int)v["note"],velocity});}
 if(!seq->assign(notes,(double)data["length"]))return fail("Invalid or overlapping notes");
 if(auto* plan=data["plan"].getArray()){
  if(plan->size()>256)return fail("Too many chord segments");seq->arpPlan.length=seq->length;double previousEnd=0;
  for(auto& v:*plan){auto& s=seq->arpPlan.segments[seq->arpPlan.count++];s.beat=(double)v["beat"];s.beats=(double)v["beats"];
   if(!std::isfinite(s.beat)||!std::isfinite(s.beats)||s.beat<previousEnd-1e-7||s.beats<=0||s.beat+s.beats>seq->length+1e-7)return fail("Invalid chord timing");previousEnd=s.beat+s.beats;
   if(auto* pitches=v["notes"].getArray()){if(pitches->size()>16)return fail("Too many chord voices");for(auto n:*pitches){double pitch=(double)n;if(!std::isfinite(pitch)||pitch!=std::floor(pitch)||pitch<0||pitch>127)return fail("Invalid chord pitch");s.notes[s.count++]=(int)pitch;}}
  }
 }
 if(auto* melody=data["melody"].getArray()){
  if(melody->size()>2048)return fail("Melody exceeds 2048 notes");
  for(auto& n:*melody){double start=(double)n["start"],end=(double)n["end"],pitch=(double)n["pitch"];
   if(!std::isfinite(start)||!std::isfinite(end)||!std::isfinite(pitch)||start<0||end<=start||pitch!=std::floor(pitch)||pitch<0||pitch>127)return fail("Invalid melody note");
   seq->arpPlan.melody[seq->arpPlan.melodyCount++]={start,end,(int)pitch};
  }
 }

 seq->arpPlan.protect=CHORD_SEIREN && seq->arpPlan.melodyCount>0;
 const ScopedLock lock(stateLock);if(!mailbox.publish(*seq))return fail("Sequence busy; retry");saved=data.clone();previewPlan=seq->arpPlan;sequenceRevision.fetch_add(1);arpEnabled.store(data["ui"]["pattern"].toString()=="arp");
 auto d=new DynamicObject;d->setProperty("ok",true);d->setProperty("count",seq->noteCount);return var(d);
}
// Editor-only count. Never called by the audio callback. Recomputed only when
// the chart or effective ARP parameters change; includes melody filtering.
int KhimairaProcessor::previewNoteCount(){
 if(!arpEnabled.load()){const ScopedLock lock(stateLock);return saved["notes"].size();}
 const auto params=arpParameters();const int revision=sequenceRevision.load();if(revision==countRevision&&params==countParameters)return cachedCount;
 khimaira::ArpPlan plan;{const ScopedLock lock(stateLock);plan=previewPlan;}
 std::vector<std::pair<int,int>> attacks;int foundationSegment=-1;
 auto append=[&](khimaira::ArpNote n,bool bass=false){int pitch=n.pitch;if(plan.protect){while(!bass&&pitch<52)pitch+=12;if(!khimaira::safeArpNote(plan,pitch,n.beat,n.beat+n.duration))return;}if(pitch>=0&&pitch<=108)attacks.emplace_back((int)std::round(n.beat*480),pitch);};
 khimaira::ArpCursor cursor;cursor.reset(params);
 while(cursor.nextBeat(params)<plan.length-1e-8){double beat=cursor.nextBeat(params);
  for(int i=0;i<plan.count;i++){auto& seg=plan.segments[i];if(beat>=seg.beat-1e-8&&beat<seg.beat+seg.beats-1e-8){if(foundationSegment!=i&&params.foundation){foundationSegment=i;for(int j=0;j<(params.foundation==2?seg.count:std::min(seg.count,1));j++)append({beat,seg.beat+seg.beats-beat,seg.notes[j],.6},j==0);}break;}}
  if(!cursor.next(plan,params,[&](khimaira::ArpNote n){append(n);}))break;
 }
 std::sort(attacks.begin(),attacks.end());cachedCount=(int)std::distance(attacks.begin(),std::unique(attacks.begin(),attacks.end()));countRevision=revision;countParameters=params;return cachedCount;
}
void KhimairaProcessor::saveUi(const var& ui){if(!ui.isObject())return;const ScopedLock lock(stateLock);saved.getDynamicObject()->setProperty("ui",ui.clone());}
var KhimairaProcessor::snapshot(){const ScopedLock lock(stateLock);return saved.clone();}
var KhimairaProcessor::status(){auto d=new DynamicObject;d->setProperty("playing",playing.load());d->setProperty("armed",armed.load());d->setProperty("host",followHost.load());d->setProperty("hostAvailable",hasHost.load());d->setProperty("bpm",hostTempo.load());d->setProperty("beat",position.load());d->setProperty("standalone",isStandalone());d->setProperty("preview",previewRequested.load());d->setProperty("pending",mailbox.hasPending());return var(d);}
void KhimairaProcessor::transport(const var& v){
 if(v.hasProperty("host")){followHost.store(true);previewRequested.store(false);armed.store(true);restart.fetch_add(1);}
 if(v.hasProperty("loop"))loop.store((bool)v["loop"]);
 if(v.hasProperty("bpm")&&!syncTempo()){double t=(double)v["bpm"];if(std::isfinite(t)){setParameter("previewTempo",(float)jlimit(30.,300.,t));bpm.store(userTempo());}}
 if(v.hasProperty("play")&&!hostPlaying.load()){bool play=(bool)v["play"];armed.store(true);previewRequested.store(play);if(play)restart.fetch_add(1);}

}
void KhimairaProcessor::getStateInformation(MemoryBlock& dest){auto data=snapshot();data.getDynamicObject()->setProperty("pianoEnabled",pianoEnabled.load());data.getDynamicObject()->setProperty("pianoVolume",pianoVolume.load());data.getDynamicObject()->setProperty("nativeParameters",parameters.copyState().createXml()->toString());data.getDynamicObject()->setProperty("transportHost",followHost.load());data.getDynamicObject()->setProperty("transportLoop",loop.load());data.getDynamicObject()->setProperty("transportBpm",userTempo());auto s=JSON::toString(data);dest.replaceAll(s.toRawUTF8(),s.getNumBytesAsUTF8());}
void KhimairaProcessor::setStateInformation(const void* data,int bytes){
 if(bytes<=0||bytes>8*1024*1024)return;auto v=JSON::parse(String::fromUTF8((const char*)data,bytes));
 if(!(bool)update(v)["ok"])return;
 if(v.hasProperty("pianoEnabled"))pianoEnabled.store((bool)v["pianoEnabled"]);
 if(v.hasProperty("pianoVolume")){double volume=(double)v["pianoVolume"];if(std::isfinite(volume))pianoVolume.store((float)jlimit(0.,1.,volume));}
 followHost.store(true);if(v.hasProperty("transportLoop"))loop.store((bool)v["transportLoop"]);
 const double oldTempo=v.hasProperty("transportBpm")?jlimit(30.,300.,(double)v["transportBpm"]):120.;
 if(auto xml=parseXML(v["nativeParameters"].toString())){
  auto incoming=ValueTree::fromXml(*xml),merged=parameters.copyState();
  for(int i=0;i<merged.getNumChildren();i++){auto child=merged.getChild(i);const auto id=child["id"].toString();auto old=incoming.getChildWithProperty("id",id);if(old.isValid())child.setProperty("value",old["value"],nullptr);else if(id=="previewTempo")child.setProperty("value",oldTempo,nullptr);else if(auto* parameter=parameters.getParameter(id))child.setProperty("value",parameter->convertFrom0to1(parameter->getDefaultValue()),nullptr);}
  parameters.replaceState(merged);
 }
 else {setParameter("tempoSync",1);setParameter("previewTempo",(float)oldTempo);setParameter("startMode",0);setParameter("startBar",1);auto ui=v["ui"];
 auto choice=[&](const char* id,StringArray values){auto i=values.indexOf(ui[id].toString());if(i>=0)setParameter(id,(float)i);};
 choice("arpMode",{"up","down","upDown","inclusive","outsideIn","insideOut","random","walk","pedal","poly","mixed"});choice("arpRate",{"4","8","8T","16","24","32"});choice("arpAccent",{"none","beat","offbeat"});choice("arpPhase",{"flow","chord"});choice("arpFoundation",{"off","bass","pad"});
 if(ui.hasProperty("arpOctaves"))setParameter("arpOctaves",(float)ui["arpOctaves"]-1);if(ui.hasProperty("arpSeed"))setParameter("arpSeed",(float)ui["arpSeed"]);if(ui.hasProperty("gate"))setParameter("arpGate",(float)ui["gate"]);
 const auto swing=(double)ui["swing"];setParameter("arpSwing",ui.hasProperty("arpSwing")?(float)ui["arpSwing"]:ui["pattern"].toString()=="arp"&&swing!=8&&swing!=16?(float)swing:0);setParameter("arpHuman",0);}
 if(v["ui"].hasProperty("bars")&&engine)try{command("restore");}catch(const std::exception& e){lastError=e.what();}
 bpm.store(userTempo());armed.store(true);previewRequested.store(false);restart.fetch_add(1);
}
File KhimairaProcessor::midiFile(){
 const auto data=snapshot();MidiMessageSequence track;constexpr int ppq=khimaira::Sequence::ticksPerQuarter;
 if(arpEnabled.load()){
  auto plan=std::make_unique<khimaira::ArpPlan>();plan->length=(double)data["length"];
  if(auto* list=data["plan"].getArray())for(auto v:*list){auto& s=plan->segments[plan->count++];s.beat=(double)v["beat"];s.beats=(double)v["beats"];for(auto n:*v["notes"].getArray())s.notes[s.count++]=(int)n;}
  if(auto* melody=data["melody"].getArray())for(auto n:*melody)plan->melody[plan->melodyCount++]={(double)n["start"],(double)n["end"],(int)n["pitch"]};plan->protect=CHORD_SEIREN&&plan->melodyCount>0;
  khimaira::LiveArpeggiator player;auto params=arpParameters();const int total=(int)std::llround(plan->length*24000);
  for(int at=0;at<total;at+=256){player.render(plan.get(),params,at/24000.,1./24000.,std::min(256,total-at),true,false,false,[&](int pitch,double velocity,int offset){auto m=velocity>0?MidiMessage::noteOn(1,pitch,(uint8)jlimit(1,127,roundToInt(velocity*127))):MidiMessage::noteOff(1,pitch);m.setTimeStamp(std::round((at+offset)/50.));track.addEvent(m);});}
  player.flush([&](int pitch,double,int){auto m=MidiMessage::noteOff(1,pitch);m.setTimeStamp(plan->length*ppq);track.addEvent(m);});
 }else{
  std::vector<khimaira::Note> notes;for(const auto& n:*data["notes"].getArray())notes.push_back({(double)n["beat"],(double)n["duration"],(int)n["note"],(double)n["velocity"]});
  auto sequence=std::make_unique<khimaira::Sequence>();if(!sequence->assign(notes,(double)data["length"]))return {};
  for(int i=0;i<sequence->eventCount;i++){auto e=sequence->events[i];auto m=e.on?MidiMessage::noteOn(1,e.pitch,(uint8)jlimit(1,127,roundToInt(e.velocity*127))):MidiMessage::noteOff(1,e.pitch);m.setTimeStamp(std::round(e.beat*ppq));track.addEvent(m);}
 }
 if(auto* pedal=data["pedal"].getArray())for(auto e:*pedal){auto m=MidiMessage::controllerEvent(1,64,(int)e["bytes"][2]);m.setTimeStamp((double)e["tick"]);track.addEvent(m);}
 if(!syncTempo()){auto tempo=MidiMessage::tempoMetaEvent((int)std::llround(60000000./userTempo()));tempo.setTimeStamp(0);track.addEvent(tempo);}
 track.sort();auto end=MidiMessage::endOfTrack();end.setTimeStamp((double)data["length"]*ppq);track.addEvent(end);MidiFile midi;midi.setTicksPerQuarterNote(ppq);midi.addTrack(track);
 auto dir=File::getSpecialLocation(File::tempDirectory).getChildFile(CHORD_SEIREN?"SEIREN-MIDI":"KHIMAIRA-MIDI");dir.createDirectory();auto file=dir.getChildFile(String(CHORD_SEIREN?"SEIREN-":"KHIMAIRA-")+instance+"-"+String(++exportVersion)+".mid");FileOutputStream stream(file);if(!stream.openedOk()||!midi.writeTo(stream,0))return {};return file;
}
AudioProcessorEditor* KhimairaProcessor::createEditor(){return new KhimairaEditor(*this);}
AudioProcessor* JUCE_CALLTYPE createPluginFilter(){return new KhimairaProcessor;}
juce::AudioProcessorValueTreeState::ParameterLayout KhimairaProcessor::parameterLayout(){
 AudioProcessorValueTreeState::ParameterLayout l;
 auto choice=[&](const char* id,const char* name,StringArray values,int def){l.add(std::make_unique<AudioParameterChoice>(ParameterID(id,1),name,values,def));};
 choice("arpMode","ARP Mode",{"UP","DOWN","UP/DN","INCL","OUT-IN","IN-OUT","RANDOM","WALK","PEDAL","POLY","MIXED"},2);
 choice("arpRate","ARP Rate",{"1/4","1/8","1/8T","1/16","1/16T","1/32"},3);
 choice("arpOctaves","ARP Octaves",{"1","2","3","4"},1);choice("arpAccent","ARP Accent",{"EVEN","BEAT","OFFBEAT"},1);
 choice("arpPhase","ARP Phase",{"FLOW","RESTART"},0);choice("arpFoundation","ARP Foundation",{"OFF","BASS","PAD"},0);
 l.add(std::make_unique<AudioParameterInt>(ParameterID("arpSeed",1),"ARP Variation Seed",0,65535,1));
 l.add(std::make_unique<AudioParameterFloat>(ParameterID("arpGate",1),"ARP Gate",NormalisableRange<float>(10,100,1),82));
 l.add(std::make_unique<AudioParameterFloat>(ParameterID("arpSwing",1),"ARP Swing",NormalisableRange<float>(0,32,1),0));
 l.add(std::make_unique<AudioParameterFloat>(ParameterID("arpHuman",1),"ARP Humanize",NormalisableRange<float>(0,100,1),0));
 l.add(std::make_unique<AudioParameterChoice>(ParameterID("startMode",2),"Start Position",StringArray{"FROM PLAY","LOCK TO BAR"},0));
 l.add(std::make_unique<AudioParameterInt>(ParameterID("startBar",2),"Start Anchor Bar",1,9999,1));
 l.add(std::make_unique<AudioParameterBool>(ParameterID("tempoSync",2),"Tempo Sync",true));
 l.add(std::make_unique<AudioParameterFloat>(ParameterID("previewTempo",2),"Preview Export Tempo",NormalisableRange<float>(30,300,1),120));return l;
}
khimaira::ArpParameters KhimairaProcessor::arpParameters() const {khimaira::ArpParameters p;p.mode=(int)arpValues[0]->load();p.rate=(int)arpValues[1]->load();p.octaves=1+(int)arpValues[2]->load();p.accent=(int)arpValues[3]->load();p.phase=(int)arpValues[4]->load();p.foundation=(int)arpValues[5]->load();p.seed=(uint32_t)arpValues[6]->load();p.gate=arpValues[7]->load()/100.;p.swing=arpValues[8]->load()/100.;p.human=arpValues[9]->load()/100.;return p;}
void KhimairaProcessor::setParameter(const String& id,float value){if(auto* p=parameters.getParameter(id)){p->beginChangeGesture();p->setValueNotifyingHost(p->convertTo0to1(value));p->endChangeGesture();}}
void KhimairaProcessor::preset(int n){setParameter("arpMode",n==0?2:n==1?0:9);setParameter("arpRate",n==2?1:3);setParameter("arpOctaves",n==0?1:n==1?2:0);setParameter("arpPhase",n==0?0:1);setParameter("arpAccent",n==2?2:1);setParameter("arpGate",n==0?82:n==1?58:45);setParameter("arpSwing",0);setParameter("arpHuman",0);}
var KhimairaProcessor::uiState(){auto ui=snapshot()["ui"].clone();if(!ui.isObject())ui=var(new DynamicObject);const auto p=arpParameters();const char* modes[]={"up","down","upDown","inclusive","outsideIn","insideOut","random","walk","pedal","poly","mixed"};const char* rates[]={"4","8","8T","16","24","32"};auto* d=ui.getDynamicObject();d->setProperty("arpMode",modes[p.mode]);d->setProperty("arpRate",rates[p.rate]);d->setProperty("arpOctaves",p.octaves);d->setProperty("arpAccent",p.accent==0?"none":p.accent==1?"beat":"offbeat");d->setProperty("arpPhase",p.phase==0?"flow":"chord");d->setProperty("arpFoundation",p.foundation==0?"off":p.foundation==1?"bass":"pad");d->setProperty("arpSeed",(int)p.seed);d->setProperty("arpSwing",p.swing*100);d->setProperty("arpHuman",p.human*100);d->setProperty("arpGate",p.gate*100);return ui;}
var KhimairaProcessor::metadata(){auto r=new DynamicObject;r->setProperty("action","metadata");return engine->call(var(r));}
var KhimairaProcessor::command(const String& action,const var& value,const String& key){
 if(!engine)return {};auto r=new DynamicObject;r->setProperty("action",action);r->setProperty("state",action=="init"?var(new DynamicObject):uiState());r->setProperty("value",value);r->setProperty("key",key);auto result=engine->call(var(r));if(action=="examples")return result;
 auto applied=update(result);if(!(bool)applied["ok"])throw std::runtime_error(applied["message"].toString().toStdString());if(key=="pattern"&&value.toString()=="arp")setParameter("arpSwing",0);return result;
}
