#pragma once
#include <array>
#include <atomic>
#include <algorithm>
#include <cmath>
#include <mutex>
#include <vector>

namespace khimaira {
struct Note { double beat=0, duration=1; int pitch=60; double velocity=.7; };
struct Event { double beat=0; int pitch=60; double velocity=0; bool on=false; };
struct Sequence {
 static constexpr int maxNotes=8192,ticksPerQuarter=480;
 static std::pair<double,double> playbackBounds(const Note& n,double length){
  const int lastTick=(int)std::llround(length*ticksPerQuarter);
  const int startTick=std::clamp((int)std::llround(n.beat*ticksPerQuarter),0,lastTick-1);
  const int endTick=std::clamp((int)std::llround((n.beat+n.duration)*ticksPerQuarter),startTick+1,lastTick);
  return {double(startTick)/ticksPerQuarter,double(endTick)/ticksPerQuarter};
 }
 bool sortAndValidateEvents(){
  std::sort(events.begin(),events.begin()+eventCount,[](const Event&a,const Event&b){return a.beat!=b.beat?a.beat<b.beat:a.on<b.on;});
  std::array<bool,128> sounding{};
  for(int i=0;i<eventCount;i++){auto e=events[i];if(e.on&&sounding[e.pitch])return false;sounding[e.pitch]=e.on;}
  return true;
 }
 std::array<Note,maxNotes> notes{};
 std::array<Event,maxNotes*2> events{};
 int noteCount=0,eventCount=0;
 double length=16;
 bool assign(const std::vector<Note>& source,double beats) {
  if(source.size()>maxNotes||!std::isfinite(beats)||beats<4||beats>64) return false;
  length=beats;noteCount=0;eventCount=0;
  for(auto n:source){
   if(!std::isfinite(n.beat)||!std::isfinite(n.duration)||n.beat<0||n.duration<=0||n.beat+n.duration>length+1e-6||n.pitch<0||n.pitch>127||!std::isfinite(n.velocity)||n.velocity<=0||n.velocity>1) return false;
   // Validate the unquantised source first, normalising floating-point ulps.
   notes[noteCount++]=n;
   events[eventCount++]={std::round(n.beat*1e9)/1e9,n.pitch,n.velocity,true};
   events[eventCount++]={std::round(std::min(n.beat+n.duration,length)*1e9)/1e9,n.pitch,0,false};
  }
  if(!sortAndValidateEvents())return false;
  // Preserve source notes verbatim. Live delivery and MIDI files share 480 PPQ,
  // including at project start and at every loop; never accumulate rounded deltas.
  eventCount=0;
  for(int i=0;i<noteCount;i++){
   const auto n=notes[i];const auto bounds=playbackBounds(n,length);
   events[eventCount++]={bounds.first,n.pitch,n.velocity,true};
   events[eventCount++]={bounds.second,n.pitch,0,false};
  }
  if(!sortAndValidateEvents())return false;
  return true;
 }
};
// Three fixed slots: the audio thread neither allocates nor locks when changing sequence.
class Mailbox {
 std::array<Sequence,3> slots;
 std::array<std::atomic<int>,3> state{};
 std::atomic<int> pending{-1}; int current=-1;
 std::mutex writers;
public:
 bool publish(const Sequence& sequence){std::lock_guard<std::mutex> guard(writers);for(int i=0;i<3;i++){int expected=0;if(state[i].compare_exchange_strong(expected,1)){slots[i]=sequence;state[i].store(2);int old=pending.exchange(i);if(old>=0)state[old].store(0);return true;}}return false;}
 bool hasPending() const {return pending.load()>=0;}
 const Sequence* getCurrent() const {return current>=0?&slots[current]:nullptr;}
 const Sequence* consume(bool& changed){changed=false;int next=pending.exchange(-1);if(next>=0){if(current>=0)state[current].store(0);current=next;state[current].store(3);changed=true;}return current>=0?&slots[current]:nullptr;}
};
class Scheduler {
 std::array<bool,128> active{}; bool running=false;double expected=0;
public:
 template<class Emit> void flush(Emit emit){for(int n=0;n<128;n++)if(active[n]){emit(n,0,0);active[n]=false;}running=false;}
 template<class Emit> void render(const Sequence* seq,double start,double beatPerSample,int samples,bool play,bool loop,bool changed,Emit emit){
  if(!seq||!play||!std::isfinite(start)||!std::isfinite(beatPerSample)||beatPerSample<=0||samples<=0){flush(emit);return;}
  bool jump=changed||!running||std::abs(start-expected)>beatPerSample*2.5;
  if(jump)flush(emit);
  double end=start+samples*beatPerSample;double local=loop?start-std::floor(start/seq->length)*seq->length:start;
  if(jump && start>=0 && (loop||start<seq->length))for(int i=0;i<seq->noteCount;i++){auto n=seq->notes[i];auto bounds=Sequence::playbackBounds(n,seq->length);if(bounds.first<local-1e-9&&bounds.second>local+1e-9){emit(n.pitch,n.velocity,0);active[n.pitch]=true;}}
  const long first=loop?static_cast<long>(std::floor(start/seq->length)):0;
  const long last=loop?static_cast<long>(std::floor(end/seq->length)):0;
  // Include the preceding cycle's final note-offs at the exact loop boundary.
  for(long c=loop?first-1:first;c<=last;c++)for(int i=0;i<seq->eventCount;i++){
   auto e=seq->events[i];double t=c*seq->length+e.beat;
   // Quantise against the same PPQ origin, then select the owning block.
   // Clamping an event rounded to the next block would play it one sample early.
   const auto offset64=std::llround(t/beatPerSample+1e-7)-std::llround(start/beatPerSample+1e-7);
   if(t<0||offset64<0||offset64>=samples)continue;
   const int offset=static_cast<int>(offset64);
   if(e.on){if(active[e.pitch])emit(e.pitch,0,offset);emit(e.pitch,e.velocity,offset);active[e.pitch]=true;}
   else if(active[e.pitch]){emit(e.pitch,0,offset);active[e.pitch]=false;}
  }
  running=true;expected=end;
 }
};
}
