import SwiftUI

struct WorkspaceView: View {
    @Bindable var model: AppModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Joe").font(Appearance.title).tracking(-0.6)
                Spacer()
                Text(model.status).font(Appearance.control).foregroundStyle(Appearance.secondary)
                if model.busy { Button("停止", systemImage: "stop.fill") { model.interrupt(); Task { await model.finishInput() } }.labelStyle(.iconOnly) }
            }.padding(.horizontal, 24).padding(.top, 16)
            ZStack {
                OrbView(status: model.status, compact: !model.workspace.cards.isEmpty, reduceMotion: reduceMotion)
                    .frame(height: 120)
                CardDeck(model: model)
            }
            .frame(height: model.workspace.cards.isEmpty ? 140 : 320)
            if !model.messages.isEmpty {
                ConversationView(messages: model.messages)
                    .frame(maxWidth: model.workspace.cards.isEmpty ? .infinity : 360)
                    .frame(maxHeight: .infinity)
            } else {
                Spacer(minLength: 0)
            }
            if let error = model.error {
                HStack {
                    Text(error).font(.callout).textSelection(.enabled)
                    Spacer()
                    Button("重试") { Task { await model.connect() } }
                    Button("关闭", systemImage: "xmark") { model.error = nil }.labelStyle(.iconOnly)
                }.padding(.horizontal, 20)
            }
            InputBar(model: model)
        }
        .background(Appearance.surface)
        .foregroundStyle(Appearance.foreground)
        .font(Appearance.body)
        .tint(Appearance.accent)
        .preferredColorScheme(.dark)
        .background { WindowReader(controller: model.window) }
        .frame(minWidth: 320, minHeight: 480)
        .animation(reduceMotion ? nil : .spring(response: 0.48, dampingFraction: 0.86), value: model.workspace.cards)
        .animation(reduceMotion ? nil : .spring(response: 0.48, dampingFraction: 0.86), value: model.workspace.parallel)
        .animation(reduceMotion ? nil : .spring(response: 0.48, dampingFraction: 0.86), value: model.workspace.immersive)
        .onChange(of: reduceMotion, initial: true) { model.window.reduceMotion = reduceMotion }
    }
}
