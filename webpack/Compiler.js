const { Tapable, SyncHook, SyncBailHook, AsyncParallelHook, AsyncSeriesHook } = require("tapable");
const Compilation = require('./Compilation');
const NormalModuleFactory = require('./NormalModuleFactory');
// const Stats = require('./Stats');

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

            done: new AsyncSeriesHook(['stats']),

        };
    }
    run(finalCallback) {
        console.log("Compiler run");
        // callback(null, {
        //     toJson() {
        //         return {
        //             entries: [], // 显示所有入口
        //             chunks: [], // 代码块
        //             modules: [], // 模块
        //             assets: [] // 打包后的资源
        //         }
        //     }
        // });

        //编译完成后的回调
        const onCompiled = (err, compilation) => {
            console.log('onCompiled');
            finalCallback(err, new  (compilation));
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
                 (err, compilation);
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