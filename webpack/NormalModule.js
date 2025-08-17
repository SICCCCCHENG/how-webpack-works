class NormalModule {
    constructor({ name, context, rawRequest, resource, parser }) {
        this.name = name;
        // /Users/sicheng/Desktop/Demo/learn/webpack-learn
        this.context = context;
        // /src/index.js
        this.rawRequest = rawRequest;
        // /Users/sicheng/Desktop/Demo/learn/webpack-learn/src/index.js
        this.resource = resource;  // 模块的绝对路径
        this.parser = parser;  // ast 解析器,把源代码解析成ast
        this._source = null;  // 模块对应的源代码
        this._ast = null;  // 对应的ast
    }
    //解析依赖
    build(compilation, callback) {
        this.doBuild(compilation, err => {
            this._ast = this.parser.parse(this._source);
            callback();
        });
    }
    //获取模块代码
    doBuild(compilation, callback) {
        let originalSource = this.getSource(this.resource, compilation);
        this._source = originalSource;
        callback();
    }
    getSource(resource, compilation) {
        let originalSource = compilation.inputFileSystem.readFileSync(resource, 'utf8');
        return originalSource;
    }
}
module.exports = NormalModule;

/**
 * 1. 从硬盘上把模块读取出来,读成一个文本
 * 2. 可能不是一个js模块,所以可能会需要loader转换,最终肯定需要得到一个js模块代码,否则就报错
 * 3. 这个js模块经过parser处理转化成抽象语法树ast
 * 4. 分析ast里面的依赖,也就是找require import节点,分析依赖的模块
 * 5. 递归编译依赖的模块
 * 6. 不停依次递归执行以上5步, 直到所有的模块都编译完成为止
 */