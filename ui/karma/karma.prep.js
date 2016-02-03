const testContext = require.context('../modules', true, /\.test\.js$/);
testContext.keys().forEach(testContext);

const srcContext = require.context('../modules', true, /\/([^\/\.]+)\.js$/);
srcContext.keys().forEach(srcContext);
