import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import appCss from '../style.css?url';

const scrollbars = [
  '[&,&_*]:[scrollbar-width:thin] [&,&_*]:[scrollbar-color:rgba(255,255,255,0.32)_rgba(90,100,112,0.16)]',
  '[@supports(selector(::-webkit-scrollbar))]:[&,&_*]:[scrollbar-width:auto] [@supports(selector(::-webkit-scrollbar))]:[&,&_*]:[scrollbar-color:auto]',
  '[&::-webkit-scrollbar,&_*::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar,&_*::-webkit-scrollbar]:h-3',
  '[&::-webkit-scrollbar-track,&_*::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track,&_*::-webkit-scrollbar-track]:bg-slate-600/15 [&::-webkit-scrollbar-track,&_*::-webkit-scrollbar-track]:my-3',
  '[&::-webkit-scrollbar-thumb,&_*::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb,&_*::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb,&_*::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb,&_*::-webkit-scrollbar-thumb]:bg-white/35 [&::-webkit-scrollbar-thumb,&_*::-webkit-scrollbar-thumb]:bg-clip-padding',
  '[&::-webkit-scrollbar-thumb:hover,&_*::-webkit-scrollbar-thumb:hover]:bg-white/50',
  '[&::-webkit-scrollbar-button,&_*::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-corner,&_*::-webkit-scrollbar-corner]:bg-transparent',
].join(' ');

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#05070e' },
      { title: 'Joe.全能情绪伙伴' },
      { name: 'description', content: 'Joe — 以声音连接，以思绪回应。一个可感知的 AI 对话界面。' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }),
  component: Outlet,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.fonts.add(new FontFace('Vivo Sans', 'url(/fonts/vivo-sans-regular.ttf)', { weight: '400', display: 'swap' }));
    document.fonts.add(new FontFace('Vivo Sans', 'url(/fonts/vivo-sans-medium.ttf)', { weight: '500', display: 'swap' }));
  }, []);
  return (
    <html
      lang="zh-CN"
      className={`bg-[#05070e] font-['Vivo_Sans',sans-serif] text-[#e4e8f4] [--font-mono:'Vivo_Sans',sans-serif] [font-synthesis:none] [color-scheme:dark] ${scrollbars}`}
    >
      <head>
        <HeadContent />
      </head>
      <body className="m-0 min-w-80 bg-[radial-gradient(ellipse_at_48%_43%,#10142d55,transparent_52%),linear-gradient(#05070e,#05070e)] before:pointer-events-none before:fixed before:inset-0 before:bg-[url('/noise.svg')] before:opacity-15 before:content-[''] [&_button]:cursor-pointer [&_button]:transition-[background,border-color,color,transform] [&_button]:duration-200 [&_button:not([role=combobox]):hover]:-translate-y-px motion-reduce:[&_button]:transform-none motion-reduce:[&_button]:transition-none [&_button]:[-webkit-tap-highlight-color:transparent] [&_a]:[-webkit-tap-highlight-color:transparent] [&,&_*]:border-0! [&,&_*]:outline-none! [&,&_*]:ring-0! [&,&_*]:ring-offset-0!">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
