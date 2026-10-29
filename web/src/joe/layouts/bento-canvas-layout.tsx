import { useLayoutEffect, useMemo, useRef } from 'react';
import { packBento } from './bento-packing';
import { useCardMeasurements, type LayoutLayerProps } from './canvas-layout-layer';

export function BentoCanvasLayout(props: LayoutLayerProps) {
  useLayoutEffect(() => { if (props.canvas.current) { props.canvas.current.scrollTop = 0; props.canvas.current.scrollLeft = 0; } }, [props.canvas]);
  const { width, height, sizes } = useCardMeasurements(props);
  const idsKey = props.ids.join(',');
  const previousLayout = useRef(props.layout);
  const packed = useMemo(() => packBento(props.ids, sizes, width, height, previousLayout.current), [idsKey, sizes, width, height]);
  useLayoutEffect(() => {
    previousLayout.current = packed.layout;
    props.onPlacement({ layout: packed.layout, draggable: false, pannable: false, entry: 'slide', overflow: 'auto', extent: { width: packed.width, height: packed.height } });
  }, [packed, props.onPlacement]);
  return <div aria-hidden data-layout-layer="bento" className="pointer-events-none" style={{ width: packed.width, height: packed.height }} />;
}
