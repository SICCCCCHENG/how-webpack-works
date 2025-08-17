const { Tapable, AsyncSeriesHook } = require("tapable");
debugger
class Compiler extends Tapable {
    constructor(context) {
        super();
        this.options = {};
        this.context = context; //设置上下文路径
        this.hooks = {
            done: new AsyncSeriesHook(['stats'])
        };
    }
    run(callback) {
        console.log("Compiler run");
        callback(null, {
            toJson() {
                return {
                    entries: [], // 显示所有入口
                    chunks: [], // 代码块
                    modules: [], // 模块
                    assets: [] // 打包后的资源
                }
            }
        });
    }
}
module.exports = Compiler;