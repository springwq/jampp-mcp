# Jampp MCP 服务器

这是一个 Model Context Protocol (MCP) 服务器，用于连接 Jampp 广告平台的报告 API。它允许 LLM（如 Claude）通过自然语言查询和分析 Jampp 广告数据。

## 功能

该服务器提供以下工具：

1. `get_campaign_spend` - 获取特定日期范围内的广告系列支出
2. `get_campaign_daily_spend` - 获取特定广告系列的每日支出
3. `get_campaign_performance` - 获取广告系列的综合性能指标
4. `create_async_report` - 为大型数据集创建异步报告
5. `get_async_report_status` - 检查异步报告的状态
6. `get_async_report_results` - 获取已完成的异步报告结果
7. `get_available_metrics_and_dimensions` - 获取所有可用的指标和维度列表

## 安装

1. 克隆此仓库
2. 安装依赖：`npm install`
3. 创建 `.env` 文件并添加你的 Jampp API 凭证：
   ```
   JAMPP_CLIENT_ID=your_client_id
   JAMPP_CLIENT_SECRET=your_client_secret
   ```
4. 构建项目：`npm run build`
5. 运行服务器：`npm start`

## 与 Claude for Desktop 集成

要将此服务器与 Claude for Desktop 一起使用：

1. 确保你已安装并更新到最新版本的 Claude for Desktop。
2. 打开 Claude for Desktop 配置文件：
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
3. 添加 Jampp MCP 服务器到配置中：

```json
{
  "mcpServers": {
    "jampp": {
      "command": "node",
      "args": ["/absolute/path/to/jampp-mcp/build/index.js"],
      "env": {
        "JAMPP_CLIENT_ID": "your_client_id",
        "JAMPP_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

4. 保存文件并重启 Claude for Desktop。
5. 现在你应该能在 Claude for Desktop 中看到 Jampp 工具。

## 示例查询

以下是一些你可以在连接 MCP 服务器后向 Claude 提出的示例查询：

1. "上个月所有广告系列的总支出是多少？"
2. "显示过去一周广告系列 ID 12345 的每日支出。"
3. "1 月份我们的 iOS 广告系列的性能指标是什么？"
4. "为 Q1 的按国家划分的展示次数和点击次数创建异步报告。"
5. "检查 ID 为 'abc123' 的异步报告的状态。"
6. "获取 ID 为 'abc123' 的已完成异步报告的结果。"
7. "Jampp 报告有哪些可用的指标和维度？"

## 许可证

MIT
