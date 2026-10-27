import SwiftUI

struct ConversationView: View {
    let messages: [ChatMessage]
    private var visibleMessages: [ChatMessage] {
        messages.filter { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    var body: some View {
        GeometryReader { outer in
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 4) {
                        ForEach(visibleMessages) { message in
                            ChatItem(message: message, viewportHeight: outer.size.height)
                                .id(message.id)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, outer.size.height * 0.2)
                }
                .coordinateSpace(name: "chat-scroll")
                .scrollIndicators(.hidden)
                .onChange(of: messages.last?.text) {
                    if let id = visibleMessages.last?.id {
                        withAnimation(.easeOut(duration: 0.32)) { proxy.scrollTo(id, anchor: .center) }
                    }
                }
            }
        }
    }
}

private struct ChatItem: View {
    let message: ChatMessage
    let viewportHeight: CGFloat
    private var displayText: String {
        message.text.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        GeometryReader { frame in
            let distance = min(1, abs(frame.frame(in: .named("chat-scroll")).midY - viewportHeight / 2) / max(1, viewportHeight / 2))
            let focus = distance <= 0.6 ? 1 : max(0, 1 - (distance - 0.6) * 2.5)
            Text(displayText)
                .font(Appearance.bodySemibold)
                .foregroundStyle(message.role == "user" ? Appearance.accent : Appearance.foreground)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
                .lineLimit(2)
                .frame(width: max(180, frame.size.width * 0.6))
                .frame(height: 40, alignment: .center)
                .frame(maxWidth: .infinity)
                .scaleEffect(0.94 + focus * 0.06)
                .opacity(0.68 + focus * 0.32)
                .blur(radius: max(0, (distance - 0.6) * 4))
                .animation(.easeOut(duration: 0.24), value: focus)
        }
        .frame(height: 40)
    }
}
