import SwiftUI
import WebKit

struct OrbView: NSViewRepresentable {
    let status: String
    let compact: Bool
    let reduceMotion: Bool
    func makeNSView(context: Context) -> WKWebView {
        let view = WKWebView()
        view.setValue(false, forKey: "drawsBackground")
        if let url = Bundle.module.url(forResource: "orb", withExtension: "html", subdirectory: "Resources") {
            view.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        return view
    }
    func updateNSView(_ view: WKWebView, context: Context) {
        let active = status == "正在听" || status == "说话中"
        view.evaluateJavaScript("window.orbUpdate?.(\(active ? 1.25 : 1.0), \(reduceMotion))", completionHandler: nil)
    }
}
