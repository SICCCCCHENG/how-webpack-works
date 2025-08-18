const path = require('path');
const types = require('babel-types');
const generate = require('babel-generator').default;
const traverse = require('babel-traverse').default;

class NormalModule {
    constructor({ name, context, rawRequest, resource, parser, moduleId }) {
        this.name = name;
        // /Users/sicheng/Desktop/Demo/learn/webpack-learn
        this.context = context;
        // /src/index.js
        this.rawRequest = rawRequest;
        // /Users/sicheng/Desktop/Demo/learn/webpack-learn/src/index.js
        this.resource = resource;  // 模块的绝对路径
        this.moduleId = moduleId;
        // this.moduleId = moduleId || ('./' + path.posix.relative(context, resource));
        this.parser = parser;  // ast 解析器,把源代码解析成ast
        this._source = null;  // 模块对应的源代码
        this._ast = null;  // 对应的ast
        this.dependencies = [];
    }
    //解析依赖
    build(compilation, callback) {
        this.doBuild(compilation, err => {
            let originalSource = this.getSource(this.resource, compilation);
            // 将 当前模块 的内容转换成 AST
            const ast = this.parser.parse(originalSource);
            // 遍历语法树,找到里面的依赖进行收集
            traverse(ast, {
                // 如果当前节点是一个函数调用时, 进入回调
                CallExpression: (nodePath) => {
                    let node = nodePath.node;
                    // 当前节点是 require 时
                    if (node.callee.name === 'require') {
                        //修改require为__webpack_require__
                        node.callee.name = '__webpack_require__';
                        //获取要加载的模块ID
                        let moduleName = node.arguments[0].value;
                        //获取扩展名
                        let extension = moduleName.split(path.posix.sep).pop().indexOf('.') == -1 ? '.js' : '';
                        //获取依赖模块的绝对路径   posix 是将 window 里面 \ 转化为 / 
                        // /Users/sicheng/Desktop/Demo/learn/webpack-learn/src/title.js
                        let dependencyResource = path.posix.join(path.posix.dirname(this.resource), moduleName + extension);
                        //获取依赖模块的模块ID 
                        // ./+从根目录出发到依赖模块的绝对路径的相对路径
                        // ./src/title.js 
                        let dependencyModuleId = '.' + path.posix.sep + path.posix.relative(this.context, dependencyResource);

                        console.log(dependencyModuleId, 'dependencyModuleId');

                        // 把require 模块路径 './title.js' 变成了 './src/title.js'
                        node.arguments = [types.stringLiteral(dependencyModuleId)];
                        // //添加依赖
                        this.dependencies.push({
                            name: this.name,  // main
                            context: this.context, // 根目录
                            rawRequest: moduleName,  // 模块的相对路径  原始路径
                            moduleId: dependencyModuleId, // 模块id 相对于根目录的相对路径
                            resource: dependencyResource  // 依赖模块的绝对路径
                        });
                        
                    }
                }
            });
            let { code } = generate(ast);
            this._source = code;
            this._ast = ast;
            callback();
        });
    }
    //获取模块代码
    doBuild(compilation, callback) {
        let originalSource = this.getSource(this.resource, compilation);
        // loader逻辑放到这
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

/**
 * 模块id的问题:
 * 不管是相对的本地模块,还是三方模块
 * 最后 moduleId 都是相对于项目根目录相对路径
 * ./src/title.js
 * ./src/index.js
 * ./node_modules/util/util.js
 * 路径分隔符是linux下的 / , 而不是window的 \
 */