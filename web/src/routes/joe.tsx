import { createFileRoute } from '@tanstack/react-router';
import { JoePage } from '../joe/joe-page';
export const Route = createFileRoute('/joe')({
  head: () => ({ meta: [{ name: 'theme-color', content: '#b5c7d7' }] }),
  component: JoePage,
});
