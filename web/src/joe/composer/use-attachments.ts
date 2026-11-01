import { useEffect, useRef, useState } from 'react';
import { api, jsonBody } from '../api';
import type { Attachment } from '../types';

export function useAttachments(sessionId: string, busy: boolean, onError: (message: string) => void) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const generation = useRef(0), abort = useRef<AbortController | null>(null), locked = useRef(false);
  function cancelUpload() {
    generation.current++; abort.current?.abort(); locked.current = false; setUploading(false);
  }
  useEffect(() => {
    cancelUpload(); setAttachments([]);
    return () => { generation.current++; abort.current?.abort(); locked.current = false; };
  }, [sessionId]);
  async function upload(file: File) {
    if (!sessionId || busy || locked.current || attachments.length >= 5) return;
    const image = /\.(png|jpe?g|webp)$/i.test(file.name) || /^image\/(png|jpeg|webp)$/.test(file.type);
    if ((!image && !/\.(txt|md)$/i.test(file.name)) || !file.size || file.size > (image ? 5 : 1) * 1024 * 1024) {
      onError('图片限 5MB，支持 JPG、PNG、WebP；文本限 1MB'); return;
    }
    const current = generation.current;
    locked.current = true; setUploading(true); onError('');
    abort.current = new AbortController();
    try {
      const form = new FormData(); form.set('sessionId', sessionId); form.set('file', file);
      const attachment = await api<Attachment>('/attachments', { method: 'POST', body: form, signal: abort.current.signal });
      if (current === generation.current) setAttachments(old => [...old, attachment]);
    } catch (error) {
      if (current === generation.current) onError(error instanceof Error ? error.message : '上传失败');
    } finally {
      if (current === generation.current) { locked.current = false; setUploading(false); }
    }
  }
  async function removeAttachment(id: string) {
    const current = generation.current;
    try {
      await api('/attachments', jsonBody({ id, sessionId }, 'DELETE'));
      if (current === generation.current) setAttachments(old => old.filter(file => file.id !== id));
    } catch (error) {
      if (current === generation.current) onError(error instanceof Error ? error.message : '移除失败');
    }
  }
  return { attachments, setAttachments, uploading, upload, removeAttachment, cancelUpload };
}
