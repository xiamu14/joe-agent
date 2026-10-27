import SwiftUI
import CoreText

enum Appearance {
    // Measured from rareui.com on 2026-10-26; see docs/native-app/visual-reference.md.
    static let background = Color.black
    static let surface = Color(red: 18 / 255, green: 18 / 255, blue: 18 / 255)
    static let raised = Color(red: 23 / 255, green: 23 / 255, blue: 23 / 255)
    static let foreground = Color(red: 229 / 255, green: 229 / 255, blue: 229 / 255)
    static let secondary = Color(red: 163 / 255, green: 163 / 255, blue: 163 / 255)
    static let accent = Color(red: 247 / 255, green: 80 / 255, blue: 1 / 255)
    static let body = Font.custom("Inter-Regular", size: 16, relativeTo: .body)
    static let bodySemibold = Font.custom("Inter-Medium", size: 16, relativeTo: .body)
    static let control = Font.custom("Inter-Medium", size: 14, relativeTo: .callout)
    static let title = Font.custom("OpenRunde-Bold", size: 24, relativeTo: .title2)
    static let radius = 32.0

    static func registerFonts() {
        for name in ["Inter-Regular", "Inter-Medium", "OpenRunde-Bold"] {
            guard let url = Bundle.module.url(forResource: name, withExtension: "otf", subdirectory: "Resources/Fonts") else { continue }
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
    }
}
