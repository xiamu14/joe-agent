import { joeAgent } from '../joe/agent';
import { Observability, MastraStorageExporter, SensitiveDataFilter } from '@mastra/observability';
import { Mastra } from '@mastra/core/mastra';
import { routes } from '../joe/routes';
import { mastraStorage } from '../joe/memory';

export const mastra = new Mastra({
  storage: mastraStorage,
  agents: { joe: joeAgent },
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'joe',
        // LibSQL supports traces but not batch log storage; console logging remains enabled.
        logging: { enabled: false },
        exporters: [new MastraStorageExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
  server: { host: '127.0.0.1', port: 4111, apiRoutes: routes },
});
