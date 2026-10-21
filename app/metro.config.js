// https://docs.expo.dev/guides/customizing-metro/
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// MSW 3: o export "./browser" é `"node": null`, e o Metro resolve também o bundle de
// renderização estática (Node). Apontamos para o arquivo direto; o worker só roda no navegador
// e só é importado no preview (EXPO_PUBLIC_API_MOCK=msw, ver src/lib/mocks.web.ts).
const resolverOriginal = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'msw/browser') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/msw/lib/browser/index.js'),
    };
  }
  return (resolverOriginal ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
