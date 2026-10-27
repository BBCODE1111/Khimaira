#include <memory>
#include "../Source/Sequence.h"
#include "../Source/HostTimeline.h"
#include <iostream>
#include <stdexcept>
using namespace khimaira;
void check(bool b,const char* message){if(!b)throw std::runtime_error(message);}
struct Output {int pitch;double velocity;int offset;};
int main(){
 auto seq=std::make_unique<Sequence>();check(seq->assign({{0,4,60,1.0},{4,4,62,.9},{8,8,64,.8}},16),"assign");
 Scheduler s;std::vector<Output> out;auto emit=[&](int p,double v,int t){out.push_back({p,v,t});};
 // Quarter note at 120 BPM, 48 kHz = 24,000 samples. Irregular buffers exercise boundaries.
 std::array<bool,128> active{};int ons=0,offs=0;double beat=0;
 for(int i=0;i<2000;i++){out.clear();s.render(seq.get(),beat,1./24000,511,true,true,false,emit);for(auto e:out){check(e.offset>=0&&e.offset<511,"sample offset");if(e.velocity){check(!active[e.pitch],"duplicate on");active[e.pitch]=true;ons++;}else{check(active[e.pitch],"orphan off");active[e.pitch]=false;offs++;}}beat+=511./24000;}
 out.clear();s.render(seq.get(),beat,1./24000,511,false,true,false,emit);for(auto e:out){check(e.velocity==0,"stop off");active[e.pitch]=false;offs++;}check(ons==offs,"balanced after stop");
 // Starting inside a held chord must chase it, then release on its true boundary.
 out.clear();s.render(seq.get(),6,1./24000,24000,true,true,true,emit);check(out.size()==1&&out[0].pitch==62&&out[0].velocity==.9&&out[0].offset==0,"seek chase");
 out.clear();s.render(seq.get(),7,1./12000,24000,true,true,false,emit);check(out.size()==2&&out[0].velocity==0&&out[0].offset==12000&&out[1].pitch==64,"tempo change");
 // Loop: old note-off must precede new note-on at the same sample.
 out.clear();s.render(seq.get(),15,1./24000,48000,true,true,true,emit);check(out.size()==4&&out[2].velocity==0&&out[3].pitch==60&&out[3].offset==24000,"loop boundary");
 out.clear();s.render(seq.get(),16,1./24000,100,true,false,true,emit);check(!out.empty()&&out.back().velocity==0,"one shot end");
 check(!seq->assign({{0,2,60,1.0},{1,2,60,1.0}},4),"reject overlapping same pitch");check(!seq->assign({{0,-1,60,1.0}},4),"reject duration");check(!seq->assign({{0,1,128,1.0}},4),"reject pitch");
 check(seq->assign({{0,4,60,1.0}},4),"valid");auto mail=std::make_unique<Mailbox>();for(int i=0;i<10000;i++){check(mail->publish(*seq),"mail publish");bool changed;auto p=mail->consume(changed);check(changed&&p->noteCount==1,"mail consume");}
 // Retain raw engine values while playback/export use identical absolute ticks.
 check(seq->assign({{.0011127713299356403,.7195694890187122,55,.6928212449550628}},4),"grid assign");
 check(seq->notes[0].beat==.0011127713299356403 && seq->notes[0].duration==.7195694890187122,"grid changed source");
 check(seq->events[0].beat==1./480,"first onset rounds consistently");
 s.flush(emit);out.clear();s.render(seq.get(),.0015,1./24000,1,true,true,true,emit);check(out.empty(),"seek chased before quantised onset");
 check(seq->assign({{.5,.00001,60,.7}},4),"short note assign");
 check(seq->events[1].beat>seq->events[0].beat,"short note stuck at zero length");
 check(!seq->assign({{0,1.0002,60,.7},{1.0001,1,60,.7}},4),"rounding hid source overlap");
 // Host PPQ rounding must not move notes across sample/tick boundaries.
 HostTimeline timeline;constexpr double bps=1./24000;
 for(int64_t frame=-24000;frame<24000*100;frame+=64){
  const double trueBeat=frame*bps,reported=std::ceil(trueBeat*3840)/3840;
  const double beat=timeline.resolve(reported,frame,bps,64,true);
  check(std::abs(beat-trueBeat)<1e-10,"rounded host PPQ drift");
 }
 timeline.reset();check(std::abs(timeline.resolve(7.8125*bps,7,bps,64,true)-7*bps)<1e-12,"first positive block must align project zero");
 check(timeline.resolve(12.,288000,bps,64,true)==12.,"seek must re-anchor");
 check(timeline.resolve(0.,0,bps,64,true)==0.,"host cycle must re-anchor");
 check(timeline.resolve(64*bps,64,1./16000,64,true)==64*bps,"tempo change must re-anchor");
 check(timeline.resolve(2.,std::nullopt,bps,64,true)==2.,"missing sample timeline fallback");
 check(timeline.resolve(3.,72000,bps,64,false)==3.,"stopped timeline fallback");
 std::cout<<"PASS: sample timing, looping, seeks, tempo changes, stop flush, one-shot, validation and mailbox\n";
}
