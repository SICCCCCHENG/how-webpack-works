
const NormalModuleFactory = require('./NormalModuleFactory');
const { Tapable, SyncHook } = require("tapable");
const Parser = require('./Parser');
const parser = new Parser();
const path = require('path');
const async = require('neo-async');
const Chunk = require('./Chunk');

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
        this.chunks = []; // 这里放所有的代码块
        this._modules = {}; // key是模块id, 值是模块对象
        this.hooks = {
            // 当你成功构建完成一个模块之后就会触发此钩子
            succeedModule: new SyncHook(["module"]),
            seal: new SyncHook( ),
            beforeChunks: new SyncHook(),  // 生成代码块之前 
            afterChunks: new SyncHook() // 生成代码块之后
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

        this.createModule({
            name,
            context,
            rawRequest: entry,
            resource: path.posix.join(context, entry),
            parser,
            // createModule 函数里面的可以放到这里
            // moduleId: './' + path.posix.relative(context, resource);  // ./src/index.js
        }, entryModule => this.entries.push(entryModule), callback)
    }

    /**
     * 创建并编译一个模块
     * @param {*} data   要编译的模块信息
     * @param {*} addEntry   如果是入口模块,可选增加入口的方法,如果不是的话,就什么都不做
     * @param {*} callback   编译完成之后, 调用callbacl
     */
    createModule(data, addEntry, callback) {
        const moduleFactory = new NormalModuleFactory();
        // let module = moduleFactory.create(
        //     {
        //         name,  //模块所属的代码块的名称  main
        //         context: this.context,//上下文 
        //         rawRequest: entry,  // ./src/index.js
        //         resource: path.posix.join(context, entry),  // 入口的绝对路径
        //         parser
        //     });//模块完整路径
        let module = moduleFactory.create(data)
        addEntry && addEntry(module) // 如果是入口, 则添加到入口模块中
        module.moduleId = './' + path.posix.relative(this.context, module.resource);  // ./src/index.js
        this._modules[module.moduleId] = module  // 保存对应信息
        this.modules.push(module);  // 普通模块数组
        // this.entries.push(module);//把编译好的模块添加到入口列表里面  入口模块数组
        const afterBuild = (err, module) => {

            // 如果有依赖
            if (module.dependencies.length > 0) {
                this.processModuleDependencies(module, err => {
                    callback(err, module);
                });
            } else {
                return callback(err, module);
            }
        };
        this.buildModule(module, afterBuild);
    }

    /**
     * 处理编译模块依赖
     * @param {*} module ./src/index.js
     * @param {*} callback 
     */

    processModuleDependencies(module, callback) {
        // 获取当前模块的依赖模块
        let dependencies = module.dependencies;
        // 遍历依赖模块, 全部开始编译, 当所有模块编译完成后开始调用callback
        async.forEach(dependencies, (dependency, done) => {
            let { name, context, rawRequest, resource, moduleId } = dependency;
            // 编译成功后会走done, 都结束之后会走callback
            this.createModule({
                name,
                context,
                rawRequest,
                resource,
                parser,
                moduleId
            }, null, done)


            // let module = moduleFactory.create(
            //     {
            //         name,
            //         context,
            //         rawRequest,
            //         moduleId,
            //         resource,
            //         parser
            //     });
            // this.modules.push(module);
            // this._modules[module.moduleId] = module;
            // const afterBuild = () => {
            //     if (module.dependencies) {
            //         this.processModuleDependencies(module, err => {
            //             done(null, module);
            //         });
            //     } else {
            //         return done(null, module);
            //     }
            // };
            // this.buildModule(module, afterBuild);
        }, callback);
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
            return afterBuild(err, module);
        });
    }

    // 把模块封装成代码块
    seal(callback) {
        this.hooks.seal.call();
        this.hooks.beforeChunks.call();//生成代码块之前
        // 一般来说,默认情况下,每一个入口会生成一个代码块
        for (const entryModule of this.entries) {//循环入口模块
            const chunk = new Chunk(entryModule);//创建代码块  根据入口模块得到一个代码块
            this.chunks.push(chunk);//把代码块添加到代码块数组中
            //把代码块的模块添加到代码块中 
            chunk.modules = this.modules.filter(module => module.name == chunk.name);
        }
        this.hooks.afterChunks.call(this.chunks);//生成代码块之后
        callback();//封装结束
    }
}
module.exports = Compilation;