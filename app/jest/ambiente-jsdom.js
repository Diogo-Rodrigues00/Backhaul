// Ambiente jsdom para os poucos testes que precisam de DOM de verdade (react-native-web).
// O jsdom não traz as APIs de fetch do Node (Request, Response...), que o MSW do jest.setup.ts
// exige; elas são copiadas do Node para o escopo global do teste.
const JSDOMEnvironment = require('jest-environment-jsdom').default;

const DO_NODE = [
  'fetch',
  'Request',
  'Response',
  'Headers',
  'FormData',
  'Blob',
  'TextEncoder',
  'TextDecoder',
  'ReadableStream',
  'WritableStream',
  'TransformStream',
  'BroadcastChannel',
  'MessageChannel',
  'MessagePort',
  'MessageEvent',
  'structuredClone',
  'setImmediate',
  'clearImmediate',
];

module.exports = class AmbienteJsdomComFetch extends JSDOMEnvironment {
  constructor(config, context) {
    super(config, context);
    for (const nome of DO_NODE) {
      if (nome in globalThis && !(nome in this.global)) {
        this.global[nome] = globalThis[nome];
      }
    }
  }
};
