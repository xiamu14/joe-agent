import { createFileRoute } from '@tanstack/react-router';
import { StaticWorkspace } from '../joe/static-workspace';

export const Route = createFileRoute('/joe')({
  head: () => ({ meta: [{ name: 'theme-color', content: '#090909' }, { title: 'Joe · 想法，自有空间' }] }),
  component: StaticWorkspace,
});
