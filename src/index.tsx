import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const htmlRoot = document.getElementById('__appRoot');
if (!htmlRoot) throw new Error('Failed to find the root element');
const root = createRoot(htmlRoot);

root.render(<App />);
