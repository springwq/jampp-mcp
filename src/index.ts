import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config();

// 创建 MCP 服务器
const server = new McpServer({
  name: "Jampp MCP Server",
  version: "1.0.0"
});

// Jampp API 常量
const AUTH_URL = "https://auth.jampp.com/v1/oauth/token";
const API_URL = "https://reporting-api.jampp.com/v1/graphql";

// 环境变量中的认证信息
const CLIENT_ID = process.env.JAMPP_CLIENT_ID || '';
const CLIENT_SECRET = process.env.JAMPP_CLIENT_SECRET || '';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("缺少 Jampp API 凭证。请设置 JAMPP_CLIENT_ID 和 JAMPP_CLIENT_SECRET 环境变量。");
  process.exit(1);
}

// Token 缓存
let accessToken: string | null = null;
let tokenExpiry = 0;

/**
 * 获取有效的 Jampp API 访问令牌
 */
async function getAccessToken(): Promise<string> {
  // 检查是否有有效的令牌
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  // 请求新令牌
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);

  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    throw new Error(`认证失败: ${response.statusText}`);
  }

  const data = await response.json();
  accessToken = data.access_token;

  // 设置过期时间，留出 5 分钟的缓冲
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

  if (!accessToken) {
    throw new Error('获取访问令牌失败：令牌为空');
  }

  return accessToken;
}

/**
 * 执行 GraphQL 查询
 */
async function executeQuery(query: string, variables: Record<string, any> = {}) {
  const token = await getAccessToken();

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.statusText}`);
  }

  return response.json();
}

// 工具: 获取广告系列支出
server.tool("get_campaign_spend", {
  from_date: z.string().describe("开始日期，格式为 YYYY-MM-DD"),
  to_date: z.string().describe("结束日期，格式为 YYYY-MM-DD"),
  campaign_id: z.number().optional().describe("可选的广告系列 ID"),
}, async ({ from_date, to_date, campaign_id }) => {
  try {
    let query = `
      query spendPerCampaign($from: DateTime!, $to: DateTime!${campaign_id ? ', $campaignId: Int!' : ''}) {
        spendPerCampaign: pivot(
          from: $from,
          to: $to
          ${campaign_id ? ', filter: { campaignId: { equals: $campaignId } }' : ''}
        ) {
          results {
            campaignId
            campaign
            spend
          }
        }
      }
    `;

    const variables: Record<string, any> = {
      from: from_date,
      to: to_date,
    };

    if (campaign_id) {
      variables.campaignId = campaign_id;
    }

    const data = await executeQuery(query, variables);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.data.spendPerCampaign.results, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `获取广告系列支出时出错: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// 工具: 获取广告系列每日支出
server.tool("get_campaign_daily_spend", {
  campaign_id: z.number().describe("广告系列 ID"),
  from_date: z.string().describe("开始日期，格式为 YYYY-MM-DD"),
  to_date: z.string().describe("结束日期，格式为 YYYY-MM-DD"),
}, async ({ campaign_id, from_date, to_date }) => {
  try {
    const query = `
      query dailySpend($campaignId: Int!, $from: DateTime!, $to: DateTime!) {
        dailySpend: pivot(
          from: $from,
          to: $to,
          filter: { campaignId: { equals: $campaignId } },
          groupBy: [date]
        ) {
          results {
            date
            spend
          }
        }
      }
    `;

    const variables = {
      campaignId: campaign_id,
      from: from_date,
      to: to_date,
    };

    const data = await executeQuery(query, variables);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.data.dailySpend.results, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `获取广告系列每日支出时出错: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// 工具: 获取广告系列性能指标
server.tool("get_campaign_performance", {
  from_date: z.string().describe("开始日期，格式为 YYYY-MM-DD"),
  to_date: z.string().describe("结束日期，格式为 YYYY-MM-DD"),
  campaign_id: z.number().optional().describe("可选的广告系列 ID"),
}, async ({ from_date, to_date, campaign_id }) => {
  try {
    let query = `
      query campaignPerformance($from: DateTime!, $to: DateTime!${campaign_id ? ', $campaignId: Int!' : ''}) {
        performance: pivot(
          from: $from,
          to: $to
          ${campaign_id ? ', filter: { campaignId: { equals: $campaignId } }' : ''}
        ) {
          results {
            campaignId
            campaign
            spend
            impressions
            clicks
            installs
            ctr
            cpi
            cvr
          }
        }
      }
    `;

    const variables: Record<string, any> = {
      from: from_date,
      to: to_date,
    };

    if (campaign_id) {
      variables.campaignId = campaign_id;
    }

    const data = await executeQuery(query, variables);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.data.performance.results, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `获取广告系列性能指标时出错: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// 工具: 创建异步报告
server.tool("create_async_report", {
  from_date: z.string().describe("开始日期，格式为 YYYY-MM-DD"),
  to_date: z.string().describe("结束日期，格式为 YYYY-MM-DD"),
  metrics: z.array(z.string()).describe("要包含的指标列表"),
  dimensions: z.array(z.string()).describe("要包含的维度列表"),
  filters: z.record(z.any()).optional().describe("可选的过滤条件"),
}, async ({ from_date, to_date, metrics, dimensions, filters }) => {
  try {
    const query = `
      mutation createReport($input: CreateReportInput!) {
        createReport(input: $input) {
          id
          status
        }
      }
    `;

    const variables = {
      input: {
        from: from_date,
        to: to_date,
        metrics,
        dimensions,
        filters: filters || {},
      }
    };

    const data = await executeQuery(query, variables);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.data.createReport, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `创建异步报告时出错: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// 工具: 获取异步报告状态
server.tool("get_async_report_status", {
  report_id: z.string().describe("报告 ID"),
}, async ({ report_id }) => {
  try {
    const query = `
      query reportStatus($id: ID!) {
        report(id: $id) {
          id
          status
          createdAt
          completedAt
        }
      }
    `;

    const variables = {
      id: report_id,
    };

    const data = await executeQuery(query, variables);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.data.report, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `获取异步报告状态时出错: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// 工具: 获取异步报告结果
server.tool("get_async_report_results", {
  report_id: z.string().describe("报告 ID"),
}, async ({ report_id }) => {
  try {
    const query = `
      query reportResults($id: ID!) {
        report(id: $id) {
          id
          status
          results
        }
      }
    `;

    const variables = {
      id: report_id,
    };

    const data = await executeQuery(query, variables);

    if (data.data.report.status !== 'COMPLETED') {
      return {
        content: [
          {
            type: "text",
            text: `报告尚未完成，当前状态: ${data.data.report.status}`
          }
        ]
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.data.report.results, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `获取异步报告结果时出错: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// 工具: 获取可用的指标和维度
server.tool("get_available_metrics_and_dimensions", {}, async () => {
  try {
    const query = `
      query {
        availableMetrics
        availableDimensions
      }
    `;

    const data = await executeQuery(query);
    const availableMetrics = data.data.availableMetrics;
    const availableDimensions = data.data.availableDimensions;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            metrics: availableMetrics,
            dimensions: availableDimensions
          }, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `获取可用指标和维度时出错: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// 启动服务器
async function main() {
  try {
    // 使用 stdio 传输启动服务器
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Jampp MCP 服务器成功启动");
  }
  catch (error) {
    console.error("启动服务器失败:", error);
    process.exit(1);
  }
}

main();
