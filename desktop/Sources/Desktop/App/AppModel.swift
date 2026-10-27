import SwiftUI
import Observation

@MainActor @Observable final class AppModel {
    let workspace = WorkspaceState()
    let window = WindowController()
    let video = BrowserCard(.video)
    let web = BrowserCard(.web)
    let voice = VoiceCapture()
    let speech = SpeechOutput()
    let client = BackendClient()
    var messages: [ChatMessage] = []
    var draft = ""
    var keyboard = false
    var error: String?
    var status = "连接中"
    var session = ""
    var model = ""
    var voiceEnabled = true
    var language = "auto"
    var busy = false
    var attachments: [(id: String, name: String)] = []
    var turn: String?
    var generation = 0
    var task: Task<Void, Never>?
    var cancellation: Task<Void, Never>?
    var playback = PlaybackPolicy()
    var started = false

    func connect() async {
        guard !busy else { return }
        do {
            let bootstrap = try await client.json("bootstrap")
            let settings = bootstrap["settings"] as? [String: Any] ?? [:]
            let models = bootstrap["models"] as? [[String: Any]] ?? []
            model = settings["model"] as? String ?? ""
            if model.isEmpty { model = models.first?["id"] as? String ?? "" }
            voiceEnabled = settings["voice"] as? Bool ?? true
            language = settings["voiceLanguage"] as? String ?? "auto"
            var body: [String: Any] = [:]
            if let id = UserDefaults.standard.string(forKey: "desktop.session") { body["id"] = id }
            let result = try await client.json("session", body: body)
            guard let id = result["id"] as? String else { throw CocoaError(.coderReadCorrupt) }
            session = id; UserDefaults.standard.set(id, forKey: "desktop.session")
            messages = try JSONDecoder().decode([ChatMessage].self, from: JSONSerialization.data(withJSONObject: result["messages"] ?? []))
            error = nil; status = "准备就绪"
            if !started {
                started = true
                voice.onStart = { [weak self] in self?.inputBegan() }
                voice.onAudio = { [weak self] data in self?.transcribe(data) }
                if !UserDefaults.standard.bool(forKey: "desktop.muted") { await toggleMicrophone() }
            }
        } catch { self.error = error.localizedDescription; status = "未连接" }
    }
    func toggleMicrophone() async {
        if voice.listening {
            voice.stop(); UserDefaults.standard.set(true, forKey: "desktop.muted")
            if status == "正在听" { await finishInput() }
        } else {
            keyboard = false
            do { try await voice.start(); UserDefaults.standard.set(false, forKey: "desktop.muted") }
            catch { self.error = error.localizedDescription }
        }
    }
    func interrupt() {
        generation += 1; task?.cancel(); speech.stop()
        if let turn {
            let session = session; let previous = cancellation
            cancellation = Task {
                await previous?.value
                do { _ = try await client.json("cancel", body: ["sessionId": session, "turnId": turn]) }
                catch { self.error = error.localizedDescription }
            }
        }
        turn = nil; busy = false
    }
    func inputBegan() {
        playback.beginInput(wasPlaying: video.playing)
        interrupt(); status = "正在听"
        let current = generation
        Task {
            do {
                guard current == generation else { return }
                if video.ready { try await video.setPlaying(false) }
                try await video.duck(false)
            } catch { self.error = error.localizedDescription }
        }
    }
    func transcribe(_ audio: Data) {
        let current = generation
        task = Task {
            do {
                status = "识别中"
                let result = try await client.upload("transcribe", session: session, name: "voice.wav", field: "audio", mime: "audio/wav", data: audio)
                guard current == generation, !Task.isCancelled else { return }
                let text = result["text"] as? String ?? ""
                if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { await finishInput() }
                else { send(text) }
            } catch {
                guard current == generation, !Task.isCancelled else { return }
                self.error = error.localizedDescription; await finishInput()
            }
        }
    }
    func finishInput() async {
        let current = generation
        busy = false; status = "准备就绪"
        do {
            try await video.duck(false)
            guard current == generation else { return }
            if playback.endTurn(videoVisible: workspace.cards.contains(.video)) { try await video.setPlaying(true) }
        } catch { self.error = error.localizedDescription }
    }
    func browser(_ id: CardID) -> BrowserCard { id == .video ? video : web }
}
