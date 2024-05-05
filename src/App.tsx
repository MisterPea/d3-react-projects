import * as React from 'react';
import { useRef } from 'react';
import './style/main.scss';
import MtaRidership from './MtaRidership';

export default function App() {
  const mainWrapRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={mainWrapRef}>
      <MtaRidership parentRef={mainWrapRef} />
    </div>
  );
}
