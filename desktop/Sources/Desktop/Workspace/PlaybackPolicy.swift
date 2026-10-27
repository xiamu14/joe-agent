import Foundation

struct PlaybackPolicy {
    private(set) var resumeAfterTurn = false
    mutating func beginInput(wasPlaying: Bool) { resumeAfterTurn = resumeAfterTurn || wasPlaying }
    mutating func explicitChange() { resumeAfterTurn = false }
    mutating func endTurn(videoVisible: Bool) -> Bool {
        defer { resumeAfterTurn = false }
        return resumeAfterTurn && videoVisible
    }
}
