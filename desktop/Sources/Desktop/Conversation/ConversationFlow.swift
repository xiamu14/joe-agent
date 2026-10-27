import Foundation

extension AppModel {
    func send(_ text: String) {
        guard !session.isEmpty, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !attachments.isEmpty else { return }
        interrupt()
        let current = generation
        let turnID = UUID().uuidString
        turn = turnID; busy = true; status = "思考中"; error = nil
        let files = attachments
        let body: [String: Any] = ["sessionId": session, "turnId": turnID, "model": model,
                                  "text": text, "attachmentIds": files.map(\.id),
                                  "desktop": workspace.snapshot(playing: video.playing)]
        task = Task {
            await cancellation?.value
            guard current == generation, !Task.isCancelled else { return }
            do {
                if let command = localDesktopCommand(for: text) {
                    try await execute(command)
                }
                let (bytes, response) = try await URLSession.shared.bytes(for: client.request("chat", body: body))
                try BackendClient.validate(response)
                var completed = false
                for try await line in bytes.lines {
                    try Task.checkCancellation()
                    guard current == generation else { return }
                    guard line.hasPrefix("data: "), let data = line.dropFirst(6).data(using: .utf8),
                          let event = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { continue }
                    if event["type"] as? String == "text-delta", let delta = event["delta"] as? String,
                       let index = messages.lastIndex(where: { $0.turnId == turnID && $0.role == "assistant" }) {
                        messages[index].text += delta
                    }
                    if event["type"] as? String == "error" { throw CocoaError(.fileReadUnknown) }
                    guard let payload = event["data"] as? [String: Any], payload["turnId"] as? String == turnID else { continue }
                    switch payload["type"] as? String {
                    case "messages":
                        for key in ["user", "assistant"] {
                            if let value = payload[key] {
                                let message = try JSONDecoder().decode(ChatMessage.self, from: JSONSerialization.data(withJSONObject: value))
                                messages.append(message)
                            }
                        }
                        draft = ""; attachments = []
                    case "desktop.action":
                        guard let id = payload["id"] as? String, let raw = payload["command"] else { continue }
                        let command = try JSONDecoder().decode(DesktopCommand.self, from: JSONSerialization.data(withJSONObject: raw))
                        var ok = true; var detail = "已完成"
                        do { try await execute(command) }
                        catch { ok = false; detail = error.localizedDescription }
                        guard current == generation, !Task.isCancelled else { return }
                        _ = try await client.json("desktop-result", body: ["sessionId": session, "turnId": turnID, "id": id,
                            "ok": ok, "detail": detail, "state": workspace.snapshot(playing: video.playing)])
                    case "error": self.error = payload["message"] as? String
                    case "message.completed":
                        if let raw = payload["message"] {
                            let message = try JSONDecoder().decode(ChatMessage.self, from: JSONSerialization.data(withJSONObject: raw))
                            if let index = messages.firstIndex(where: { $0.id == message.id }) { messages[index] = message }
                            completed = message.status == "complete"
                        }
                    default: break
                    }
                }
                try Task.checkCancellation()
                guard current == generation else { return }
                if completed && voiceEnabled {
                    status = "说话中"
                    try await video.duck(true)
                    try await speech.speak(client: client, session: session, turn: turnID, language: language)
                }
            } catch {
                guard current == generation, !Task.isCancelled else { return }
                self.error = error.localizedDescription
                if draft.isEmpty && !messages.contains(where: { $0.turnId == turnID && $0.role == "user" }) {
                    draft = text; attachments = files
                }
            }
            guard current == generation, !Task.isCancelled else { return }
            turn = nil; await finishInput()
        }
    }

    private func localDesktopCommand(for text: String) -> DesktopCommand? {
        let normalized = text.lowercased()
        if normalized.contains("youtube") || normalized.contains("视频") || normalized.contains("video") {
            return DesktopCommand(action: "open", card: .video, retain: true)
        }
        if normalized.contains("x.com") || normalized.contains("twitter") {
            return DesktopCommand(action: "open", card: .web, retain: true)
        }
        return nil
    }
}
