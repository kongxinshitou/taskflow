# TaskFlow

个人任务管理应用，支持桌面端（Electron）和 Web 端，集成 MCP Server 供 Claude Code 自动同步工作记录。

## 技术栈

| 层         | 技术                                                    |
| ---------- | ------------------------------------------------------- |
| 前端       | React 18 + TypeScript + Ant Design 5 + Zustand + Vite   |
| 后端       | Go + Gin + GORM + SQLite（better-sqlite3 / go-sqlite3） |
| MCP Server | Go，stdio 传输，JSON-RPC 2.0                            |
| 桌面端     | Electron 28                                             |
| 部署       | Docker + docker-compose                                 |

## 项目结构

```
taskflow/
├── server/                      # Go 后端
│   ├── main.go                  # 入口（HTTP 服务 / MCP 模式）
│   ├── config/config.go         # 配置（端口、DB 路径、JWT 密钥）
│   ├── models/                  # 数据模型（User, Project, Task, Activity）
│   ├── handlers/                # API 处理函数（auth, project, task, activity, export）
│   ├── middleware/              # JWT 鉴权 + CORS
│   ├── router/router.go         # 路由注册
│   ├── services/                # 任务匹配算法 + 导出服务
│   ├── mcp/                     # MCP Server（server, tools, handlers）
│   ├── Makefile
│   └── go.mod
├── src/                         # React 前端
│   ├── App.tsx                  # 路由守卫 + 页面切换
│   ├── pages/                   # Home, ProjectDetail, Settings, ActivityLog, Login, Register
│   ├── components/              # Sidebar, TaskForm, TaskDetail, ActivityForm, ...
│   ├── store/                   # Zustand 状态管理（project, task, auth, activity）
│   └── utils/
│       ├── api.ts               # HTTP API 客户端（axios + JWT）
│       └── ipc.ts               # 统一 API 层（自动检测 Electron/Web）
├── electron/                    # Electron 主进程
├── claude-skill/                # Claude Code Skill 定义
├── Dockerfile
├── docker-compose.yml
└── CLAUDE.md                    # Claude Code 项目配置
```

## 功能清单

- 多用户认证（注册 / 登录 / JWT）
- 项目 CRUD + 颜色标记
- 任务 CRUD + 子任务 + 拖拽排序
- 优先级（高/中/低）、状态（待办/进行中/已完成）
- 截止日期 + Today 页面
- **完成记录（Activity）**：手动添加、TODO 自动记录、Claude Session 同步
- 数据导入导出（JSON / CSV / Markdown，支持时间范围筛选）
- MCP Server：6 个 Tools 供 Claude Code 调用

---

## 快速开始

### 环境要求

- **Go** >= 1.23（需启用 CGO：`gcc` 可用）
- **Node.js** >= 18
- **npm** >= 9
- **Git**

### 1. 克隆项目

```bash
git clone https://github.com/kongxinshitou/taskflow.git
cd taskflow
```

### 2. 启动后端

```bash
cd server

# 安装 Go 依赖
go mod download

# 启动服务（默认端口 8080）
make dev
```

后端启动后，SQLite 数据库文件 `taskflow.db` 会自动创建。

可通过环境变量覆盖默认配置：

```bash
PORT=9090 DB_PATH=./data/taskflow.db JWT_SECRET=my-secret make dev
```

| 环境变量       | 默认值                                | 说明              |
| -------------- | ------------------------------------- | ----------------- |
| `PORT`       | `8080`                              | HTTP 服务端口     |
| `DB_PATH`    | `taskflow.db`                       | SQLite 数据库路径 |
| `JWT_SECRET` | `taskflow-default-secret-change-me` | JWT 签名密钥      |

### 3. 启动前端

新开一个终端：

```bash
# 安装前端依赖
npm install

# Web 模式开发（推荐）
npm run dev:web
```

浏览器打开 `http://localhost:5173`，即可使用。

> 如果需要 Electron 桌面端模式，运行 `npm run dev`（需先 `npm install` 安装 Electron 依赖）。

### 4. 验证

1. 打开 `http://localhost:5173`，注册一个新账号
2. 登录后创建项目、添加任务
3. 将任务标记为完成，查看"完成记录"页面

---

## API 接口

### 认证（公开）

| 方法 | 路径                   | 说明                                     |
| ---- | ---------------------- | ---------------------------------------- |
| POST | `/api/auth/register` | 注册（`{username, password, email?}`） |
| POST | `/api/auth/login`    | 登录（返回 JWT token）                   |
| GET  | `/api/auth/me`       | 获取当前用户信息                         |

### 项目

| 方法   | 路径                  | 说明                     |
| ------ | --------------------- | ------------------------ |
| GET    | `/api/projects`     | 列出所有项目             |
| POST   | `/api/projects`     | 创建项目                 |
| PUT    | `/api/projects/:id` | 更新项目                 |
| DELETE | `/api/projects/:id` | 删除项目（级联删除任务） |

### 任务

