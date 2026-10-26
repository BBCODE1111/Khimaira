#include "../Source/PedalPlayer.h"
#include <cstdio>
#include <vector>
int main()
{
    int failed = 0;
    #define check(condition) do { if (!(condition)) { ++failed; std::printf("Failed at line %d\n", __LINE__); } } while(false)
    kh::PedalPlayer player; std::vector<kh::PedalOut> out;
    const std::vector<kh::PedalSpan> spans {{0, 2}, {2, 2}, {6, 2}};
    auto emit = [&] (auto e) {out.push_back(e);};
    auto run = [&] (double ppq, int count=48000, bool enabled=true, int channel=1, double bpm=60)
        {out.clear();player.process(spans,8,enabled,ppq,bpm,48000,count,channel,emit);};
    run(0);check(out.size()==1 && out[0].value==127 && out[0].offset==750);
    run(1);check(out.empty());
    run(2);check(out.size()==2 && out[0].value==0 && out[0].offset==0 && out[1].value==127);
    run(3.5,24000);check(out.size()==2 && out[0].value==0 && out[1].value==127); // seek repedals
    run(4);check(out.size()==1 && out[0].value==0); // rest
    run(5);check(out.empty());run(6);check(out.size()==1 && out[0].value==127);
    run(7,48000,true,2);check(out.size()==2 && out[0].channel==1 && out[0].value==0 && out[1].channel==2);
    run(8,48000,true,2);check(out.size()==2 && out[0].value==0 && out[1].value==127); // pattern loop
    run(9,48000,false,2);check(out.size()==1 && out[0].value==0); // option/transport off
    run(0,48000,true,1,120);check(out.size()==1 && out[0].offset==375);
    run(-1);check(out.size()==1 && out[0].value==0); // preroll must not hold
    run(-.5,48000);check(out.size()==1 && out[0].value==127 && out[0].offset==24750);
    // Tempo changes and partitioning retain exactly the same musical CC events.
    for (int block : {64,128,512,4096}) {
        kh::PedalPlayer p; int ons=0,offs=0; double at=0;
        while(at<8) {const int n=std::min(block,(int) std::round((8-at)*48000));if(n<=0)break;
            p.process(spans,8,true,at,60,48000,n,1,[&](auto e){check(e.offset>=0&&e.offset<n);e.value?++ons:++offs;});at+=n/48000.0;}
        p.stop(0,[&](auto e){e.value?++ons:++offs;});check(ons==3&&offs==3);
    }
    std::printf("Pedal tests: %d failures\n",failed);return failed?1:0;
}
