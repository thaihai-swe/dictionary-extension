/// <reference types="vite/client" />
/// <reference types="chrome" />

declare module '*?inline' {
  const content: string;
  export default content;
}

declare module '*?raw' {
  const content: string;
  export default content;
}

declare module '*.md' {
  const content: string;
  export default content;
}
