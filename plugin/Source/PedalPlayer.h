#pragma once
#include <algorithm>
#include <cmath>
#include <vector>

namespace kh
{
struct PedalSpan { double beat, length; };
struct PedalOut { int offset, channel, value; };

// CC64 is optional. Lift at every harmonic boundary, rest, seek, channel change and stop.
// The 1/64-beat gap allows the receiving instrument to release the previous harmony.
class PedalPlayer
{
public:
    template <typename Emit> void stop (int offset, Emit&& emit)
    {
        if (down) emit (PedalOut { offset, activeChannel, 0 });
        down = false;
        wasPlaying = false;
    }
    template <typename Emit>
    void process (const std::vector<PedalSpan>& spans, double length, bool enabled,
                  double ppq, double bpm, double sr, int count, int channel, Emit&& emit)
    {
        if (!enabled || length <= 0 || bpm <= 0 || sr <= 0 || count <= 0 || spans.empty())
        { stop (0, emit); return; }
        const double step = bpm / (60.0 * sr), end = ppq + count * step;
        const bool jump = !wasPlaying || std::abs (ppq - expected) > std::max (.02, 8 * step) || channel != activeChannel;
        if (jump) stop (0, emit);
        activeChannel = channel;
        auto set = [&] (bool state, double beat)
        {
            if (state == down) return;
            const auto offset = std::clamp ((int) std::floor ((beat - ppq) / step), 0, count - 1);
            emit (PedalOut { offset, channel, state ? 127 : 0 }); down = state;
        };
        const auto first = (long long) std::max (0LL, (long long) std::floor (std::max (0.0, ppq) / length) - 1);
        const auto last = (long long) std::floor (std::max (0.0, end) / length);
        for (auto cycle = first; cycle <= last; ++cycle)
        {
            const double base = cycle * length;
            for (const auto& span : spans)
            {
                const double on = base + span.beat + std::min (1.0 / 64.0, span.length / 4);
                const double off = base + std::min (length, span.beat + span.length);
                if (jump && on < ppq && ppq < off) set (true, ppq);
                if (on >= ppq && on < end) set (true, on);
                if (off >= ppq && off < end) set (false, off);
            }
        }
        wasPlaying = true; expected = end;
    }
private:
    bool down = false, wasPlaying = false;
    int activeChannel = 1;
    double expected = 0;
};
}
