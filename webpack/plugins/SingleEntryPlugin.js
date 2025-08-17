class EntryOptionPlugin {
    constructor(context, entry, name) {
        this.context = context;  // 入口上下文绝对路径
        this.entry = entry; // 入口模块路径
        this.name = name; // 入口名字
    }
    apply(compiler) {
        compiler.hooks.make.tapAsync(
            "SingleEntryPlugin",
            (compilation, callback) => {
                //入口文件 代码块的名称 context上下文绝对路径
                const { entry, name, context } = this;
                // 从此入口开始编译,编译入口文件和依赖
                console.log('SingleEntryPlugin 触发');
                // 开始编译一个新的入口
                compilation.addEntry(context, entry, name, callback);
            }
        );
    }
};
module.exports = EntryOptionPlugin;