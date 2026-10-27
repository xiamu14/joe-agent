import Foundation

enum WaveAudio {
    static func encode(_ samples: [Float], sampleRate: UInt32) -> Data {
        var data = Data()
        func text(_ value: String) { data.append(Data(value.utf8)) }
        func number<T: FixedWidthInteger>(_ value: T) {
            var little = value.littleEndian
            withUnsafeBytes(of: &little) { data.append(contentsOf: $0) }
        }
        let size = UInt32(samples.count * 2)
        text("RIFF"); number(size + 36); text("WAVEfmt "); number(UInt32(16))
        number(UInt16(1)); number(UInt16(1)); number(sampleRate); number(sampleRate * 2)
        number(UInt16(2)); number(UInt16(16)); text("data"); number(size)
        for value in samples { number(Int16(max(-1, min(1, value)) * 32767)) }
        return data
    }
}
