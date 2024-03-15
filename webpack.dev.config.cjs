const configIn = require("./webpack.config.cjs");

const configOut = {
  ...configIn,
  devtool: "source-map",
};

module.exports = configOut;
