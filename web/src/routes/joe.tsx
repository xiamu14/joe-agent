import { createFileRoute } from '@tanstack/react-router';
import { StaticWorkspace } from '../joe/static-workspace';

export const Route = createFileRoute('/joe')({
  head: () => ({ meta: [{ name: 'theme-color', content: '#111114' }, { title: 'Joe.全能情绪伙伴' }] }),
  component: StaticWorkspace,
});
