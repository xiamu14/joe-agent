import SwiftUI

struct CardView: View {
    let model: AppModel
    let card: CardID
    let behind: Bool
    var body: some View {
        ZStack {
            ForEach(1...3, id: \.self) { depth in
                RoundedRectangle(cornerRadius: Appearance.radius, style: .continuous)
                    .fill(Appearance.raised.opacity(0.42 - Double(depth) * 0.08))
                    .offset(x: -CGFloat(depth) * 5, y: CGFloat(depth) * 8)
            }
            VStack(spacing: 0) {
                HStack {
                    Text(card.title).font(Appearance.control).foregroundStyle(Appearance.foreground)
                    Spacer()
                    if card == .video, !model.video.directPage {
                        Button(model.video.playing ? "暂停" : "播放", systemImage: model.video.playing ? "pause.fill" : "play.fill") {
                            model.perform(.init(action: model.video.playing ? "pause" : "play"))
                        }
                    }
                    Button(model.workspace.immersive == card ? "还原" : "放大", systemImage: "arrow.up.left.and.arrow.down.right") {
                        model.perform(.init(action: model.workspace.immersive == card ? "exitImmersion" : "immerse", card: card))
                    }
                    Button("关闭", systemImage: "xmark") { model.perform(.init(action: "close", card: card)) }
                }.labelStyle(.iconOnly).buttonStyle(.borderless).padding(14)
                WebSurface(webView: model.browser(card).view)
                    .overlay {
                        if let error = model.browser(card).error {
                            VStack(spacing: 12) {
                                Text(error)
                                Button("重试") { model.browser(card).retry() }
                                Link("浏览器打开", destination: card.url)
                            }.padding().background(.regularMaterial, in: .rect(cornerRadius: 16))
                        }
                    }
            }
            .background(.regularMaterial)
            .background(Appearance.raised.opacity(0.82))
            .clipShape(.rect(cornerRadius: Appearance.radius))
        }
        .compositingGroup()
        .shadow(color: .black.opacity(0.52), radius: behind ? 34 : 24, y: behind ? 22 : 14)
        .shadow(color: Appearance.accent.opacity(behind ? 0 : 0.08), radius: 30, y: 4)
        .overlay {
            if behind {
                Button { model.perform(.init(action: "front", card: card)) } label: { Color.clear.contentShape(.rect) }
                    .buttonStyle(.plain).accessibilityLabel("切到\(card.title)")
            }
        }
    }
}
