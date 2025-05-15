declare module '@env' {
  export const DSN_KEY: string;
  export const API_BASE_URL: string;
  export const BUILD_NUMBER: string;
}

declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
