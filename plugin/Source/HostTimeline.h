#pragma once
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <optional>

namespace khimaira {
// Some AU hosts round the beat callback more coarsely than their sample timeline.
// Keep the host's musical origin, but advance contiguous constant-tempo blocks
// using samples. A seek, loop wrap, tempo change or missing timeline re-anchors.
class HostTimeline {
 bool valid=false;
 int64_t anchorSample=0,nextSample=0;
 double anchorBeat=0,lastBps=0;
public:
 void reset(){valid=false;}
 double resolve(double reported,std::optional<int64_t> sample,double bps,int count,bool running){
  if(!running || !sample || !std::isfinite(reported) || !std::isfinite(bps) || bps<=0){reset();return reported;}
  const double predicted=anchorBeat+double(*sample-anchorSample)*bps;
  const double tolerance=std::max(4*bps,1./960.);
  const bool contiguous=valid && *sample==nextSample && bps==lastBps && std::abs(predicted-reported)<=tolerance;
  if(!contiguous){anchorSample=*sample;anchorBeat=reported;}
  // Project sample zero and PPQ zero describe the same origin. Count-in may
  // cross it part-way through a block; remove the AU callback's rounding there.
  if((!valid || *sample<=0) && *sample<count && *sample+count>0 && std::abs(reported-double(*sample)*bps)<=tolerance){anchorSample=0;anchorBeat=0;}
  valid=true;nextSample=*sample+count;lastBps=bps;
  return anchorBeat+double(*sample-anchorSample)*bps;
 }
};
}
