module.exports = function test(source, sourceMap) {
  this.cacheable && this.cacheable();
  const newSource = `
  const result = \`${source}\`;
  export default result;
  `;

  if (this.callback) {
    this.callback(null,  newSource, sourceMap);
  }
  return newSource;
};
