
const NormalModuleFactory = require('./NormalModuleFactory');
const { Tapable, SyncHook } = require("tapable");
const Parser = require('./Parser');
const parser = new Parser();
const path = require('path');
class Compilation extends Tapable {
    constructor(compiler) {
        super();
        this.compiler = compiler;
        this.options = compiler.options;  // 一样的选项
        this.context = compiler.context;  // 根目录
        this.inputFileSystem = compiler.inputFileSystem;  // fs
        this.outputFileSystem = compiler.outputFileSystem; // fs
        this.entries = [];  // 入口的数组
        this.modules = []; // 所有模块的数组
        this.hooks = {
            // 当你成功构建完成一个模块之后就会触发此钩子
            succeedModule: new SyncHook(["module"])
        }
    }
    //context ./src/index.js main callback(终级回调)
    /**
     * 开始编译一个新的入口
     * @param {*} context 根目录
     * @param {*} entry  入口 ./src/index.js
     * @param {*} name  入口名字 main
     * @param {*} callback  finalCallback
     */
    addEntry(context, entry, name, callback) {
        this._addModuleChain(context, entry, name, (err, module) => {
            callback(err, module);
        });
    }
    _addModuleChain(context, entry, name, callback) {
        const moduleFactory = new NormalModuleFactory();
        let module = moduleFactory.create(
            {
                name,  //模块所属的代码块的名称  main
                context: this.context,//上下文 
                rawRequest: entry,  // ./src/index.js
                resource: path.posix.join(context, entry),  // 入口的绝对路径
                parser
            });//模块完整路径

        this.modules.push(module);  // 普通模块数组
        this.entries.push(module);//把编译好的模块添加到入口列表里面  入口模块数组
        const afterBuild = () => {

            if (module.dependencies) {
                this.processModuleDependencies(module, err => {
                    callback(null, module);
                });
            } else {
                return callback(null, module);
            }
        };
        this.buildModule(module, afterBuild);

    }
    /**
     * 
     * @param {*} module 要编译的模块
     * @param {*} afterBuild 编译完成后的回调
     */
    buildModule(module, afterBuild) {
        // 模块的编译逻辑是在module内部完成的
        module.build(this, (err) => {
            this.hooks.succeedModule.call(module);
            return afterBuild();
        });
    }
}
module.exports = Compilation;