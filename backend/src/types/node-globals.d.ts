declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: string;
    PORT?: string;
    DATABASE_URL?: string;
    JWT_SECRET?: string;
    JWT_EXPIRES_IN?: string;
    LOG_LEVEL?: string;
  }

  interface Process {
    env: ProcessEnv;
    exit(code?: number): never;
    on(event: "SIGINT" | "SIGTERM", listener: () => void): Process;
  }
}

declare const process: NodeJS.Process;