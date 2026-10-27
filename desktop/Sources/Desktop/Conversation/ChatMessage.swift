import Foundation

struct ChatMessage: Codable, Identifiable {
    var id: String
    var turnId: String
    var role: String
    var text: String
    var status: String
}
