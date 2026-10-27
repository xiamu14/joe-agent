import Foundation

extension AppModel {
    func execute(_ command: DesktopCommand) async throws {
        try Task.checkCancellation()
        let card = command.card ?? workspace.immersive ?? workspace.front
        switch command.action {
        case "open":
            guard let card = command.card else { throw CocoaError(.coderInvalidValue) }
            if card != .video && command.retain != true && workspace.cards.contains(.video) {
                playback.explicitChange()
                if video.ready { try await video.setPlaying(false) }
            }
            workspace.open(card, retain: command.retain == true)
            browser(card).load(); window.layout(workspace)
            try await browser(card).waitUntilReady()
        case "close", "closeAll":
            if command.action == "closeAll" || card == .video {
                playback.explicitChange()
                if video.ready { try await video.setPlaying(false) }
            }
            if command.action == "closeAll" { workspace.closeAll() }
            else if let card { workspace.close(card) }
        case "front": if let card, workspace.cards.contains(card) { workspace.bringForward(card) }
        case "parallel", "stack":
            workspace.exitImmersion()
            workspace.parallel = command.action == "parallel" && workspace.cards.count == 2
        case "immerse": if let card { workspace.immerse(card) }
        case "exitImmersion": workspace.exitImmersion()
        case "play", "pause":
            guard workspace.cards.contains(.video) else { throw NSError(domain: "Desktop", code: 1, userInfo: [NSLocalizedDescriptionKey: "请先打开视频"] ) }
            playback.explicitChange()
            try await video.setPlaying(command.action == "play")
        case "resize":
            guard let width = command.width, let height = command.height,
                  width.isFinite, height.isFinite, (320...2400).contains(width), (480...1800).contains(height) else { throw CocoaError(.coderInvalidValue) }
            window.resize(width: width, height: height)
            return
        default: throw CocoaError(.coderInvalidValue)
        }
        window.layout(workspace)
    }
    func perform(_ command: DesktopCommand) {
        interrupt()
        Task {
            do { try await execute(command); await finishInput() }
            catch { self.error = error.localizedDescription }
        }
    }
    func attach(_ urls: [URL]) async {
        for url in urls {
            guard attachments.count < 5 else { error = "每轮最多五个文件"; return }
            let access = url.startAccessingSecurityScopedResource()
            defer { if access { url.stopAccessingSecurityScopedResource() } }
            do {
                let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
                guard size > 0, size <= 1024 * 1024, ["md", "txt"].contains(url.pathExtension.lowercased()) else {
                    throw NSError(domain: "File", code: 1, userInfo: [NSLocalizedDescriptionKey: "仅支持 1MB 内的文本文件"])
                }
                let data = try Data(contentsOf: url)
                guard let text = String(data: data, encoding: .utf8), text.utf16.count <= 60000, !text.contains("\0") else {
                    throw CocoaError(.fileReadInapplicableStringEncoding)
                }
                let result = try await client.upload("attachments", session: session, name: url.lastPathComponent,
                                                     field: "file", mime: "text/plain", data: data)
                if let id = result["id"] as? String { attachments.append((id, url.lastPathComponent)) }
            } catch { self.error = error.localizedDescription }
        }
    }
}
