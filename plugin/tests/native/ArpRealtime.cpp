#include "../../Source/Arpeggiator.h"
#include <iostream>
#include <memory>
#include <stdexcept>
#include <tuple>
void check(bool b,const char* s){if(!b)throw std::runtime_error(s);}
int main(){try{auto plan=std::make_unique<khimaira::ArpPlan>();plan->length=32;plan->count=8;for(int i=0;i<8;i++){auto& s=plan->segments[i];s.beat=i*4;s.beats=4;s.count=4;s.notes={36,60,64,67};}
 for(int block:{64,257,1024})for(double swing:{0.,.16}){
  khimaira::LiveArpeggiator player;khimaira::ArpParameters p;p.swing=swing;p.octaves=2;std::vector<std::tuple<double,int,double>> actual;std::array<int,128> held{};
  const int total=96*24000;for(int frame=0;frame<total;frame+=block){player.render(plan.get(),p,frame/24000.,1./24000.,std::min(block,total-frame),true,true,false,[&](int pitch,double velocity,int offset){double beat=(frame+offset)/24000.;if(velocity){check(held[pitch]==0,"duplicate on");held[pitch]++;actual.push_back({beat,pitch,velocity});}else{check(held[pitch]==1,"unmatched off");held[pitch]--;}});}
  player.flush([&](int pitch,double,int){held[pitch]--;});for(int n:held)check(n==0,"stuck note");check(actual.size()==384,"three-loop count");for(int i=0;i<384;i++){double ref=i*.25+(i%2?swing*.5:0);check(std::abs(std::get<0>(actual[i])-ref)*480<=1,"grid error");if(i>=128){check(std::get<1>(actual[i])==std::get<1>(actual[i%128]),"loop pitch drift");check(std::get<2>(actual[i])==std::get<2>(actual[i%128]),"loop velocity drift");}}
 }
 khimaira::LiveArpeggiator player;khimaira::ArpParameters p;int before=-1,after=-1;for(int at=0;at<24000;at+=64){if(at>=9000)p.mode=1;player.render(plan.get(),p,at/24000.,1./24000.,64,true,true,false,[&](int pitch,double v,int offset){if(v){double beat=(at+offset)/24000.;if(beat==.25)before=pitch;if(beat==.5)after=pitch;}});}check(before>=0&&after>before,"mode change not applied on next step");
 // Exercise every automation lane under rapid changes, host seeks and stops.
 // A key must never be re-attacked without release or remain held after stop.
 for(bool protect:{false,true}){
  plan->protect=protect;plan->melodyCount=protect?2:0;
  plan->melody[0]={0,12,52};plan->melody[1]={16,28,62};
  khimaira::LiveArpeggiator stress;khimaira::ArpParameters q;
  std::array<bool,128> keys{};int attacks=0,releases=0;
  for(int block=0;block<12000;block++){
   if(block%17==0){int n=block/17;q.mode=n%11;q.rate=n%6;q.octaves=1+n%4;q.accent=n%3;q.phase=n%2;q.foundation=(n/3)%3;q.seed=n;q.gate=(10+n%91)/100.;q.swing=(n%33)/100.;q.human=(n%101)/100.;}
   const bool playing=block%701!=700;
   const double start=(block%9000)*257/24000.;
   stress.render(plan.get(),q,start,1./24000.,257,playing,true,false,[&](int pitch,double velocity,int sample){
    check(sample>=0&&sample<257,"automation event outside block");
    if(velocity){check(!keys[pitch],"automation duplicate key");keys[pitch]=true;attacks++;}
    else {check(keys[pitch],"automation orphan release");keys[pitch]=false;releases++;}
   });
   if(!playing)for(bool down:keys)check(!down,"automation stop left key held");
  }
  stress.flush([&](int pitch,double,int){check(keys[pitch],"final orphan release");keys[pitch]=false;releases++;});
  check(attacks>100&&attacks==releases,"automation stress note balance");
 }
 std::cout<<"PASS live ARP three loops, 0/16 swing, three block sizes, note pairing, next-step automation; all 10 parameters stressed with host seeks/stops and melody protection\n";
 }catch(const std::exception& e){std::cerr<<e.what()<<"\n";return 1;}}
