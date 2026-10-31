#import <Foundation/Foundation.h>
#include <AudioToolbox/AudioToolbox.h>
#include <CoreMIDI/CoreMIDI.h>
#include <algorithm>
#include <array>
#include <cmath>
#include <iostream>
#include <map>
#include <stdexcept>
#include <string>
#include <vector>

// Loads the installed AU binary through Apple's public host API. This is an
// independent test host, not Logic and not a replacement for Logic UI acceptance.
static void require(bool ok, const char* message) {
    if (!ok) throw std::runtime_error(message);
}
static void checked(OSStatus status, const char* action) {
    if (status) throw std::runtime_error(std::string(action) + ": " + std::to_string(status));
}
struct Event { int64_t frame; int pitch, velocity; };
static bool same(const std::vector<Event>& a,const std::vector<Event>& b) {
    if(a.size()!=b.size())return false;
    for(size_t i=0;i<a.size();++i)
        if(a[i].frame!=b[i].frame||a[i].pitch!=b[i].pitch||a[i].velocity!=b[i].velocity)return false;
    return true;
}
struct Host {
    int64_t frame = 0;
    bool playing = true;
    std::vector<Event> events;
    static OSStatus beat(void* data, Float64* beat, Float64* tempo) {
        auto& h = *static_cast<Host*>(data);
        if (beat) *beat = h.frame / 24000.;
        if (tempo) *tempo = 120;
        return noErr;
    }
    static OSStatus transport(void* data, Boolean* play, Boolean* changed,
                              Float64* sample, Boolean* cycle, Float64* begin, Float64* end) {
        auto& h = *static_cast<Host*>(data);
        if (play) *play = h.playing;
        if (changed) *changed = false;
        if (sample) *sample = h.frame;
        if (cycle) *cycle = false;
        if (begin) *begin = 0;
        if (end) *end = 16;
        return noErr;
    }
    static OSStatus midi(void* data, const AudioTimeStamp*, UInt32, const MIDIPacketList* list) {
        auto& h = *static_cast<Host*>(data);
        auto* packet = &list->packet[0];
        for (UInt32 i = 0; i < list->numPackets; ++i, packet = MIDIPacketNext(packet)) {
            for (int byte = 0; byte + 2 < packet->length; byte += 3) {
                auto* m = packet->data + byte;
                if ((m[0] & 0xf0) == 0x90 || (m[0] & 0xf0) == 0x80)
                    h.events.push_back({h.frame + static_cast<int64_t>(packet->timeStamp),
                                        m[1], (m[0] & 0xf0) == 0x90 ? m[2] : 0});
            }
        }
        return noErr;
    }
};
class Unit {
public:
    AudioUnit au = nullptr;
    CFBundleRef bundle = nullptr;
    Host host;
    std::map<std::string, AudioUnitParameterID> ids;
    std::map<std::string, std::pair<float,float>> ranges;
    static std::pair<float,float> musicalRange(const std::string& name) {
        if(name=="Start Position" || name=="Tempo Sync") return {0,1};
        if(name=="Start Anchor Bar") return {1,9999};
        if(name=="Preview Export Tempo") return {30,300};
        if(name=="ARP Gate") return {10,100};
        if(name=="ARP Swing") return {0,32};
        if(name=="ARP Humanize") return {0,100};
        if(name=="ARP Variation Seed") return {0,65535};
        if(name=="ARP Mode") return {0,10};
        if(name=="ARP Rate") return {0,5};
        if(name=="ARP Octaves") return {0,3};
        if(name=="ARP Phase") return {0,1};
        return {0,2};
    }
    explicit Unit(OSType subtype) {
        AudioComponentDescription desc{'aumi', subtype, 'Khmr', 0, 0};
        auto component = AudioComponentFindNext(nullptr, &desc);
        if(const char* path=getenv(subtype=='Km13'?"KHIMAIRA_AU_BUNDLE":"SEIREN_AU_BUNDLE")) {
            NSURL* url=[NSURL fileURLWithPath:[NSString stringWithUTF8String:path]];
            bundle=CFBundleCreate(kCFAllocatorDefault,(__bridge CFURLRef)url);
            require(bundle && CFBundleLoadExecutable(bundle),"Load built AU bundle");
            auto info=(__bridge NSDictionary*)CFBundleGetInfoDictionary(bundle);
            NSDictionary* entry=info[@"AudioComponents"][0];
            auto factory=(AudioComponentFactoryFunction)CFBundleGetFunctionPointerForName(bundle,(__bridge CFStringRef)entry[@"factoryFunction"]);
            require(factory!=nullptr,"Built AU factory missing");
            require([entry[@"type"] isEqual:@"aumi"],"Built AU is not MIDI FX");
            component=AudioComponentRegister(&desc,(__bridge CFStringRef)entry[@"name"],[entry[@"version"] unsignedIntValue],factory);
        }
        require(component != nullptr, "Installed AU not found");
        UInt32 version=0;checked(AudioComponentGetVersion(component,&version),"AU version");require(version==0x10400,"Expected new 1.4 binary");
        checked(AudioComponentInstanceNew(component, &au), "Instantiate AU");
        Float64 latency=-1;UInt32 latencySize=sizeof(latency);checked(AudioUnitGetProperty(au,kAudioUnitProperty_Latency,kAudioUnitScope_Global,0,&latency,&latencySize),"AU latency");require(latency==0,"AU added latency");
        UInt32 size = 0; Boolean writable = false;
        checked(AudioUnitGetPropertyInfo(au, kAudioUnitProperty_ParameterList,
                    kAudioUnitScope_Global, 0, &size, &writable), "Parameter list size");
        std::vector<AudioUnitParameterID> list(size / sizeof(AudioUnitParameterID));
        checked(AudioUnitGetProperty(au, kAudioUnitProperty_ParameterList,
                    kAudioUnitScope_Global, 0, list.data(), &size), "Parameter list");
        for (auto id : list) {
            AudioUnitParameterInfo info{}; size = sizeof(info);
            checked(AudioUnitGetProperty(au, kAudioUnitProperty_ParameterInfo,
                        kAudioUnitScope_Global, id, &info, &size), "Parameter info");
            std::string name = info.name;
            if (info.flags & kAudioUnitParameterFlag_HasCFNameString) {
                char text[256]{};
                CFStringGetCString(info.cfNameString, text, sizeof(text), kCFStringEncodingUTF8);
                name = text;
                if (info.flags & kAudioUnitParameterFlag_CFNameRelease) CFRelease(info.cfNameString);
            }
            ids[name] = id;
            ranges[name] = {info.minValue,info.maxValue};
        }
        require(ids.size() == 14, "AU must expose ten ARP plus four START/TEMPO parameters");
        HostCallbackInfo callbacks{};
        callbacks.hostUserData = &host;
        callbacks.beatAndTempoProc = Host::beat;
        callbacks.transportStateProc = Host::transport;
        checked(AudioUnitSetProperty(au, kAudioUnitProperty_HostCallbacks,
                    kAudioUnitScope_Global, 0, &callbacks, sizeof(callbacks)), "Host callbacks");
        AUMIDIOutputCallbackStruct midi{Host::midi, &host};
        checked(AudioUnitSetProperty(au, kAudioUnitProperty_MIDIOutputCallback,
                    kAudioUnitScope_Global, 0, &midi, sizeof(midi)), "MIDI callback");
        AudioStreamBasicDescription format{}; size = sizeof(format);
        checked(AudioUnitGetProperty(au, kAudioUnitProperty_StreamFormat,
                    kAudioUnitScope_Output, 0, &format, &size), "Output format");
        format.mSampleRate = 48000;
        checked(AudioUnitSetProperty(au, kAudioUnitProperty_StreamFormat,
                    kAudioUnitScope_Output, 0, &format, sizeof(format)), "48 kHz format");
        checked(AudioUnitInitialize(au), "Initialize AU");
    }
    ~Unit() { if (au) { AudioUnitUninitialize(au); AudioComponentInstanceDispose(au); } if(bundle)CFRelease(bundle); }
    NSMutableDictionary* state() {
        CFPropertyListRef value = nullptr; UInt32 size = sizeof(value);
        checked(AudioUnitGetProperty(au, kAudioUnitProperty_ClassInfo,
                    kAudioUnitScope_Global, 0, &value, &size), "Read AU state");
        NSMutableDictionary* result = [(__bridge NSDictionary*) value mutableCopy];
        CFRelease(value);
        return result;
    }
    void state(NSDictionary* value) {
        CFPropertyListRef data = (__bridge CFPropertyListRef) value;
        checked(AudioUnitSetProperty(au, kAudioUnitProperty_ClassInfo,
                    kAudioUnitScope_Global, 0, &data, sizeof(data)), "Restore AU state");
    }
    void set(const std::string& name, float value) {
        const auto [lo,hi]=musicalRange(name);const auto [auLo,auHi]=ranges.at(name);
        const auto converted=auLo+(value-lo)/(hi-lo)*(auHi-auLo);
        checked(AudioUnitSetParameter(au, ids.at(name), kAudioUnitScope_Global, 0, converted, 0), "Set AU parameter");
        const auto read=get(name);
        if (std::abs(read - value) >= .01)
            throw std::runtime_error("AU parameter " + name + " expected " + std::to_string(value) + " got " + std::to_string(read));
    }
    float get(const std::string& name) {
        AudioUnitParameterValue value = 0;
        checked(AudioUnitGetParameter(au, ids.at(name), kAudioUnitScope_Global, 0, &value), "Read AU parameter");
        const auto [lo,hi]=musicalRange(name);const auto [auLo,auHi]=ranges.at(name);
        return lo+(value-auLo)/(auHi-auLo)*(hi-lo);
    }
    void render(int frames = 256) {
        float left[512]{}, right[512]{};
        struct { UInt32 count; AudioBuffer buffers[2]; } audio{2, {{1, UInt32(frames * 4), left}, {1, UInt32(frames * 4), right}}};
        AudioTimeStamp time{}; time.mSampleTime = host.frame; time.mFlags = kAudioTimeStampSampleTimeValid;
        AudioUnitRenderActionFlags flags = 0;
        checked(AudioUnitRender(au, &flags, &time, 0, frames, reinterpret_cast<AudioBufferList*>(&audio)), "Render AU");
        host.frame += frames;
    }
};
static void run(OSType subtype, const char* name) {
    Unit unit(subtype);
    auto legacy = unit.state();
    NSMutableDictionary* json = [NSJSONSerialization JSONObjectWithData:legacy[@"jucePluginState"] options:NSJSONReadingMutableContainers error:nil];
    require([json isKindOfClass:NSMutableDictionary.class], "JSON state not readable");
    [json removeObjectForKey:@"nativeParameters"];
    NSMutableDictionary* ui = json[@"ui"];
    ui[@"pattern"] = @"arp"; ui[@"swing"] = @16; [ui removeObjectForKey:@"arpSwing"];
    ui[@"arpMode"] = @"upDown"; ui[@"arpRate"] = @"16"; ui[@"arpOctaves"] = @2;
    ui[@"arpAccent"] = @"beat"; ui[@"arpPhase"] = @"flow"; ui[@"arpFoundation"] = @"off";
    ui[@"arpSeed"] = @1; ui[@"gate"] = @82; json[@"transportHost"] = @YES;
    legacy[@"jucePluginState"] = [NSJSONSerialization dataWithJSONObject:json options:0 error:nil];
    unit.state(legacy);
    require(unit.get("ARP Swing") == 0, "Legacy default swing was not reset by AU");
    for(int oldSwing:{8,12,16}) {
        ui[@"swing"]=@(oldSwing);
        legacy[@"jucePluginState"]=[NSJSONSerialization dataWithJSONObject:json options:0 error:nil];
        unit.state(legacy);
        require(std::abs(unit.get("ARP Swing")-(oldSwing==12?12:0))<.01,"Legacy swing migration changed explicit value");
    }
    // Straight baseline through the actual AU wrapper and host MIDI callback.
    const int total = 48 * 24000;
    for (int frame = 0; frame < total; frame += 256) unit.render(std::min(256, total - frame));
    unit.host.playing = false; unit.render();
    int attacks = 0; double error = 0;
    std::array<bool,128> held{};
    for (auto e : unit.host.events) {
        if (e.velocity) {
            require(!held[e.pitch], "AU duplicate note on"); held[e.pitch] = true; ++attacks;
            error = std::max(error, std::abs(e.frame / 6000. - std::round(e.frame / 6000.)) * 120.);
        } else { require(held[e.pitch], "AU orphan note off"); held[e.pitch] = false; }
    }
    require(attacks == 192 && error <= 1, "AU straight-grid timing/count failed");
    for (bool key : held) require(!key, "AU stopped with held key");
    // Changes travel through the AU parameter API, then repeat after AU state recall.
    const std::map<std::string,float> settings{{"ARP Mode",6}, {"ARP Rate",5}, {"ARP Octaves",2},
        {"ARP Accent",2}, {"ARP Phase",1}, {"ARP Foundation",1}, {"ARP Variation Seed",417},
        {"ARP Gate",45}, {"ARP Swing",16}, {"ARP Humanize",25}};
    for (const auto& [key,value] : settings) unit.set(key,value);
    auto saved = unit.state();
    for (const auto& [key,value] : settings) unit.set(key, key == "ARP Gate" ? 10 : 0);
    unit.state(saved);
    for (const auto& [key,value] : settings) require(std::abs(unit.get(key)-value)<.01, "AU state lost parameter");
    unit.host.events.clear(); unit.host.frame=0; unit.host.playing=true;
    for (int block=0; block<6000; ++block) {
        if (block%31==0) {
            const int n=block/31;
            unit.set("ARP Mode",n%11); unit.set("ARP Rate",n%6); unit.set("ARP Octaves",n%4);
            unit.set("ARP Accent",n%3); unit.set("ARP Phase",n%2); unit.set("ARP Foundation",(n/3)%3);
            unit.set("ARP Variation Seed",n); unit.set("ARP Gate",10+n%91);
            unit.set("ARP Swing",n%33); unit.set("ARP Humanize",n%101);
        }
        unit.render();
    }
    unit.host.playing=false;unit.render();
    int liveAttacks=0;
    for (auto e:unit.host.events) {
        if(e.velocity){require(!held[e.pitch],"AU live duplicate note on");held[e.pitch]=true;++liveAttacks;}
        else{require(held[e.pitch],"AU live orphan note off");held[e.pitch]=false;}
    }
    for(bool key:held)require(!key,"AU live automation left held key");
    require(liveAttacks>100,"AU automation produced no useful output");
    const std::map<std::string,float> base{{"ARP Mode",2}, {"ARP Rate",3}, {"ARP Octaves",1},
        {"ARP Accent",1}, {"ARP Phase",0}, {"ARP Foundation",0}, {"ARP Variation Seed",1},
        {"ARP Gate",82}, {"ARP Swing",0}, {"ARP Humanize",0}};
    const std::map<std::string,float> changed{{"ARP Mode",1}, {"ARP Rate",1}, {"ARP Octaves",2},
        {"ARP Accent",2}, {"ARP Phase",1}, {"ARP Foundation",1}, {"ARP Variation Seed",417},
        {"ARP Gate",45}, {"ARP Swing",16}, {"ARP Humanize",40}};
    auto take=[&] {
        unit.host.events.clear();unit.host.frame=0;unit.host.playing=true;
        for(int frame=0;frame<32*24000;frame+=256)unit.render(std::min(256,32*24000-frame));
        unit.host.playing=false;unit.render();return unit.host.events;
    };
    for(const auto& [key,value]:changed){
        for(const auto& [param,initial]:base)unit.set(param,initial);
        // Seed is audible in RANDOM/WALK, not a fixed ascending sequence.
        if(key=="ARP Variation Seed")unit.set("ARP Mode",6);
        auto before=take();unit.set(key,value);auto after=take();
        if(same(before,after))throw std::runtime_error(key+" did not affect AU MIDI output");
        auto state=unit.state();unit.state(state);auto recalled=take();
        if(!same(after,recalled))throw std::runtime_error(key+" changed after AU state recall");
    }
    const std::map<std::string,float> transportSettings{{"Start Position",1},{"Start Anchor Bar",79},{"Tempo Sync",0},{"Preview Export Tempo",137}};
    for(const auto& [key,value]:transportSettings)unit.set(key,value);
    auto transportState=unit.state();unit.set("Start Position",0);unit.set("Start Anchor Bar",1);unit.set("Tempo Sync",1);unit.set("Preview Export Tempo",120);unit.state(transportState);
    for(const auto& [key,value]:transportSettings)require(std::abs(unit.get(key)-value)<.01,"START/TEMPO AU recall");
    std::cout<<"PASS "<<name<<": new 1.4 aumi binary; zero latency; four START/TEMPO host parameters and recall.\n";
    std::cout<<"PASS "<<name<<": actual AU wrapper, 10 ARP host parameters and state recall, legacy swing migration, "
             <<attacks<<" straight notes / "<<error<<" tick error, "<<liveAttacks<<" live-change notes with paired releases.\n";
    std::cout<<"PASS "<<name<<": each of 10 AU parameters changes MIDI output independently; identical playback after state recall.\n";
}
int main(){@autoreleasepool{try{run('Km13',"KHIMAIRA");run('Sm13',"SEIREN");}
    catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<"\n";return 1;}}}
