declare module '*.css';
declare module '*.scss';
declare module '*.module.scss' {
  const styles: { readonly [key: string]: string };
  export default styles;
}
declare module '*.jpg' {
  const src: string;
  export default src;
}
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.svg' {
  const src: string;
  export default src;
}
