const EntryOptionPlugin = require("./plugins/EntryOptionPlugin");

// 挂载各种各样的插件
module.exports = class WebpackOptionsApply {
    process(options, compiler) {
        // 注册后直接触发
        //挂载入口文件插件
        new EntryOptionPlugin().apply(compiler);
        //触发entryOption事件执行   context 是根目录的路径  entry : './src/index.js',
        compiler.hooks.entryOption.call(options.context, options.entry);
    }
};