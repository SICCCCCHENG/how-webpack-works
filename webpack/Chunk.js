class Chunk {
    constructor(module) {
        this.entryModule = module;  // 代码的入口模块
        this.name = module.name; // 代码块的名称 main
        this.files = [];  // 这个代码生成了哪些文件
        this.modules = [];  // 包含哪些模块
    }
}

module.exports = Chunk;