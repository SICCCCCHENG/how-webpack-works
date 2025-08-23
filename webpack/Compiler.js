const { Tapable, SyncHook, SyncBailHook, AsyncParallelHook, AsyncSeriesHook } = require("tapable");
const Compilation = require('./Compilation');
const NormalModuleFactory = require('./NormalModuleFactory');
const Stats = require('./Stats');
const mkdirp = require('mkdirp');  // 递归创建新的文件夹
const path = require('path');

class Compiler extends Tapable {
    constructor(context) {
        super();
        this.options = {};
        this.context = context; //设置上下文路径
        this.hooks = {
            // context 是根目录的绝对路径  entry : './src/index.js',
            entryOption: new SyncBailHook(["context", "entry"]),

            beforeRun: new AsyncSeriesHook(["compiler"]), // 运行前
            run: new AsyncSeriesHook(["compiler"]), // 运行

            beforeCompile: new AsyncSeriesHook(["params"]),  // 编译前
            compile: new SyncHook(["params"]), // 编译


            thisCompilation: new SyncHook(["compilation", "params"]), // 开始一次新的编译

            compilation: new SyncHook(["compilation", "params"]), // 创建完成一个新的compilation

            make: new AsyncParallelHook(["compilation"]),  // make 构建 异步并行,当有多个入口同时编译

            afterCompile: new AsyncSeriesHook(['compilation']),  // 编译完成

            emit: new AsyncSeriesHook(["compilation"]), // 把生成chunk写入文件

            done: new AsyncSeriesHook(['stats']), // 所有编译全部完成

        };
    }

    emitAssets(compilation, callback) {
        const emitFiles = err => {
            let assets = compilation.assets;
            for (let file in assets) {
                let source = assets[file];
                // /Users/sicheng/Desktop/Demo/learn/webpack-learn/dist/main.js
                const targetPath = path.posix.join(this.options.output.path, file);
                let content = source;
                this.outputFileSystem.writeFileSync(targetPath, content);
            }
            callback();
        }
        // 先触发emit回调, emit是修改输出文件的最后机会, 用的很多
        this.hooks.emit.callAsync(compilation, err => {
            // 先创建dist输出目录,再写入文件
            // mkdirp(this.options.output.path, emitFiles);
            // 异步版本
            console.log(this.options.output.path, '@@@');
            this.outputFileSystem.mkdir(this.options.output.path, { recursive: true }, (err) => {
                if (err) return callback(err);
                emitFiles();
            });
        });
    }

    run(callback) {
        console.log("Compiler run");

        //编译完成后的回调
        const onCompiled = (err, compilation) => {
            console.log('onCompiled');
            // finalCallback(err, new Stats(compilation));
            // 把chunk写入文件
            this.emitAssets(compilation, err => {
                // 先收集编译信息  chunks entries modules files
                const stats = new Stats(compilation);
                this.hooks.done.callAsync(stats, err => {
                    return callback(err, stats);
                });
            })
        };
        //准备运行编译
        this.hooks.beforeRun.callAsync(this, err => {
            //运行
            this.hooks.run.callAsync(this, err => {
                this.compile(onCompiled); //开始编译,编译完成后执行conCompiled回调
            });
        });
    }

    compile(onCompiled) {
        const params = this.newCompilationParams();
        this.hooks.beforeCompile.callAsync(params, err => {
            this.hooks.compile.call(params);
            // 创建新的 Compilation 对象
            const compilation = this.newCompilation(params);
            this.hooks.make.callAsync(compilation, err => {
                console.log('make完成');
                // 封装代码块之后,编译就完成了
                compilation.seal(err => {
                    this.hooks.afterCompile.callAsync(compilation, err => {
                        onCompiled(err, compilation);
                    });
                });
            });
        });
    }
    newCompilationParams() {
        const params = {
            // 在Compilation之前已经创建了一个普通模块工厂
            normalModuleFactory: new NormalModuleFactory() // TODO
        };
        return params;
    }
    newCompilation(params) {
        const compilation = new Compilation(this);
        this.hooks.thisCompilation.call(compilation, params);
        this.hooks.compilation.call(compilation, params);
        return compilation;
    }
}
module.exports = Compiler;