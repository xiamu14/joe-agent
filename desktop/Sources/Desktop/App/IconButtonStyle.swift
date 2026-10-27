import SwiftUI

struct IconButtonStyle: ButtonStyle {
    var active = false
    var size: CGFloat = 44
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: size * 0.41, weight: .medium))
            .frame(width: size, height: size)
            .foregroundStyle(active ? Color.white : Appearance.secondary)
            .background(active ? Appearance.accent : Appearance.raised, in: .circle)
            .opacity(configuration.isPressed ? 0.75 : 1)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.95 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.15), value: configuration.isPressed)
    }
}
