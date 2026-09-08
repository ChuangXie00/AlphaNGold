# AlphaNGold Frontend

AlphaNGold 的 React 前端，负责个人主页、AI Assistant 入口和 Gold Dashboard 入口。

## 技术栈

| 用途             | 技术                                 |
| ---------------- | ------------------------------------ |
| 页面开发         | React、TypeScript                    |
| 开发服务器与构建 | Vite                                 |
| 路由             | React Router                         |
| 国际化           | i18next、react-i18next               |
| 测试             | Vitest、React Testing Library、jsdom |
| 代码检查与格式化 | ESLint、Prettier                     |

依赖版本和可用脚本以 [package.json](./package.json) 为准。

## 本地启动

项目开发环境按 Node.js 24 LTS 和 npm 配置。以下命令使用 PowerShell，从仓库根目录开始：

```powershell
cd frontend
npm ci
```

首次配置时，将环境模板复制为本地文件。如果 `.env.local` 已存在，保留并检查现有配置，无需再次复制。

```powershell
Copy-Item -LiteralPath .env.example -Destination .env.local
npm run dev
```

以终端输出的 URL 为准，通常为 `http://localhost:5173`。当前后端 CORS 允许 `http://localhost:5173` 和 `http://localhost:5174`。若 Vite 使用其他端口，需调整启动端口或后端允许的 Origin；`127.0.0.1` 与 `localhost` 也属于不同 Origin。

当前页面骨架可以独立启动。后续真实数据联调的启动顺序为 PostgreSQL → Spring Boot（`local` Profile）→ React。后端默认地址为 `http://localhost:8080`，本地数据库配置由后端独立管理。

## 环境变量

前端模板位于 [`.env.example`](./.env.example)，本地配置使用 `frontend/.env.local`：

```dotenv
VITE_API_BASE_URL=http://localhost:8080
```

| 项目                | 约定                                             |
| ------------------- | ------------------------------------------------ |
| `VITE_API_BASE_URL` | 后端 origin，只包含协议、主机和可选端口          |
| 本地示例            | `http://localhost:8080`                          |
| API 路径            | 由服务方法追加，例如 `/api/v1/projects`          |
| 配置文件            | `.env.example` 提交 Git，`.env.local` 保留在本地 |
| 类型声明            | `src/vite-env.d.ts`，变量当前声明为可选字符串    |

当前 Vite 没有配置 `envDir`，从 `frontend` 启动时默认读取该目录下的环境文件。仓库根目录模板中的同名变量不会因此自动生效；`.env.example` 本身也只是模板。

修改环境文件后需要重启 Vite。前端构建会将使用到的 `VITE_` 变量写入产物，因此只能存放公开配置，不能放数据库密码或 API 密钥。

类型声明不代表运行时配置已经存在。

## 页面路由

| 路径         | 页面           | 当前状态                                       |
| ------------ | -------------- | ---------------------------------------------- |
| `/`          | Main           | 个人内容主页                                   |
| `/assistant` | AI Assistant   | AI Assistant 占位页                            |
| `/dashboard` | Gold Dashboard | Gold Dashboard 占位页                          |
| 其他路径     | 404            | 基础提示页                                     |

路由定义位于 `src/App.tsx`，导航位于 `src/components/AppNav.tsx`。

## API 接入约定

以下接口已由 Java 后端实现，前端服务封装和页面接入属于 E5 待完成内容。

| 方法 | 路径               | 成功响应中的 `data`                                        |
| ---- | ------------------ | ---------------------------------------------------------- |
| GET  | `/api/v1/health`   | `{ "status": "up", "service": "alphangold-java-backend" }` |
| GET  | `/api/v1/projects` | `MyProjExp` 数组；没有记录时为 `[]`                        |

完整请求地址示例：`http://localhost:8080/api/v1/projects`。

### 统一响应

| 字段        | 含义                                                     |
| ----------- | -------------------------------------------------------- |
| `success`   | 请求是否成功，布尔值                                     |
| `data`      | 成功时的业务数据；失败时为 `null`                        |
| `error`     | 成功时为 `null`；失败时包含 `code`、`message`、`details` |
| `timestamp` | 带时区的时间字符串                                       |

`error.details` 为字段名到错误说明的映射，无额外详情时为 `{}`。前端 Client 将同时检查 HTTP 状态和统一响应，处理网络失败、超时及无效响应。

## 目录说明

| 路径                      | 用途                                 |
| ------------------------- | ------------------------------------ |
| `src/pages/`              | Main、占位页与 404                   |
| `src/components/`         | 导航等共享组件                       |
| `src/i18n/`               | i18n 初始化与 `en`、`zh-CN` 翻译资源 |
| `src/styles/`             | 当前使用的全局样式                   |
| `src/assets/`             | 图片等静态资源                       |
| `src/tests/`              | 测试初始化与现有应用冒烟测试         |
| `src/vite-env.d.ts`       | 前端环境变量类型声明                 |
| `src/services/`           | API Client、响应类型与接口服务       |

## 开发检查

以下命令均在 `frontend` 目录执行：

```powershell
npm run test
npm run lint
npm run build
```

`test` 执行一次测试，`build` 执行 TypeScript 检查并生成 `dist/`。当前测试只覆盖首页标题，API 与页面状态测试待 E5 补充。

其他可用命令：

| 命令                   | 用途                       |
| ---------------------- | -------------------------- |
| `npm run test:watch`   | 监听文件变化并运行测试     |
| `npm run format:check` | 检查格式                   |
| `npm run format`       | 格式化文件，会修改文件内容 |
| `npm run preview`      | 本地预览已生成的构建产物   |

预览服务器的 Origin 可能与开发服务器不同。联调时需核对实际地址与后端 CORS 配置。
