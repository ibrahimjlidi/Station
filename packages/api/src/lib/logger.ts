export const logger = {
  info(message: string, metadata?: unknown) {
    console.info(message, metadata ?? '');
  },
  warn(message: string, metadata?: unknown) {
    console.warn(message, metadata ?? '');
  },
  error(message: string, error?: unknown) {
    console.error(message, error ?? '');
  },
};
