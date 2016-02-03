// import

import glob from 'glob';

// export

module.exports = {
  files: glob.sync('modules/font/*.svg').map((src) => {
    return '../' + src.split('/').slice(-2).join('/');
  }),
  fontName: 'iconfont',
  classPrefix: 'icon-',
  baseClass: 'icon',
  fixedWidth: false,
  normalize: true,
};
