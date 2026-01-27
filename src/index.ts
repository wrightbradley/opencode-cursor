import type { Plugin, Hooks } from "@opencode-ai/plugin";

const LOG_PREFIX = "[cursor-acp]";

function log(level: 'log' | 'error' | 'warn' | 'info' | 'debug', ...args: unknown[]) {
  const message = args.map(arg =>
    typeof arg === 'string' ? arg : JSON.stringify(arg)
  ).join(' ');
  console[level](`${LOG_PREFIX}`, message);
}

const CursorAcpPlugin: Plugin = async (input) => {
  log('info', 'Plugin loaded');

  const hooks: Hooks = {
    config: async (config) => {
      try {
        log('debug', 'Config hook called');
      } catch (error) {
        log('error', 'Config hook error:', error);
      }
    },
    auth: {
      provider: "cursor-acp",
      loader: async (getAuth, provider) => {
        try {
          log('debug', 'Auth loader called for provider:', provider);

          const auth = {
            apiKey: "cursor-acp-no-auth-required",
            baseURL: "http://127.0.0.1:32123/v1"
          };

          log('debug', 'Returning auth config');
          return auth;
        } catch (error) {
          log('error', 'Auth loader error:', error);
          return {
            apiKey: "",
            baseURL: "http://127.0.0.1:32123/v1"
          };
        }
      },
      methods: [{
        type: "api",
        label: "Cursor Agent ACP through stdin/stdout"
      }]
    }
  };

  log('info', 'Plugin hooks registered');
  return hooks;
};

export { CursorAcpPlugin };
export default CursorAcpPlugin;