/// <reference types="vite/client" />

import "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    _retry?: boolean;
    skipAuth?: boolean;
    authToken?: string;
  }
}
