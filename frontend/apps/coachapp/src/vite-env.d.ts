/// <reference types="vite/client" />

import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
    skipAuth?: boolean;
     authToken?: string
  }
}

import "@kiwicom/orbit-components/lib/primitives/ButtonPrimitive/types";

declare module "@kiwicom/orbit-components/lib/primitives/ButtonPrimitive/types" {
  export interface ButtonCommonProps {
    to?: string;
  }
}
