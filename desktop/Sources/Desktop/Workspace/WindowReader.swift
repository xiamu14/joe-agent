import SwiftUI

struct WindowReader: NSViewRepresentable {
    let controller: WindowController
    func makeNSView(context: Context) -> NSView {
        let view = NSView()
        Task { @MainActor in
            for _ in 0..<20 {
                if let window = view.window {
                    controller.window = window
                    window.isOpaque = true
                    window.backgroundColor = NSColor(Appearance.surface)
                    window.contentView?.wantsLayer = true
                    window.contentView?.layer?.backgroundColor = NSColor(Appearance.surface).cgColor
                    window.contentView?.superview?.wantsLayer = true
                    window.contentView?.superview?.layer?.backgroundColor = NSColor(Appearance.surface).cgColor
                    window.titlebarAppearsTransparent = true
                    window.titleVisibility = .hidden
                    controller.resize(width: 360, height: 600)
                    return
                }
                try? await Task.sleep(for: .milliseconds(50))
            }
        }
        return view
    }
    func updateNSView(_ nsView: NSView, context: Context) {}
}
