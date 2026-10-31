#pragma once
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <optional>
namespace khimaira {
// Audio-thread-only musical origin. No UI clock, allocation, lock or ARP changes.
// Host playback is explicitly 4/4; unsupported meters are handled by the caller.
class StartPosition {
 bool valid=false;int lastMode=0,lastBar=1;double expected=0,origin=0;
 std::optional<int64_t> nextSample;
public:
 struct Result {double beat,origin;bool changed;};
 void reset(){valid=false;nextSample.reset();}
 Result resolve(double beat,std::optional<int64_t> sample,double bps,int count,bool running,int mode,int bar){
  if(!running){reset();return {beat,origin,false};}
  const double tolerance=std::max(2*bps,1./960.);
  const bool jump=!valid||mode!=lastMode||(mode==1&&bar!=lastBar)||(sample&&nextSample&&*sample!=*nextSample)||std::abs(beat-expected)>std::max(4*bps,1./960.);
  if(jump){
   if(mode==1)origin=4.*(std::max(1,bar)-1);
   else {const auto start=std::max(0.,beat);origin=std::max(0.,std::ceil((start-tolerance)/4.))*4.;}
  }
  valid=true;lastMode=mode;lastBar=bar;expected=beat+count*bps;nextSample=sample?std::optional<int64_t>(*sample+count):std::nullopt;
  return {beat-origin,origin,jump};
 }
};
}
