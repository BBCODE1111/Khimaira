#pragma once

// Pure C++ scheduling core (no JUCE dependency) so it can be unit tested anywhere.
//
//  - PatternPlayer: plays a looping chord pattern locked to the DAW's beat position (PPQ).
//    Bar 1 of the KHIMAIRA chart is aligned with beat 0 of the host timeline and repeats
//    every `lengthBeats`.
//  - PreviewScheduler: plays one-off notes sent by the web UI's PLAY button, positioned on a
//    free-running sample clock.
//
// Both emit (sampleOffset, isNoteOn, note, velocity) events through a callback and never
// allocate on the audio thread once prepared.

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <vector>

namespace kh
{

struct NoteEvent
{
    double beat = 0.0;     // start, in quarter notes from bar 1
    double length = 0.0;   // in quarter notes
    int note = 60;
    float velocity = 0.8f; // 0..1
};

struct Pattern
{
    std::vector<NoteEvent> notes;
    double lengthBeats = 0.0;
};

struct MidiOut
{
    int offset;
    bool on;
    int note;
    float velocity;
};

//==============================================================================
class PatternPlayer
{
public:
    void prepare (int maxEvents = 4096)
    {
        scratch.reserve ((size_t) maxEvents);
        reset();
    }

    void reset()
    {
        activeEnd.fill (-1.0);
        wasPlaying = false;
        expectedPpq = 0.0;
    }

    bool hasActiveNotes() const
    {
        return std::any_of (activeEnd.begin(), activeEnd.end(), [] (double e) { return e >= 0.0; });
    }

    template <typename Emit>
    void allNotesOff (int offset, Emit&& emit)
    {
        for (int n = 0; n < 128; ++n)
        {
            if (activeEnd[(size_t) n] >= 0.0)
            {
                emit (MidiOut { offset, false, n, 0.0f });
                activeEnd[(size_t) n] = -1.0;
            }
        }
    }

    /** Renders one audio block.
        @param playing   host transport is running and sync is enabled
        @param ppqStart  host position (quarter notes) at the first sample of the block
        @param bpm       host tempo
    */
    template <typename Emit>
    void process (const Pattern& pattern, bool playing, double ppqStart, double bpm,
                  double sampleRate, int numSamples, Emit&& emit)
    {
        if (! playing || bpm <= 0.0 || sampleRate <= 0.0 || numSamples <= 0)
        {
            if (wasPlaying)
                allNotesOff (0, emit);

            wasPlaying = false;
            return;
        }

        const double ppqPerSample = bpm / (60.0 * sampleRate);
        const double ppqEnd = ppqStart + numSamples * ppqPerSample;

        // A jump in the timeline (DAW loop, scrubbing, locate) closes everything that sounds.
        if (wasPlaying && std::abs (ppqStart - expectedPpq) > std::max (0.02, 8.0 * ppqPerSample))
            allNotesOff (0, emit);

        wasPlaying = true;
        expectedPpq = ppqEnd;

        auto toOffset = [&] (double ppq)
        {
            const auto o = (int) std::floor ((ppq - ppqStart) / ppqPerSample);
            return std::clamp (o, 0, numSamples - 1);
        };

        scratch.clear();

        // Note-ons that start inside this block.
        const double len = pattern.lengthBeats;

        if (len > 0.0 && ! pattern.notes.empty() && ppqEnd > 0.0)
        {
            const auto firstCycle = (long long) std::floor (std::max (0.0, ppqStart) / len);
            const auto lastCycle  = (long long) std::floor (ppqEnd / len);

            for (auto cycle = firstCycle; cycle <= lastCycle; ++cycle)
            {
                const double cycleStart = (double) cycle * len;

                for (const auto& n : pattern.notes)
                {
                    if (n.note < 0 || n.note > 127 || n.length <= 0.0 || n.beat >= len)
                        continue;

                    const double start = cycleStart + n.beat;

                    if (start < ppqStart || start >= ppqEnd || start < 0.0)
                        continue;

                    if (scratch.size() + 2 > scratch.capacity())
                        break; // never allocate on the audio thread

                    const double end = cycleStart + std::min (len, n.beat + n.length);
                    scratch.push_back ({ start, end, n.note, n.velocity });
                }
            }
        }

        std::sort (scratch.begin(), scratch.end(),
                   [] (const Pending& a, const Pending& b) { return a.start < b.start; });

        // Walk through the block in time order: due note-offs, then each new note-on.
        size_t next = 0;

        auto flushOffsBefore = [&] (double limit, bool inclusive)
        {
            for (;;)
            {
                int best = -1;
                double bestEnd = 0.0;

                for (int n = 0; n < 128; ++n)
                {
                    const double e = activeEnd[(size_t) n];

                    if (e >= 0.0 && (inclusive ? e <= limit : e < limit) && (best < 0 || e < bestEnd))
                    {
                        best = n;
                        bestEnd = e;
                    }
                }

                if (best < 0)
                    return;

                emit (MidiOut { toOffset (bestEnd), false, best, 0.0f });
                activeEnd[(size_t) best] = -1.0;
            }
        };

        while (next < scratch.size())
        {
            const auto& p = scratch[next];
            flushOffsBefore (p.start, true);

            // Same pitch still ringing (overlap inside the pattern): retrigger cleanly.
            if (activeEnd[(size_t) p.note] >= 0.0)
            {
                emit (MidiOut { toOffset (p.start), false, p.note, 0.0f });
                activeEnd[(size_t) p.note] = -1.0;
            }

            emit (MidiOut { toOffset (p.start), true, p.note, p.velocity });
            activeEnd[(size_t) p.note] = p.end;
            ++next;
        }

        flushOffsBefore (ppqEnd, false);
    }

private:
    struct Pending
    {
        double start, end;
        int note;
        float velocity;
    };

