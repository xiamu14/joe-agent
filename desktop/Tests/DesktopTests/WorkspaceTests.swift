import Testing
@testable import Desktop

@MainActor struct WorkspaceTests {
    @Test func retainedCardsAndImmersion() {
        let state = WorkspaceState()
        state.open(.video, retain: false)
        state.open(.web, retain: true)
        #expect(state.cards == [.video, .web])
        state.parallel = true
        state.immerse(.video)
        state.close(.web)
        state.exitImmersion()
        #expect(state.cards == [.video])
        #expect(!state.parallel)
    }
    @Test func repeatedOpenDoesNotDuplicate() {
        let state = WorkspaceState()
        state.open(.video, retain: true)
        state.open(.video, retain: true)
        #expect(state.cards == [.video])
        state.open(.web, retain: false)
        #expect(state.cards == [.web])
        state.closeAll()
        #expect(state.cards.isEmpty)
    }
    @Test func explicitPauseWinsOverAutomaticResume() {
        var policy = PlaybackPolicy()
        policy.beginInput(wasPlaying: true)
        policy.explicitChange()
        let stopped = policy.endTurn(videoVisible: true)
        #expect(!stopped)
        policy.beginInput(wasPlaying: true)
        policy.beginInput(wasPlaying: false)
        let resumed = policy.endTurn(videoVisible: true)
        #expect(resumed)
        let repeated = policy.endTurn(videoVisible: true)
        #expect(!repeated)
        policy.beginInput(wasPlaying: true)
        let hidden = policy.endTurn(videoVisible: false)
        #expect(!hidden)
    }
    @Test func waveHasValidHeaderAndClipsSamples() {
        let data = WaveAudio.encode([-2, 0, 2], sampleRate: 16000)
        #expect(data.count == 50)
        #expect(String(data: data.prefix(4), encoding: .utf8) == "RIFF")
        #expect(Array(data[24..<28]) == [128, 62, 0, 0])
        #expect(Array(data.suffix(2)) == [255, 127])
    }
}