| 方法   | 路径                   | 说明                                      |
| ------ | ---------------------- | ----------------------------------------- |
| GET    | `/api/tasks`         | 列出任务（`?project_id=&status=`）      |
| POST   | `/api/tasks`         | 创建任务                                  |
| PUT    | `/api/tasks/:id`     | 更新任务（标记 done 时自动创建 Activity） |
| DELETE | `/api/tasks/:id`     | 删除任务（级联删除子任务）                |
| PUT    | `/api/tasks/reorder` | 批量排序（`{ids: []}`）                 |
| GET    | `/api/tasks/today`   | 今日到期 + 逾期任务                       |

### 完成记录

| 方法   | 路径                      | 说明                                           |
| ------ | ------------------------- | ---------------------------------------------- |
| GET    | `/api/activities`       | 列出记录（`?start_date=&end_date=&source=`） |
| POST   | `/api/activities`       | 添加记录                                       |
| PUT    | `/api/activities/:id`   | 更新记录                                       |
| DELETE | `/api/activities/:id`   | 删除记录                                       |
| POST   | `/api/activities/batch` | 批量添加                                       |

### 导入导出

| 方法 | 路径            | 说明                                                          |
| ---- | --------------- | ------------------------------------------------------------- |
| GET  | `/api/export` | 导出（`?period=week&date=2026-04-12&format=json&type=all`） |
| POST | `/api/import` | 导入 JSON 数据                                                |

---

## MCP Server 配置

MCP Server 允许 Claude Code 直接操作 TaskFlow 的任务数据。

### 1. 编译 MCP Server

```bash
cd server
make build-mcp
# 生成 taskflow-mcp 可执行文件
```

### 2. 获取 JWT Token

先通过 API 登录获取 token：

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_user","password":"your_pass"}'
# 返回 {"token": "eyJ..."}
```

### 3. 配置 Claude Code

在项目根目录创建 `.mcp.json`：

```json
{
  "mcpServers": {
    "taskflow": {
      "command": "/path/to/taskflow-mcp",
      "args": ["--mcp", "--api-url", "http://localhost:8080", "--token", "eyJ..."]
    }
  }
}
```

或放入全局配置 `~/.claude/mcp.json`。

### 4. 可用 Tools

| Tool                            | 说明                                                  |
| ------------------------------- | ----------------------------------------------------- |
| `taskflow_list_todos`         | 列出未完成 TODO                                       |
| `taskflow_search_todos`       | 关键词搜索 TODO                                       |
| `taskflow_update_todo_status` | 更新 TODO 状态                                        |
| `taskflow_add_activity`       | 添加完成记录                                          |
| `taskflow_session_sync`       | Session 结束一键同步（自动匹配 TODO + 创建 Activity） |
| `taskflow_get_summary`        | 获取工作摘要（按天/周/月）                            |

### 5. 自定义命令

项目内置两个 Claude Code 命令：

- `/sync` — 手动触发 TaskFlow 同步
- `/status` — 查看当前 TODO 和今日工作摘要

---

## Docker 部署

### 1. 构建并启动

```bash
docker-compose up -d --build
```

服务启动在 `http://localhost:8080`，前端静态文件已内嵌在 Go 后端中。

### 2. 自定义配置

修改 `docker-compose.yml` 中的环境变量：

```yaml
environment:
  - PORT=8080
  - DB_PATH=/data/taskflow.db
  - JWT_SECRET=your-production-secret  # 务必修改
```

数据持久化通过 Docker Volume `taskflow-data` 实现。

### 3. 单独构建镜像

```bash
docker build -t taskflow .
docker run -d \
  -p 8080:8080 \
  -e JWT_SECRET=your-secret \
  -v taskflow-data:/data \
  taskflow
```

---

## 开发

### 后端开发

```bash
cd server

# 开发模式（热重载需自行配置 air 等工具）
make dev

# 运行测试
CGO_ENABLED=1 make test

# 编译
make build        # HTTP 服务
make build-mcp    # MCP Server
```

### 前端开发

```bash
# Web 模式
npm run dev:web

# Electron 模式
npm run dev

# 构建 Web 前端
npm run build:web

# 构建 Electron 桌面应用
npm run build:win
```

### 双模式兼容

前端 API 层（`src/utils/ipc.ts`）自动检测运行环境：

- Electron 环境：走 IPC 通道
- Web 环境：走 HTTP API

因此同一套前端代码可同时用于 Electron 桌面端和纯 Web 端。

---

## 常见问题

**Q: 后端启动报 `CGO_ENABLED=0` 错误？**

A: go-sqlite3 需要 CGO 支持。Windows 下确保安装了 GCC（推荐 MinGW-w64 或 TDM-GCC），然后：

```bash
CGO_ENABLED=1 go run main.go
```

**Q: MCP Server 连接不上后端？**

A: 确保：

1. Go 后端已启动且端口正确
2. JWT Token 未过期（有效期 7 天）
3. `.mcp.json` 中的 `--api-url` 地址可访问

**Q: Docker 部署后前端页面空白？**

A: Dockerfile 已将前端构建产物内嵌到 Go 后端中。如果使用独立 nginx 部署前端，确保 API 请求转发到后端端口。

---

## License

MIT
