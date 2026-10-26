#include <memory>
#include "../Source/Sequence.h"
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
 std::cout<<"PASS: sample timing, looping, seeks, tempo changes, stop flush, one-shot, validation and mailbox\n";
}
