import SwiftUI

@main struct DesktopApp: App {
    @State private var model = AppModel()
    init() { Appearance.registerFonts() }
    var body: some Scene {
        Window("Joe", id: "main") {
            WorkspaceView(model: model)
                .task { await model.connect() }
        }
        .defaultSize(width: 360, height: 600)
        .windowStyle(.hiddenTitleBar)
        .commands {
            CommandMenu("卡片") {
                Button("打开视频") { model.perform(.init(action: "open", card: .video, retain: true)) }
                Button("打开网页") { model.perform(.init(action: "open", card: .web, retain: true)) }
                Button("并排显示") { model.perform(.init(action: "parallel")) }
                Button("全部关闭") { model.perform(.init(action: "closeAll")) }.keyboardShortcut("w", modifiers: [.command, .shift])
            }
        }
    }
}
