import Foundation

enum CardID: String, Codable, CaseIterable, Identifiable {
    case video, web
    var id: String { rawValue }
    var title: String { self == .video ? "视频" : "网页" }
    var url: URL { URL(string: self == .video ? "https://www.youtube.com/watch?v=nKVZBKoB6P4" : "https://x.com/home")! }
}
