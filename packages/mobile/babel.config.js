module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      function envVarPlugin() {
        return {
          visitor: {
            MemberExpression(nodePath) {
              const expr = nodePath.node;
              if (
                expr.object.type === 'MemberExpression' &&
                expr.object.object.type === 'Identifier' &&
                expr.object.object.name === 'process' &&
                expr.object.property.type === 'Identifier' &&
                expr.object.property.name === 'env' &&
                expr.property.type === 'Identifier'
              ) {
                if (expr.property.name === 'EXPO_ROUTER_APP_ROOT') {
                  const path = require('path');
                  nodePath.replaceWithSourceString(`'${path.resolve(__dirname, 'app').replace(/\\/g, '/')}'`);
                } else if (expr.property.name === 'EXPO_ROUTER_IMPORT_MODE') {
                  nodePath.replaceWithSourceString("'sync'");
                }
              }
            },
          },
        };
      },
    ],
  };
};
