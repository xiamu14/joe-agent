// swift-tools-version: 6.4
import PackageDescription

let package = Package(
    name: "Desktop",
    platforms: [.macOS(.v15)],
    products: [.executable(name: "Joe", targets: ["Desktop"])],
    targets: [
        .executableTarget(name: "Desktop", resources: [.copy("Resources")]),
        .testTarget(name: "DesktopTests", dependencies: ["Desktop"])
    ]
)
