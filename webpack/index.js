const NodeEnvironmentPlugin = require("./plugins/NodeEnvironmentPlugin");
const Compiler = require("./Compiler");
const WebpackOptionsApply = require("./WebpackOptionsApply");
function webpack(options) {
    //创建compiler
    let compiler = new Compiler(options.context);
    // options.context = options.context || path.resolve(process.cwd());

    //给compiler指定options
    compiler.options = Object.assign(compiler.options, options);

    //插件设置读写文件的API
    new NodeEnvironmentPlugin().apply(compiler);
    //调用配置文件里配置的插件并依次调用
    if (options.plugins && Array.isArray(options.plugins)) {
        for (const plugin of options.plugins) {
            plugin.apply(compiler);
        }
    }
    // 初始化选项,挂载内置插件
    new WebpackOptionsApply().process(options, compiler); //处理参数
    return compiler;
}

module.exports = webpack;