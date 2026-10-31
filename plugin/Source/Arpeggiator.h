#pragma once
#include <array>
#include <atomic>
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <vector>
namespace khimaira {
struct ArpSegment {double beat=0,beats=4;std::array<int,16> notes{};int count=0;};
struct MelodyNote {double start=0,end=1;int pitch=60;};
struct ArpPlan {std::array<ArpSegment,256> segments{};int count=0;double length=16;std::array<MelodyNote,2048> melody{};int melodyCount=0;bool protect=false;};
struct ArpParameters {
 int mode=2,rate=3,octaves=2,accent=1,phase=0,foundation=0;uint32_t seed=1;double gate=.82,swing=0,human=0;
 double step()const{constexpr double steps[]={1,.5,1./3,.25,1./6,.125};return steps[std::clamp(rate,0,5)];}
 bool triplet()const{return rate==2||rate==4;}
 double delay()const{return triplet()?0:swing*2*step();}
 bool operator==(const ArpParameters& p)const{return mode==p.mode&&rate==p.rate&&octaves==p.octaves&&accent==p.accent&&phase==p.phase&&foundation==p.foundation&&seed==p.seed&&gate==p.gate&&swing==p.swing&&human==p.human;}
 bool operator!=(const ArpParameters& p)const{return !(*this==p);}
};
struct ArpNote {double beat,duration;int pitch;double velocity;};
// Fixed-size, allocation-free port of arpeggiator.js. Same RNG consumption and ordering.
class ArpCursor {
 uint32_t seed=1;int tick=0,segment=0,previous=-1,orderStep=0,walk=0;
 double random(){seed=1664525u*seed+1013904223u;return seed/4294967296.;}
 static void unique(int* a,int& n){std::sort(a,a+n);n=(int)(std::unique(a,a+n)-a);}
public:
 void reset(const ArpParameters& p){seed=p.seed;tick=segment=orderStep=walk=0;previous=-1;}
 double nextBeat(const ArpParameters& p)const{return tick*p.step()+(tick%2?p.delay():0);}
 int currentTick()const{return tick;}
 template<class Emit> bool next(const ArpPlan& plan,const ArpParameters& p,Emit emit){
  const int t=tick++;const double step=p.step(),beat=t*step+(t%2?p.delay():0);
  if(t*step>=plan.length-1e-8)return false;
  while(segment<plan.count&&beat>=plan.segments[segment].beat+plan.segments[segment].beats-1e-8)++segment;
  if(segment>=plan.count)return false;
  const auto& s=plan.segments[segment];if(beat<s.beat-1e-8)return true;
  if(segment!=previous){if(p.phase!=0)orderStep=walk=0;previous=segment;}
  int base[16],baseCount=0;for(int i=1;i<s.count;i++)base[baseCount++]=s.notes[i];unique(base,baseCount);
  int stacks[4][16]{},sizes[4]{},stackCount=0,pool[64],poolCount=0;
  for(int oct=0;oct<p.octaves;oct++){int size=0;for(int i=0;i<baseCount;i++)if(base[i]+oct*12<=108)stacks[stackCount][size++]=base[i]+oct*12;if(size){sizes[stackCount]=size;for(int j=0;j<size;j++)pool[poolCount++]=stacks[stackCount][j];stackCount++;}}
  unique(pool,poolCount);if(!poolCount)return true;
  int selected[64],selectedCount=0;
  if(p.mode==9||(p.mode==10&&orderStep%4==0)){const int idx=(p.mode==9?orderStep:orderStep/4)%stackCount;for(int i=0;i<sizes[idx];i++)selected[selectedCount++]=stacks[idx][i];}
  else if(p.mode==6)selected[selectedCount++]=pool[(int)std::floor(random()*poolCount)];
  else if(p.mode==7){walk%=poolCount;if(orderStep){walk+=random()<.5?-1:1;if(walk<0)walk=poolCount>1?1:0;if(walk>=poolCount)walk=std::max(0,poolCount-2);}selected[selectedCount++]=pool[walk];}
  else {int order[128],n=0;switch(p.mode){
   case 1:for(int i=poolCount-1;i>=0;i--)order[n++]=pool[i];break;
   case 2:for(int i=0;i<poolCount;i++)order[n++]=pool[i];for(int i=poolCount-2;i>0;i--)order[n++]=pool[i];break;
   case 3:for(int i=0;i<poolCount;i++)order[n++]=pool[i];for(int i=poolCount-1;i>=0;i--)order[n++]=pool[i];break;
   case 4:for(int a=0,b=poolCount-1;a<=b;a++,b--){order[n++]=pool[a];if(a!=b)order[n++]=pool[b];}break;
   case 5:{int mid=(poolCount-1)/2;order[n++]=pool[mid];for(int d=1;n<poolCount;d++){if(mid+d<poolCount)order[n++]=pool[mid+d];if(mid-d>=0)order[n++]=pool[mid-d];}break;}
   case 8:if(poolCount==1)order[n++]=pool[0];else for(int i=1;i<poolCount;i++){order[n++]=pool[0];order[n++]=pool[i];}break;
   default:for(int i=0;i<poolCount;i++)order[n++]=pool[i];
  }selected[selectedCount++]=order[orderStep%n];}
  const double next=(t+1)*step+((t+1)%2?p.delay():0),span=std::min(next,s.beat+s.beats)-beat;
  if(span<=1e-8)return true;
  const double jitter=random()*std::min(.012,span*.12)*p.human,onset=beat+jitter,duration=std::min(span*p.gate,span-jitter);
  const bool onBeat=std::abs(beat-std::round(beat))<1e-8;
  const double accent=p.accent==0?0:p.accent==2?(t%2?.13:0):(onBeat?.13:0);
  const double velocity=std::clamp(.62+accent+(random()-.5)*.1*p.human,.25,.96);
  std::sort(selected,selected+selectedCount);for(int i=0;i<selectedCount;i++)emit(ArpNote{onset,duration,selected[i],velocity});
  orderStep++;return true;
 }
 template<class Emit> void seek(const ArpPlan& plan,const ArpParameters& p,double beat,Emit emit){reset(p);while(nextBeat(p)<beat-1e-8&&tick<8192)if(!next(plan,p,emit))break;}
};
inline bool safeArpNote(const ArpPlan& plan,int pitch,double start,double end){
 if(!plan.protect)return true;
 for(int i=0;i<plan.melodyCount;i++){auto m=plan.melody[i];if(std::min(end,m.end)-std::max(start,m.start)<=1e-7)continue;const int d=((pitch-m.pitch)%12+12)%12;if(d==1||d==2||d==6||d==10||d==11)return false;}
 return true;
}
// One pending onset and release per MIDI key: retriggers cancel the old release.
class LiveArpeggiator {
 ArpCursor cursor;ArpParameters current;std::array<double,128> onAt,offAt,velocity;std::array<bool,128> active{};
 bool running=false;double expected=0,cycle=0;int foundationSegment=-1;
 static constexpr double never=1e20;
 void clear(){onAt.fill(never);offAt.fill(never);}
public:
 std::atomic<int> displayStep{-1},displayPitch{-1};
 LiveArpeggiator(){clear();}
 template<class Emit> void flush(Emit emit,int offset=0){for(int i=0;i<128;i++)if(active[i]){emit(i,0,offset);active[i]=false;}clear();running=false;displayStep=-1;}
 template<class Emit> void render(const ArpPlan* plan,const ArpParameters& params,double start,double bps,int samples,bool play,bool loop,bool changed,Emit emit){
  if(!plan||!play||plan->count==0){flush(emit);return;}
  if(changed||!running||std::abs(start-expected)>bps*2.5){flush(emit);current=params;cycle=loop?std::floor(std::max(0.,start)/plan->length)*plan->length:0;cursor.seek(*plan,current,std::max(0.,start-cycle),[](ArpNote){});foundationSegment=-1;}
  const double end=start+samples*bps;
  auto offset=[&](double beat){return (int)(std::llround(beat/bps+1e-7)-std::llround(start/bps+1e-7));};
  auto scheduleNote=[&](ArpNote n,bool bass=false){
   int pitch=n.pitch;if(plan->protect){while(!bass&&pitch<52)pitch+=12;if(!safeArpNote(*plan,pitch,n.beat,n.beat+n.duration))return;}
   if(pitch<0||pitch>108)return;
   const double at=cycle+std::round(n.beat*480)/480.,off=cycle+std::max(std::round(n.beat*480)+1.,std::round((n.beat+n.duration)*480))/480.;
   onAt[pitch]=at;offAt[pitch]=off;velocity[pitch]=n.velocity;
  };
  for(int guard=0;guard<8192;guard++){
   double step=cycle+cursor.nextBeat(current);
   if(step>=cycle+plan->length-1e-8){if(loop){cycle+=plan->length;cursor.reset(current);foundationSegment=-1;step=cycle+cursor.nextBeat(current);}else step=never;}
   double next=step;for(int p=0;p<128;p++){if(onAt[p]<next)next=onAt[p];if(active[p]&&offAt[p]<next)next=offAt[p];}
   if(next>=end+bps)break;int sample=offset(next);if(sample>=samples)break;if(sample<0)sample=0;
   // Old releases before fresh attacks, including exactly at loop boundaries.
   for(int p=0;p<128;p++)if(active[p]&&offAt[p]<=next+1e-9){emit(p,0,sample);active[p]=false;offAt[p]=never;}
   if(step<=next+1e-9){
    if(current!=params){flush(emit,sample);current=params;cursor.seek(*plan,current,std::max(0.,next-cycle),[](ArpNote){});foundationSegment=-1;if(cycle+cursor.nextBeat(current)>next+1e-8)continue;}
    const double local=next-cycle;
    for(int i=0;i<plan->count;i++){const auto& s=plan->segments[i];if(local>=s.beat-1e-8&&local<s.beat+s.beats-1e-8){if(foundationSegment!=i&&current.foundation){foundationSegment=i;for(int j=0;j<(current.foundation==2?s.count:std::min(s.count,1));j++)scheduleNote({local,s.beat+s.beats-local,s.notes[j],j==0?.62:.42},j==0);}break;}}
    displayStep=cursor.currentTick()%16;cursor.next(*plan,current,[&](ArpNote n){scheduleNote(n);});
   }
   for(int p=0;p<128;p++)if(onAt[p]<=next+1e-9){if(active[p])emit(p,0,sample);emit(p,velocity[p],sample);active[p]=true;onAt[p]=never;displayPitch=p;}
  }
  running=true;expected=end;
 }
};
}
