// import

import postcss from 'postcss';

// export

export default postcss.plugin('baseline', () => {
  return (css) => {
    css.replaceValues(/[\d\.]+bl/g, {fast: 'bl'}, (str) => {
      return `calc(${parseFloat(str)} * var(--baseline))`;
    });

    css.replaceValues(/[\d\.]+bf/g, {fast: 'bf'}, (str) => {
      return `calc(${parseFloat(str)} * var(--basefont))`;
    });
  };
});
