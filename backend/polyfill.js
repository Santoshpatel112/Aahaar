import buffer from 'node:buffer';

// Polyfill SlowBuffer for Node.js versions where it has been deprecated or removed
if (!buffer.SlowBuffer) {
  buffer.SlowBuffer = buffer.Buffer;
}
