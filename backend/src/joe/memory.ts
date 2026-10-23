import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { dataDirectory } from './data-directory';

const directory = dataDirectory();
mkdirSync(directory, { recursive: true });
export const mastraStorage = new LibSQLStore({
  id: 'joe-storage',
  url: `file:${resolve(directory, 'mastra.db')}`,
});
export const resourceId = 'joe-local-user';
export const joeMemory = new Memory({
  storage: mastraStorage,
  options: {
    lastMessages: 30,
    semanticRecall: false,
    generateTitle: false,
    workingMemory: {
      enabled: true,
      scope: 'resource',
      template: `# 用户长期偏好\n- 称呼：\n- 语言与回答偏好：\n- 用户明确要求记住的长期信息：\n`,
    },
  },
});
