import AVFoundation
import Observation

@MainActor @Observable final class VoiceCapture {
    var listening = false
    var level: Float = 0
    var onStart: (() -> Void)?
    var onAudio: ((Data) -> Void)?
    var onError: ((String) -> Void)?
    private let engine = AVAudioEngine()
    private var samples: [Float] = []
    private var preRoll: [Float] = []
    private var sampleRate: Double = 48000
    private var speaking = false
    private var silence = 0.0

    func start() async throws {
        guard !listening else { return }
        guard await AVCaptureDevice.requestAccess(for: .audio) else {
            throw NSError(domain: "Microphone", code: 1, userInfo: [NSLocalizedDescriptionKey: "请在系统设置允许麦克风"])
        }
        let input = engine.inputNode
        try input.setVoiceProcessingEnabled(true)
        let format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0 else { throw CocoaError(.featureUnsupported) }
        sampleRate = format.sampleRate
        let sampleHandler: @Sendable ([Float]) -> Void = { [weak self] values in
            Task { @MainActor in self?.consume(values) }
        }
        Self.installTap(on: input, format: format, handler: sampleHandler)
        do { try engine.start(); listening = true }
        catch { input.removeTap(onBus: 0); throw error }
    }
    func stop() {
        guard listening else { return }
        listening = false
        engine.stop(); engine.inputNode.removeTap(onBus: 0)
        samples = []; preRoll = []; speaking = false; silence = 0; level = 0
    }

    private nonisolated static func installTap(
        on input: AVAudioInputNode,
        format: AVAudioFormat,
        handler: @escaping @Sendable ([Float]) -> Void
    ) {
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            guard let channel = buffer.floatChannelData?[0] else { return }
            let values = Array(UnsafeBufferPointer(start: channel, count: Int(buffer.frameLength)))
            handler(values)
        }
    }
    private func consume(_ values: [Float]) {
        guard listening, !values.isEmpty else { return }
        level = sqrt(values.reduce(0) { $0 + $1 * $1 } / Float(values.count))
        let duration = Double(values.count) / sampleRate
        if !speaking {
            preRoll.append(contentsOf: values)
            if preRoll.count > Int(sampleRate * 0.25) { preRoll.removeFirst(preRoll.count - Int(sampleRate * 0.25)) }
            // shortcut: fixed activity threshold; calibrate on the target microphone before shipping.
            guard level > 0.025 else { return }
            speaking = true; samples = preRoll; preRoll = []; onStart?()
        } else { samples.append(contentsOf: values) }
        silence = level > 0.018 ? 0 : silence + duration
        if silence >= 1 || samples.count >= Int(sampleRate * 45) {
            let audio = WaveAudio.encode(samples, sampleRate: UInt32(sampleRate))
            samples = []; speaking = false; silence = 0
            onAudio?(audio)
        }
    }
}
