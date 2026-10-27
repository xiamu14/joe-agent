import Foundation

struct DesktopCommand: Codable, Equatable {
    var action: String
    var card: CardID?
    var retain: Bool?
    var width: Double?
    var height: Double?
}
