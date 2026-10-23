import { ZodError } from 'zod';

// Do not forward provider bodies: they may contain credentials or user content.
export class VoiceHttpError extends Error {
  constructor(
    readonly status: number,
    readonly provider = 'Fish',
    readonly code = '',
    readonly requestId = '',
  ) {
    super(`${provider} HTTP ${status}`);
  }
}

export function voiceError(error: unknown, action: string, provider = 'Fish'): Error {
  if (error instanceof VoiceHttpError) {
    provider = error.provider;
    const reasons: Record<number, string> = {
      400: '音频或请求参数不被接受，请重新录音',
      401: 'API Token 无效或已过期，请检查后端凭据',
      402:
        provider === 'Fish'
          ? 'API 额度不足。API 额度与网站平台额度独立，请前往 fish.audio/app/developers 查看或充值'
          : 'API 额度不足，请查看 ElevenLabs 账户额度或订阅',
      403: '当前 API 凭据没有访问此服务或音色的权限，请检查套餐及音色权限',
      404: '请求的服务或模型不存在，请检查模型配置',
      413: '音频文件超过供应商大小限制，请缩短录音',
      415: '供应商不支持当前音频格式',
      422: '音频或请求参数校验失败，请检查模型配置或重新录音',
      429: '请求过于频繁或超过并发限制，请稍后重试',
    };
    const codes: Record<string, string> = {
      quota_exceeded: 'API 额度不足，请查看账户额度或订阅',
      paid_plan_required: '此功能或音色需要付费套餐，请更换音色或检查订阅',
      voice_not_found: '音色不存在或无访问权限，请检查音色 ID',
      missing_permissions: 'API Key 缺少此操作所需权限',
    };
    const reason =
      codes[error.code] ??
      reasons[error.status] ??
      (error.status >= 500 ? `${provider} 服务暂不可用，请稍后重试` : '供应商拒绝了请求');
    const trace = error.requestId ? ` · TraceID: ${error.requestId}` : '';
    return new Error(`${action}失败（${provider} HTTP ${error.status}）：${reason}${trace}`);
  }
  if (error instanceof Error && error.name === 'TimeoutError') return new Error(`${action}超时，请稍后重试`);
  if (error instanceof Error && error.name === 'AbortError') return new Error(`${action}已取消`);
  if (error instanceof ZodError || error instanceof SyntaxError)
    return new Error(`${action}失败：${provider} 返回的数据格式异常`);
  return new Error(`${action}失败：无法完成 ${provider} 请求，请检查网络连接或稍后重试`);
}
