import SwiftUI
import QuartzCore

@MainActor final class WindowController {
    weak var window: NSWindow?
    private var baseSize: NSSize?
    private var immersionSize: NSSize?
    private var lastAutomatic: NSSize?
    var reduceMotion = false

    var manuallyChanged: Bool {
        guard let window, let lastAutomatic else { return false }
        return abs(window.frame.width - lastAutomatic.width) > 2 || abs(window.frame.height - lastAutomatic.height) > 2
    }
    func resize(width: Double, height: Double) {
        guard let window, let visible = window.screen?.visibleFrame else { return }
        var frame = window.frameRect(forContentRect: NSRect(x: 0, y: 0, width: width, height: height))
        frame.size.width = min(frame.width, visible.width)
        frame.size.height = min(frame.height, visible.height)
        frame.origin = NSPoint(x: max(visible.minX, min(window.frame.midX - frame.width / 2, visible.maxX - frame.width)),
                               y: max(visible.minY, min(window.frame.midY - frame.height / 2, visible.maxY - frame.height)))
        if reduceMotion {
            window.setFrame(frame, display: true, animate: false)
        } else {
            NSAnimationContext.runAnimationGroup { context in
                context.duration = 0.42
                context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
                window.animator().setFrame(frame, display: true)
            }
        }
        lastAutomatic = frame.size
    }
    func layout(_ state: WorkspaceState) {
        guard let window else { return }
        if state.cards.isEmpty {
            if !manuallyChanged, let baseSize { restore(baseSize) }
            baseSize = nil; immersionSize = nil
            return
        }
        if baseSize == nil { baseSize = window.frame.size }
        if state.immersive != nil {
            if immersionSize == nil { immersionSize = window.frame.size }
            resize(width: 1080, height: 820)
        } else if let previous = immersionSize {
            immersionSize = nil
            if !manuallyChanged { restore(previous) }
        } else if state.parallel {
            if (window.screen?.visibleFrame.width ?? 0) < 1040 { state.parallel = false }
            else { resize(width: 1180, height: 900) }
        } else if state.cards.contains(.video) {
            resize(width: 960, height: 640)
        } else {
            resize(width: 760, height: 700)
        }
    }
    private func restore(_ size: NSSize) {
        guard let window else { return }
        let content = window.contentRect(forFrameRect: NSRect(origin: .zero, size: size))
        resize(width: content.width, height: content.height)
    }
}