    std::array<double, 128> activeEnd {};
    std::vector<Pending> scratch;
    bool wasPlaying = false;
    double expectedPpq = 0.0;
};

//==============================================================================
/** Notes sent from the web UI preview. Positions are absolute sample-clock values. */
struct PreviewCommand
{
    enum Type : int { noteOn, retime, cancel, stopAll };

    Type type = noteOn;
    int id = 0;
    int note = 60;
    float velocity = 0.8f;
    int64_t startSample = 0;
    int64_t endSample = 0;
};

class PreviewScheduler
{
public:
    void reset()
    {
        numPending = 0;
        sounding.fill (0);
    }

    void push (const PreviewCommand& c)
    {
        switch (c.type)
        {
            case PreviewCommand::noteOn:
                if (numPending < (int) pending.size())
                    pending[(size_t) numPending++] = { c.id, c.note, c.velocity, c.startSample, c.endSample, false };
                break;

            case PreviewCommand::retime:
                for (int i = 0; i < numPending; ++i)
                    if (pending[(size_t) i].id == c.id)
                        pending[(size_t) i].end = c.endSample;
                break;

            case PreviewCommand::cancel:
                for (int i = 0; i < numPending; ++i)
                    if (pending[(size_t) i].id == c.id)
                        pending[(size_t) i].end = std::min (pending[(size_t) i].end, c.endSample);
                break;

            case PreviewCommand::stopAll:
                stopAllRequested = true;
                break;
        }
    }

    /** @param clock sample-clock value of the first sample of this block */
    template <typename Emit>
    void process (int64_t clock, int numSamples, Emit&& emit)
    {
        if (stopAllRequested)
        {
            stopAllRequested = false;

            for (int i = 0; i < numPending; ++i)
            {
                auto& p = pending[(size_t) i];

                if (p.started && sounding[(size_t) p.note] == p.id)
                {
                    emit (MidiOut { 0, false, p.note, 0.0f });
                    sounding[(size_t) p.note] = 0;
                }
            }

            numPending = 0;
            return;
        }

        const int64_t blockEnd = clock + numSamples;

        auto offsetOf = [&] (int64_t s)
        {
            return (int) std::clamp<int64_t> (s - clock, 0, numSamples - 1);
        };

        // Starts, in time order of the queue (the UI already sends them in order).
        for (int i = 0; i < numPending; ++i)
        {
            auto& p = pending[(size_t) i];

            if (! p.started && p.start < blockEnd)
            {
                if (p.end <= p.start || p.end <= clock)
                {
                    p.started = true; // cancelled before it sounded: drop silently
                    p.id = -1;
                    continue;
                }

                if (sounding[(size_t) p.note] != 0)
                    emit (MidiOut { offsetOf (p.start), false, p.note, 0.0f });

                emit (MidiOut { offsetOf (p.start), true, p.note, p.velocity });
                sounding[(size_t) p.note] = p.id;
                p.started = true;
            }
        }

        // Ends.
        for (int i = 0; i < numPending; ++i)
        {
            auto& p = pending[(size_t) i];

            if (p.started && p.id >= 0 && p.end < blockEnd)
            {
                if (sounding[(size_t) p.note] == p.id)
                {
                    emit (MidiOut { std::max (offsetOf (p.end), offsetOf (p.start)), false, p.note, 0.0f });
                    sounding[(size_t) p.note] = 0;
                }

                p.id = -1;
            }
        }

        // Compact finished entries.
        int w = 0;

        for (int i = 0; i < numPending; ++i)
            if (! (pending[(size_t) i].started && pending[(size_t) i].id < 0))
                pending[(size_t) w++] = pending[(size_t) i];

        numPending = w;
    }

    int getNumPending() const { return numPending; }

private:
    struct Slot
    {
        int id;
        int note;
        float velocity;
        int64_t start, end;
        bool started;
    };

    std::array<Slot, 1024> pending {};
    int numPending = 0;
    std::array<int, 128> sounding {};
    bool stopAllRequested = false;
};

} // namespace kh
