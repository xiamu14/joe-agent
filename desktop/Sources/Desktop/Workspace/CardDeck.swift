import SwiftUI

struct CardDeck: View {
    let model: AppModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        GeometryReader { geometry in
            let state = model.workspace
            let parallel = state.parallel && geometry.size.width >= 1000 && state.immersive == nil
            ZStack {
                ForEach(CardID.allCases) { card in
                    let visible = state.cards.contains(card) && (state.immersive == nil || state.immersive == card)
                    let back = !parallel && state.front != card && state.immersive == nil
                    let index = state.cards.firstIndex(of: card) ?? 0
                    CardView(model: model, card: card, behind: back)
                        .frame(width: parallel ? (geometry.size.width - 60) / 2 : max(320, geometry.size.width - 64),
                               height: max(220, geometry.size.height - (back ? 54 : 28)))
                        .scaleEffect(back && !reduceMotion ? 0.92 : 1)
                        .rotation3DEffect(.degrees(reduceMotion ? 0 : (back ? -9 : 2)), axis: (x: 0, y: 1, z: 0), perspective: 0.55)
                        .offset(x: parallel ? (index == 0 ? -1 : 1) * (geometry.size.width / 4) : (back ? 22 : -8),
                                y: back ? -20 : 10)
                        .opacity(visible ? 1 : 0)
                        .allowsHitTesting(visible)
                        .accessibilityHidden(!visible)
                        .zIndex(state.immersive == card ? 3 : Double(index))
                }
            }.frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}
