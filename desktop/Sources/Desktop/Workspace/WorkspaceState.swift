import Foundation
import Observation

@MainActor @Observable final class WorkspaceState {
    var cards: [CardID] = []
    var parallel = false
    var immersive: CardID?
    private var priorCards: [CardID] = []
    private var priorParallel = false
    var front: CardID? { cards.last }

    func open(_ card: CardID, retain: Bool) {
        exitImmersion()
        if !retain { cards = cards.filter { $0 == card } }
        bringForward(card)
        if cards.count < 2 { parallel = false }
    }
    func bringForward(_ card: CardID) {
        cards.removeAll { $0 == card }
        cards.append(card)
    }
    func close(_ card: CardID) {
        cards.removeAll { $0 == card }
        if immersive == card { exitImmersion() }
        if cards.count < 2 { parallel = false }
    }
    func closeAll() { cards = []; immersive = nil; parallel = false; priorCards = [] }
    func immerse(_ card: CardID) {
        guard cards.contains(card) else { return }
        if immersive == nil { priorCards = cards; priorParallel = parallel }
        immersive = card
    }
    func exitImmersion() {
        guard immersive != nil else { return }
        cards = priorCards.filter { cards.contains($0) } + cards.filter { !priorCards.contains($0) }
        parallel = priorParallel && cards.count == 2
        immersive = nil
    }
    func snapshot(playing: Bool) -> [String: Any] {
        ["cards": cards.map(\.rawValue), "layout": parallel ? "parallel" : "stack",
         "immersive": immersive?.rawValue as Any? ?? NSNull(), "playing": playing]
    }
}
