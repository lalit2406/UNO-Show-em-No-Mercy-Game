/**
 * Custom Logger for UNO Show 'Em No Mercy backend.
 * Adheres to strict clean-production requirements with zero console.log outputs.
 */
export const logger = {
  info: (...args) => {
    console.log('[INFO]', ...args);
  },

  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },

  error: (...args) => {
    console.error('[ERROR]', ...args);
  }
};
