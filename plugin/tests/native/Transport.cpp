#include "../../Source/PluginProcessor.h"
#include <iostream>
#include <stdexcept>
using namespace juce;
void check(bool value,const char* message){if(!value)throw std::runtime_error(message);}
struct Clock:AudioPlayHead {
 double beat=0,tempo=120;int64 frame=0;bool play=true;int numerator=4,denominator=4;bool bpmValid=true,ppqValid=true;
 Optional<PositionInfo> getPosition()const override{PositionInfo p;if(bpmValid)p.setBpm(tempo);if(ppqValid)p.setPpqPosition(beat);p.setTimeInSamples(frame);p.setIsPlaying(play);p.setTimeSignature(TimeSignature{numerator,denominator});return p;}
};
struct Event{double tick;int pitch;bool on;};
void sequence(KhimairaProcessor& p,bool arp){
 auto d=new DynamicObject;d->setProperty("length",16);Array<var> notes,plan;
 for(int i=0;i<4;i++){auto n=new DynamicObject;n->setProperty("beat",i*4.);n->setProperty("duration",4.);n->setProperty("note",60+i);n->setProperty("velocity",.7);notes.add(var(n));auto s=new DynamicObject;s->setProperty("beat",i*4.);s->setProperty("beats",4.);s->setProperty("notes",Array<var>{48+i,60+i});plan.add(var(s));}
 auto ui=new DynamicObject;ui->setProperty("pattern",arp?"arp":"sustain");d->setProperty("ui",var(ui));d->setProperty("notes",notes);d->setProperty("plan",plan);check((bool)p.update(var(d))["ok"],"fixture sequence");p.setParameter("arpOctaves",0);p.setParameter("arpHuman",0);p.setParameter("arpSwing",0);
}
std::vector<std::pair<int64,int>> clockRun(KhimairaProcessor& p,Clock& clock,double sr,int block,bool ramp,bool offline,double& error){
 clock.play=false;auto stopped=new DynamicObject;stopped->setProperty("play",false);var stopRequest(stopped);p.transport(stopRequest);AudioBuffer<float> stopAudio(2,block);MidiBuffer stopMidi;p.processBlock(stopAudio,stopMidi);p.transport(stopRequest);p.processBlock(stopAudio,stopMidi);
 sequence(p,true);p.setParameter("startMode",0);p.setParameter("tempoSync",0);p.setParameter("previewTempo",73);p.setNonRealtime(offline);p.prepareToPlay(sr,block);clock.play=true;clock.numerator=4;clock.denominator=4;clock.bpmValid=clock.ppqValid=true;
 std::vector<std::pair<int64,int>> events;std::array<bool,128> held{};int onset=0;const int64 total=(int64)(sr*12);
 auto beatAt=[&](double t){return ramp?100*t/60+30*t*t/(24*60):t<6?100*t/60:10+(t-6)*130/60;};
 for(int64 frame=0;frame<total;){int n=(int)std::min<int64>(block,total-frame);if(frame<sr*6)n=(int)std::min<int64>(n,(int64)(sr*6)-frame);double t=frame/sr;clock.beat=beatAt(t);clock.frame=frame;clock.tempo=ramp?100+30*t/12:t<6?100:130;AudioBuffer<float> a(2,n);MidiBuffer m;p.processBlock(a,m);
  for(auto e:m){auto message=e.getMessage();int pitch=message.getNoteNumber();if(message.isNoteOn()){check(!held[pitch],"tempo duplicate");held[pitch]=true;error=std::max(error,std::abs(beatAt((frame+e.samplePosition)/sr)-onset*.25)*480);check(pitch==60+(onset/16)%4,"tempo phase changed");onset++;events.emplace_back(frame+e.samplePosition,pitch);}else if(message.isNoteOff()){check(held[pitch],"tempo orphan");held[pitch]=false;}}
  frame+=n;
 }
 clock.play=false;AudioBuffer<float> a(2,block);MidiBuffer m;p.processBlock(a,m);for(auto e:m)if(e.getMessage().isNoteOff())held[e.getMessage().getNoteNumber()]=false;for(bool h:held)check(!h,"tempo stop left note");check(p.hostTempo.load()>129,"host tempo display stale");return events;
}
int main(){ScopedJuceInitialiser_GUI init;try{
 auto p=std::make_unique<KhimairaProcessor>();Clock clock;p->setPlayHead(&clock);double maxError=0;int cases=0;
 for(bool arp:{false,true})for(double sr:{44100.,48000.,96000.})for(int block:{32,64,256,1024})for(double start:{0.,16.,312.,318.,-2.}){
  sequence(*p,arp);p->setParameter("startMode",0);p->prepareToPlay(sr,block);clock.play=true;
  const double spb=sr/2,anchor=std::ceil(std::max(0.,start)/4.)*4,delay=anchor-start;int attacks=0;std::array<bool,128> held{};
  const int64 total=std::llround((delay+16)*spb);
  for(int64 frame=0;frame<total;frame+=block){int n=(int)std::min<int64>(block,total-frame);clock.frame=std::llround(start*spb)+frame;clock.beat=start+frame/spb;AudioBuffer<float> audio(2,n);MidiBuffer midi;p->processBlock(audio,midi);
   for(auto e:midi){auto m=e.getMessage();const int pitch=m.getNoteNumber();if(m.isNoteOn()){check(!held[pitch],"duplicate attack");held[pitch]=true;double beat=(frame+e.samplePosition)/spb-delay;check(beat>=-1./480,"count-in / wait emitted early");const double expected=attacks*(arp?.25:4.);maxError=std::max(maxError,std::abs(beat-expected)*480);check(pitch==60+int(expected/4)%4,"FROM PLAY wrong first chord / phase");attacks++;}else if(m.isNoteOff()){check(held[pitch],"orphan release");held[pitch]=false;}}
  }
  clock.play=false;AudioBuffer<float> audio(2,block);MidiBuffer midi;p->processBlock(audio,midi);for(auto e:midi)if(e.getMessage().isNoteOff())held[e.getMessage().getNoteNumber()]=false;for(bool h:held)check(!h,"stop left held note");check(attacks==(arp?64:4),"start count");cases++;
 }
 for(bool arp:{false,true}){
  sequence(*p,arp);p->setParameter("startMode",1);p->setParameter("startBar",1);p->prepareToPlay(48000,256);clock={};clock.play=true;clock.beat=312;clock.frame=312*24000;AudioBuffer<float> audio(2,256);MidiBuffer midi;p->processBlock(audio,midi);bool found=false;for(auto e:midi)if(e.getMessage().isNoteOn()){check(e.getMessage().getNoteNumber()==62,"LOCK TO BAR 1 at bar 79 must be chord 3");found=true;}check(found,"LOCK no notes");clock.play=false;MidiBuffer stopped;p->processBlock(audio,stopped);clock.play=true;
  // Repeated host Cycle is a discontinuity even when a host uses a monotonic sample counter.
  p->setParameter("startMode",0);p->prepareToPlay(48000,257);int ons=0;std::array<bool,128> held{};
  for(int cycle=0;cycle<3;cycle++)for(int frame=0;frame<16*24000;frame+=257){int n=std::min(257,16*24000-frame);clock.frame=cycle*16*24000+frame;clock.beat=312+frame/24000.;AudioBuffer<float> a(2,n);MidiBuffer m;p->processBlock(a,m);for(auto e:m){auto message=e.getMessage();int pitch=message.getNoteNumber();if(message.isNoteOn()){check(!held[pitch],"cycle duplicate");held[pitch]=true;check(pitch==60+int((frame+e.samplePosition)/24000.)/4,"cycle first chord");ons++;}else if(message.isNoteOff()){check(held[pitch],"cycle orphan");held[pitch]=false;}}}
  check(ons==(arp?192:12),"three host cycle count");
  // A forward seek flushes and waits for the next bar; a restart always resets origin.
  clock.frame=400*24000;clock.beat=402;MidiBuffer jumped;p->processBlock(audio,jumped);for(auto e:jumped)check(!e.getMessage().isNoteOn(),"seek before next bar must wait");check(p->waitingForStart.load(),"seek waiting status");
 }
 p->setParameter("startMode",1);p->setParameter("startBar",79);MemoryBlock state;p->getStateInformation(state);auto recalled=std::make_unique<KhimairaProcessor>();recalled->setStateInformation(state.getData(),(int)state.getSize());check(*recalled->parameters.getRawParameterValue("startMode")==1&&*recalled->parameters.getRawParameterValue("startBar")==79,"START recall");
 auto old=JSON::parse(String::fromUTF8((const char*)state.getData(),(int)state.getSize()));auto xml=parseXML(old["nativeParameters"].toString());auto tree=ValueTree::fromXml(*xml);for(auto id:{"startMode","startBar"})tree.removeChild(tree.getChildWithProperty("id",id),nullptr);old.getDynamicObject()->setProperty("nativeParameters",tree.createXml()->toString());auto json=JSON::toString(old);recalled->setStateInformation(json.toRawUTF8(),json.getNumBytesAsUTF8());check(*recalled->parameters.getRawParameterValue("startMode")==0&&*recalled->parameters.getRawParameterValue("startBar")==1,"old state defaults");
 // Preview always begins at chart beat zero, including after a host stop and a locked anchor.
 clock.play=false;AudioBuffer<float> stoppedAudio(2,256);MidiBuffer stoppedMidi;p->processBlock(stoppedAudio,stoppedMidi);p->prepareToPlay(48000,256);auto v=new DynamicObject;v->setProperty("play",true);p->transport(var(v));AudioBuffer<float> audio(2,256);MidiBuffer midi;p->processBlock(audio,midi);bool preview=false;for(auto e:midi)if(e.getMessage().isNoteOn()){check(e.getMessage().getNoteNumber()==60,"preview origin");preview=true;}check(preview,"preview silent");
 // SYNC never detaches host playback. Ramp/step clocks use an independent analytic PPQ oracle.
 double clockError=0;int clockCases=0;
 for(double sr:{44100.,48000.,96000.})for(int block:{32,64,256,1024})for(bool ramp:{false,true}){
  const auto realtime=clockRun(*p,clock,sr,block,ramp,false,clockError),offline=clockRun(*p,clock,sr,block,ramp,true,clockError);check(realtime==offline,"offline output differs");clockCases+=2;
 }
 check(clockError<=1,"ramp/step clock exceeds one tick");
 sequence(*p,false);p->prepareToPlay(48000,256);clock.play=false;clock.tempo=150;clock.frame=0;clock.beat=0;clock.numerator=4;p->processBlock(audio,midi);
 for(bool sync:{true,false}){
  p->setParameter("tempoSync",sync?1:0);p->setParameter("previewTempo",60);p->prepareToPlay(48000,256);auto request=new DynamicObject;request->setProperty("play",true);p->transport(var(request));int64 second=-1;
  for(int64 frame=0;frame<200000;frame+=256){MidiBuffer notes;p->processBlock(audio,notes);for(auto e:notes)if(e.getMessage().isNoteOn()&&e.getMessage().getNoteNumber()==61&&second<0)second=frame+e.samplePosition;}
  check(second==(sync?76800:192000),"preview tempo ignores SYNC");auto stop=new DynamicObject;stop->setProperty("play",false);p->transport(var(stop));midi.clear();p->processBlock(audio,midi);
  p->setParameter("previewTempo",137);auto file=p->midiFile();FileInputStream input(file);MidiFile smf;check(smf.readFrom(input),"tempo export parse");int tempos=0;for(int t=0;t<smf.getNumTracks();t++)for(int i=0;i<smf.getTrack(t)->getNumEvents();i++){auto message=smf.getTrack(t)->getEventPointer(i)->message;if(message.isTempoMetaEvent()){tempos++;check(std::abs(message.getTempoSecondsPerQuarterNote()-60./137)<.000001,"manual export BPM");}}check(tempos==(sync?0:1),"SYNC MIDI tempo policy");
 }
 // Unsupported meters and missing host clock data flush/mute, instead of drifting.
 p->prepareToPlay(48000,256);clock.play=true;clock.beat=0;clock.frame=0;clock.numerator=3;midi.clear();p->processBlock(audio,midi);for(auto e:midi)check(!e.getMessage().isNoteOn(),"3/4 must explicitly mute");check(p->unsupportedMeter.load(),"meter notice");
 clock.numerator=4;clock.bpmValid=false;midi.clear();p->processBlock(audio,midi);for(auto e:midi)check(!e.getMessage().isNoteOn(),"missing BPM must mute");clock.bpmValid=true;clock.ppqValid=false;midi.clear();p->processBlock(audio,midi);for(auto e:midi)check(!e.getMessage().isNoteOn(),"missing PPQ must mute");clock.ppqValid=true;
 p->setParameter("tempoSync",0);p->setParameter("previewTempo",137);MemoryBlock tempoState;p->getStateInformation(tempoState);recalled->setStateInformation(tempoState.getData(),(int)tempoState.getSize());check(!recalled->syncTempo()&&recalled->userTempo()==137,"SYNC/manual tempo recall");
 check(maxError<=1,"START exceeds one tick");check(p->getLatencySamples()==0,"latency");std::cout<<"PASS START: "<<cases<<" cases; max "<<maxError<<" tick. TEMPO: "<<clockCases<<" ramp/step/realtime/offline cases; max "<<clockError<<" tick; SYNC preview/export/recall, missing clock and meter mute. Not Logic evidence.\n";
 }catch(const std::exception& e){std::cerr<<e.what()<<"\n";return 1;}}
