import WebKit
import Observation

@MainActor @Observable final class BrowserCard: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    let id: CardID
    let view: WKWebView
    var error: String?
    var ready = false
    var playing = false
    var directPage = false
    private var loaded = false
    private var duckedVolume: Double?

    init(_ id: CardID) {
        self.id = id
        let configuration = WKWebViewConfiguration()
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.websiteDataStore = .default()
        view = WKWebView(frame: .zero, configuration: configuration)
        super.init()
        view.navigationDelegate = self
        view.uiDelegate = self
        if id == .video { configuration.userContentController.add(self, name: "player") }
    }
    func load() {
        guard !loaded else { return }
        loaded = true
        error = nil
        if id == .web { view.load(URLRequest(url: id.url)) }
        else {
            guard let url = Bundle.module.url(forResource: "player", withExtension: "html", subdirectory: "Resources"),
                  let html = try? String(contentsOf: url, encoding: .utf8) else {
                error = "播放器资源缺失"; return
            }
            view.loadHTMLString(html, baseURL: URL(string: "https://www.youtube.com"))
        }
    }
    func retry() { loaded = false; ready = false; directPage = false; load() }
    func waitUntilReady() async throws {
        for _ in 0..<120 {
            try Task.checkCancellation()
            if let error { throw NSError(domain: "Player", code: 1, userInfo: [NSLocalizedDescriptionKey: error]) }
            if ready { return }
            try await Task.sleep(for: .milliseconds(100))
        }
        throw NSError(domain: "Player", code: 2, userInfo: [NSLocalizedDescriptionKey: "内容加载超时"])
    }
    func setPlaying(_ play: Bool) async throws {
        if ready { error = nil }
        load()
        try await waitUntilReady()
        _ = try await view.evaluateJavaScript(play ? "player.playVideo(); null" : "player.pauseVideo(); null")
        for _ in 0..<30 {
            try Task.checkCancellation()
            if playing == play { return }
            try await Task.sleep(for: .milliseconds(100))
        }
        throw NSError(domain: "Player", code: 3, userInfo: [NSLocalizedDescriptionKey: "播放器未确认状态，请手动重试"])
    }
    func duck(_ value: Bool) async throws {
        guard ready else { return }
        if value, duckedVolume == nil, playing {
            duckedVolume = try await view.evaluateJavaScript("player.getVolume()") as? Double
            _ = try await view.evaluateJavaScript("player.setVolume(15); null")
        } else if !value, let volume = duckedVolume {
            duckedVolume = nil
            let current = try await view.evaluateJavaScript("player.getVolume()") as? Double
            if current == 15 { _ = try await view.evaluateJavaScript("player.setVolume(\(volume)); null") }
        }
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let body = message.body as? [String: Any] else { return }
        if body["ready"] as? Bool == true { ready = true }
        if let state = body["state"] as? Int { playing = state == 1 }
        let errorCode = (body["error"] as? NSNumber)?.intValue
        if let code = errorCode, [150, 152].contains(code), !directPage {
            directPage = true
            error = nil
            ready = false
            view.load(URLRequest(url: id.url))
        } else if let code = errorCode {
            error = "视频无法播放（\(code)）"
        }
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if id == .web || directPage { ready = true }
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError failure: Error) {
        error = failure.localizedDescription
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError failure: Error) {
        error = failure.localizedDescription
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { ready = false; error = "网页已中断，请重试" }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
        guard let scheme = navigationAction.request.url?.scheme, ["https", "http", "about"].contains(scheme) else { return .cancel }
        return .allow
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if navigationAction.targetFrame == nil { webView.load(navigationAction.request) }
        return nil
    }
}
