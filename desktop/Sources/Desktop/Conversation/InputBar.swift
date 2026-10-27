import SwiftUI
import UniformTypeIdentifiers

struct InputBar: View {
    @Bindable var model: AppModel
    @State private var importing = false
    var body: some View {
        VStack(spacing: 10) {
            if !model.attachments.isEmpty {
                HStack { ForEach(model.attachments, id: \.id) { item in
                    Button(item.name, systemImage: "xmark.circle") { model.attachments.removeAll { $0.id == item.id } }
                }}.font(.callout)
            }
            HStack(spacing: 12) {
                Button("添加文件", systemImage: "plus") { importing = true }.disabled(model.session.isEmpty)
                    .buttonStyle(IconButtonStyle(size: model.keyboard ? 36 : 44))
                Button(model.voice.listening ? "静音" : "接听", systemImage: model.voice.listening ? "mic.fill" : "mic.slash") {
                    Task { await model.toggleMicrophone() }
                }.buttonStyle(IconButtonStyle(active: model.voice.listening, size: model.keyboard ? 36 : 44))
                if model.keyboard {
                    TextField("What can I do?", text: $model.draft, axis: .vertical)
                        .textFieldStyle(.plain)
                        .font(Appearance.bodySemibold)
                        .foregroundStyle(Appearance.foreground)
                        .lineLimit(1...4)
                        .layoutPriority(1)
                        .onSubmit { model.send(model.draft); model.keyboard = false }
                        .onExitCommand { model.keyboard = false }
                    Button("发送", systemImage: "arrow.up") { model.send(model.draft); model.keyboard = false }
                        .labelStyle(.iconOnly)
                        .buttonStyle(IconButtonStyle(active: true, size: 36))
                } else {
                    Button("键盘输入", systemImage: "keyboard") { model.keyboard = true }
                        .buttonStyle(IconButtonStyle())
                }
            }
            .labelStyle(.iconOnly)
            .padding(8)
            .background(Appearance.background.opacity(0.4), in: .capsule)
        }.padding(.horizontal, 24).padding(.bottom, 20)
            .fileImporter(isPresented: $importing, allowedContentTypes: [.plainText], allowsMultipleSelection: true) { result in
                switch result {
                case .success(let urls): Task { await model.attach(urls) }
                case .failure(let error): model.error = error.localizedDescription
                }
            }
    }
}
