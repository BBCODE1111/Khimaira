// Unit tests for the DAW-sync scheduler and the preview scheduler (no JUCE needed).
#include "PatternPlayer.h"
#include <cstdio>
#include <cstdlib>
#include <vector>

static int failures = 0;
#define CHECK(cond) do { if (!(cond)) { std::printf ("FAIL %s:%d  %s\n", __FILE__, __LINE__, #cond); ++failures; } } while (0)

struct Ev { long long sample; bool on; int note; };

// Runs the player over [ppqFrom, ppqTo) in blocks and returns absolute sample positions.
static std::vector<Ev> run (kh::PatternPlayer& p, const kh::Pattern& pat, double ppqFrom, double ppqTo,
                            double bpm = 120.0, double sr = 48000.0, int block = 512, long long baseSample = 0)
{
    std::vector<Ev> out;
    const double ppqPerSample = bpm / (60.0 * sr);
    const long long total = (long long) ((ppqTo - ppqFrom) / ppqPerSample);

    for (long long s = 0; s < total; s += block)
    {
        const int n = (int) std::min<long long> (block, total - s);
        p.process (pat, true, ppqFrom + (double) s * ppqPerSample, bpm, sr, n,
                   [&] (const kh::MidiOut& e) { out.push_back ({ baseSample + s + e.offset, e.on, e.note }); });
    }

    return out;
}

static void testLoopAndTiming()
{
    kh::PatternPlayer p; p.prepare();
    kh::Pattern pat; pat.lengthBeats = 4;
    pat.notes = { { 0.0, 1.0, 60, 0.8f }, { 2.0, 2.0, 64, 0.7f } };

    const auto ev = run (p, pat, 0.0, 8.0); // two loops at 120 BPM / 48 kHz: 1 beat = 24000 samples
    CHECK (ev.size() == 7); // the last off lands exactly on the range end
    if (ev.size() == 7)
    {
        CHECK (ev[0].on && ev[0].note == 60 && ev[0].sample == 0);
        CHECK (! ev[1].on && ev[1].note == 60 && std::llabs (ev[1].sample - 24000) <= 1);
        CHECK (ev[2].on && ev[2].note == 64 && std::llabs (ev[2].sample - 48000) <= 1);
        // Note 64 ends exactly where the loop restarts: off must come before the next on.
        CHECK (! ev[3].on && ev[3].note == 64 && std::llabs (ev[3].sample - 96000) <= 1);
        CHECK (ev[4].on && ev[4].note == 60 && std::llabs (ev[4].sample - 96000) <= 1);
    }
}

static void testStopAndJump()
{
    kh::PatternPlayer p; p.prepare();
    kh::Pattern pat; pat.lengthBeats = 8;
    pat.notes = { { 0.0, 8.0, 48, 0.8f } };

    std::vector<Ev> ev;
    auto emit = [&] (const kh::MidiOut& e) { ev.push_back ({ e.offset, e.on, e.note }); };

    p.process (pat, true, 0.0, 120.0, 48000.0, 512, emit);
    CHECK (ev.size() == 1 && ev[0].on);

    // Locate somewhere else while playing: the held note must be released.
    ev.clear();
    p.process (pat, true, 5.0, 120.0, 48000.0, 512, emit);
    CHECK (ev.size() == 1 && ! ev[0].on && ev[0].note == 48);

    // Transport stops.
    ev.clear();
    p.process (pat, true, 0.0, 120.0, 48000.0, 512, emit);
    p.process (pat, false, 0.0, 120.0, 48000.0, 512, emit);
    CHECK (ev.size() == 2 && ev[0].on && ! ev[1].on);
    CHECK (! p.hasActiveNotes());
}

static void testNoDoubleTriggerAtBlockEdge()
{
    kh::PatternPlayer p; p.prepare();
    kh::Pattern pat; pat.lengthBeats = 4;
    pat.notes = { { 1.0, 0.5, 67, 0.8f } };

    // 1 beat = 24000 samples; with 480-sample blocks beat 1.0 lands exactly on a block start.
    const auto ev = run (p, pat, 0.0, 4.0, 120.0, 48000.0, 480);
    int ons = 0;
    for (auto& e : ev) ons += e.on;
    CHECK (ons == 1);
}

static void testOverlapRetrigger()
{
    kh::PatternPlayer p; p.prepare();
    kh::Pattern pat; pat.lengthBeats = 4;
    pat.notes = { { 0.0, 3.0, 60, 0.8f }, { 1.0, 1.0, 60, 0.8f } };

    const auto ev = run (p, pat, 0.0, 4.0);
    // on(0) off(1) on(1) off(2): never two ons in a row for the same key.
    int depth = 0, maxDepth = 0;
    for (auto& e : ev) { depth += e.on ? 1 : -1; maxDepth = std::max (maxDepth, depth); }
    CHECK (maxDepth == 1 && depth == 0);
}

static void testNegativePreroll()
{
    kh::PatternPlayer p; p.prepare();
    kh::Pattern pat; pat.lengthBeats = 4;
    pat.notes = { { 0.0, 1.0, 60, 0.8f } };

    const auto ev = run (p, pat, -1.0, 0.5); // count-in before bar 1
    CHECK (! ev.empty() && ev[0].on && std::llabs (ev[0].sample - 24000) <= 1);
}

static void testPreview()
{
    kh::PreviewScheduler s; s.reset();
    std::vector<Ev> ev;
    long long clock = 0;
    auto block = [&] { s.process (clock, 256, [&] (const kh::MidiOut& e) { ev.push_back ({ clock + e.offset, e.on, e.note }); }); clock += 256; };

    s.push ({ kh::PreviewCommand::noteOn, 1, 60, 0.8f, 300, 1000 });
    s.push ({ kh::PreviewCommand::noteOn, 2, 64, 0.8f, 2000, 3000 });
    for (int i = 0; i < 6; ++i) block();
    CHECK (ev.size() == 2);
    if (ev.size() == 2) { CHECK (ev[0].on && ev[0].sample == 300); CHECK (! ev[1].on && ev[1].sample == 1000); }

    // Cancel before it sounds: silent.
    s.push ({ kh::PreviewCommand::cancel, 2, 0, 0, 0, clock });
    for (int i = 0; i < 12; ++i) block();
    CHECK (ev.size() == 2);

    // Retime a held note, then stop everything.
    s.push ({ kh::PreviewCommand::noteOn, 3, 67, 0.8f, clock + 10, clock + 100000 });
    block();
    s.push ({ kh::PreviewCommand::retime, 3, 0, 0, 0, clock + 50 });
    block();
    CHECK (ev.size() == 4 && ! ev.back().on && ev.back().note == 67);

    s.push ({ kh::PreviewCommand::noteOn, 4, 72, 0.8f, clock, clock + 100000 });
    block();
    s.push ({ kh::PreviewCommand::stopAll, 0, 0, 0, 0, 0 });
    block();
    CHECK (ev.size() == 6 && ! ev.back().on && ev.back().note == 72);
    CHECK (s.getNumPending() == 0);
}

int main()
{
    testLoopAndTiming();
    testStopAndJump();
    testNoDoubleTriggerAtBlockEdge();
    testOverlapRetrigger();
    testNegativePreroll();
    testPreview();

    if (failures == 0) std::printf ("All scheduler tests passed\n");
    return failures == 0 ? 0 : 1;
}
