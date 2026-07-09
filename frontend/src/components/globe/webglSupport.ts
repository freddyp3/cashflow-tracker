// Probes for a usable WebGL context without pulling in three.js.
// Returns false when the browser blocks GPU access (e.g. Chrome with
// hardware acceleration disabled), which would make WebGLRenderer throw.
export default function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    );
  } catch {
    return false;
  }
}
