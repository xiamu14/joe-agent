import AVFoundation

@MainActor final class SpeechOutput {
    private var player: AVAudioPlayer?
    func stop() { player?.stop(); player = nil }
    func speak(client: BackendClient, session: String, turn: String, language: String) async throws {
        let speech = try await client.json("speech-text", body: ["sessionId": session, "turnId": turn, "language": language])
        guard let text = speech["text"] as? String, let selected = speech["language"] as? String else { return }
        var remaining = text[...]
        while !remaining.isEmpty {
            try Task.checkCancellation()
            let chunk = String(remaining.prefix(1000))
            remaining = remaining.dropFirst(chunk.count)
            let data = try await client.data("speech", body: ["sessionId": session, "turnId": turn, "text": chunk, "language": selected])
            try Task.checkCancellation()
            let audio = try AVAudioPlayer(data: data)
            player = audio
            guard audio.play() else { throw CocoaError(.fileReadCorruptFile) }
            while audio.isPlaying { try await Task.sleep(for: .milliseconds(50)) }
        }
    }
}
