
let leadingComments = "webpackChunkName: 'title'"
let regexp = /webpackChunkName:\s*['"]([^'"]+)['"]/;

chunkName = leadingComments.match(regexp)
console.log(chunkName);