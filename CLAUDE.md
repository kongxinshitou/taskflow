# TaskFlow 项目配置

## 项目概述
TaskFlow 是一个个人任务管理应用，正在从 Electron 单体架构重构为前后端分离架构。

## 架构
- **后端**: Go (Gin + GORM + SQLite)，位于 `server/` 目录
- **前端**: React 18 + TypeScript + Ant Design + Zustand
- **MCP Server**: Go 实现，通过 stdio 传输，位于 `server/mcp/`

## TaskFlow Integration
本项目集成了 TaskFlow 任务管理系统。
在每次 session 结束（/exit）前，请自动执行 TaskFlow Session Sync Skill：
1. 总结本次 session 完成的工作
2. 调用 taskflow_session_sync 同步到 TaskFlow
3. 报告同步结果

## 开发命令
- Go 后端: `cd server && make dev`
- Web 前端: `npm run dev:web`
- Electron 前端: `npm run dev`
- 构建 Go 后端: `cd server && make build`
- 构建 MCP Server: `cd server && make build-mcp`
