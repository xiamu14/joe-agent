import { TranscriptTurn, type InputCallbacks } from './turn';
export async function startRealtime(
  stream: MediaStream,
  context: AudioContext,
  token: string,
  callbacks: InputCallbacks,
) {
  if (![8000, 16000, 22050, 24000, 44100, 48000].includes(context.sampleRate))
    throw new Error('当前音频采样率不受支持');
  await context.audioWorklet.addModule('/pcm-capture.js');
  if (context.state === 'closed') throw new DOMException('Cancelled', 'AbortError');
  const query = new URLSearchParams({
    token,
    model_id: 'scribe_v2_realtime',
    audio_format: `pcm_${context.sampleRate}`,
    commit_strategy: 'vad',
    vad_silence_threshold_secs: '1',
    min_speech_duration_ms: '250',
    min_silence_duration_ms: '100',
  });
  const socket = new WebSocket(`wss://api.elevenlabs.io/v1/speech-to-text/realtime?${query}`);
  const source = context.createMediaStreamSource(stream);
  const capture = new AudioWorkletNode(context, 'pcm-capture');
  const mute = context.createGain();
  mute.gain.value = 0;
  const turn = new TranscriptTurn();
  let closed = false,
    ready = false;
  const connectTimeout = setTimeout(() => fail('实时语音连接超时，请重试'), 15000);
  function cleanup() {
    if (closed) return;
    closed = true;
    clearTimeout(connectTimeout);
    capture.port.onmessage = null;
    source.disconnect();
    capture.disconnect();
    mute.disconnect();
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;
    socket.close();
  }
  function fail(message: string) {
    if (closed) return;
    cleanup();
    callbacks.error(message);
  }
  capture.port.onmessage = (event) => {
    if (closed || !ready || socket.readyState !== WebSocket.OPEN) return;
    if (socket.bufferedAmount > 1024 * 1024) {
      fail('网络发送过慢，请重新开始语音输入');
      return;
    }
    const data = new Uint8Array(event.data as ArrayBuffer);
    let binary = '';
    for (const byte of data) binary += String.fromCharCode(byte);
    socket.send(
      JSON.stringify({
        message_type: 'input_audio_chunk',
        audio_base_64: btoa(binary),
        sample_rate: context.sampleRate,
      }),
    );
  };
  socket.onmessage = (event) => {
    if (closed) return;
    try {
      const data = JSON.parse(event.data);
      if (data.message_type === 'session_started') {
        ready = true;
        clearTimeout(connectTimeout);
        source.connect(capture);
        capture.connect(mute);
        mute.connect(context.destination);
        callbacks.ready?.();
        return;
      }
      const result = turn.accept(data.message_type, data.text);
      if (result) {
        if (result.final) {
          callbacks.final(result.text);
        } else callbacks.partial(result.text);
      } else if (
        data.message_type !== 'warning' &&
        !['partial_transcript', 'committed_transcript'].includes(data.message_type)
      ) {
        fail('实时转写服务返回错误，请检查实时语音权限、额度或网络后重试');
      }
    } catch {
      fail('实时转写响应异常，请重试');
    }
  };
  socket.onerror = () => fail('无法连接实时语音服务，请检查网络或 API 权限');
  socket.onclose = () => fail('实时语音连接中断，未自动发送不完整文字');
  return cleanup;
}
