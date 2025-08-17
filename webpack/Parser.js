const babylon = require('babylon');
const { Tapable } = require("tapable");
class Parser extends Tapable {
    constructor() {
        super();
    }
    parse(source) {
        return babylon.parse(source, {
            sourceType: 'module',  // 源代码是一个模块
            plugins: ['dynamicImport']  // 额外的一个插件,支持动态导入 import('./title.js')
        });
    }
}
module.exports = Parser;