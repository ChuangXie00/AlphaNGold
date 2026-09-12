# AlphaNGold Frontend

AlphaNGold 的 React 前端，负责个人主页、AI Assistant 入口和 Gold Dashboard 入口。

## 技术栈

| 用途             | 技术                                 |
| ---------------- | ------------------------------------ |
| 页面开发         | React、TypeScript                    |
| 开发服务器与构建 | Vite                                 |
| 路由             | React Router                         |
| 国际化           | i18next、react-i18next               |
| HTTP 请求        | Axios（浏览器 XHR adapter）          |
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

前端可以独立启动；显示数据库项目内容时，启动顺序为 PostgreSQL → Spring Boot（`local` Profile）→ React。后端默认地址为 `http://localhost:8080`，配置和启动命令见 [后端说明](../java-backend/README.md)。

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

| 路径         | 页面           | 当前状态              |
| ------------ | -------------- | --------------------- |
| `/`          | Main           | 个人内容主页          |
| `/assistant` | AI Assistant   | AI Assistant 占位页   |
| `/dashboard` | Gold Dashboard | Gold Dashboard 占位页 |
| 其他路径     | 404            | 基础提示页            |

路由定义位于 `src/App.tsx`，导航位于 `src/components/AppNav.tsx`。

## API 接入约定

以下接口已由 Java 后端实现，并提供前端服务封装；Main 页面使用项目接口读取数据。

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

`error.details` 为字段名到错误说明的映射，无额外详情时为 `{}`。

请求链路为页面 → 业务服务 → HTTP Client。`src/api/client.ts` 使用一个延迟初始化的 Axios instance，首次请求时检查 API origin，默认超时为 10 秒，支持调用方通过 `AbortSignal` 取消。HTTP 响应保持为文本，由 `src/api/contract.ts` 解析 JSON、检查统一响应并处理 HTTP 或业务错误，再由业务服务校验 Health 或项目字段。

非 2xx 响应始终作为 HTTP 错误处理，包括 HTML 错误页；合法失败响应中的后端错误码和字段详情会保留。页面使用固定的双语提示，不直接展示内部错误消息。Main 页面保留手动重试、卸载取消和旧结果隔离；项目列表保留后端顺序，切换语言不会重新请求。

`getHealth()` 仅表示 Java 可以响应，不保证数据库可用，也不是项目请求的前置检查。

## 目录说明

| 路径                     | 用途                                          |
| ------------------------ | --------------------------------------------- |
| `src/pages/`             | Main、占位页与 404                            |
| `src/components/`        | 导航等共享组件                                |
| `src/i18n/`              | i18n 初始化与 `en`、`zh-CN` 翻译资源          |
| `src/styles/`            | 当前使用的全局样式                            |
| `src/assets/`            | 图片等静态资源                                |
| `src/tests/`             | Client、契约、服务、页面与语言测试            |
| `src/vite-env.d.ts`      | 前端环境变量类型声明                          |
| `src/api/`               | HTTP Client、公共错误、统一响应类型与契约检查 |
| `src/services/health/`   | Health 服务及业务类型                         |
| `src/services/myProjExp/` | MyProjExp 服务及业务类型                      |

## 开发检查

以下命令均在 `frontend` 目录执行：

```powershell
npm run test
npm run lint
npm run build
```

`test` 执行一次测试，`build` 在 TypeScript 严格检查通过后生成 `dist/`。应用和 Vite 配置均启用 `strict`。测试覆盖请求配置与错误适配、JSON 和统一响应、业务字段校验，以及页面加载／成功／空态／错误、手动重试、取消、旧结果隔离、路由和语言偏好。单元测试默认阻止未模拟的 fetch 和 XHR 请求；真实浏览器的超时、慢响应体及后端联调单独验收。

Windows PowerShell 如果拦截 `npm.ps1`，可使用 `npm.cmd test`、`npm.cmd run lint` 和 `npm.cmd run build`，无需改变系统执行策略。

其他可用命令：

| 命令                   | 用途                       |
| ---------------------- | -------------------------- |
| `npm run test:watch`   | 监听文件变化并运行测试     |
| `npm run format:check` | 检查格式                   |
| `npm run format`       | 格式化文件，会修改文件内容 |
| `npm run preview`      | 本地预览已生成的构建产物   |

预览服务器的 Origin 可能与开发服务器不同。联调时需核对实际地址与后端 CORS 配置。
