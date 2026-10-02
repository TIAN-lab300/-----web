# 提醒服务 API 规范

日期：2026-10-02  
状态：待实现  
适用范围：本地待办应用的设备订阅和提醒计划同步

## 1. 基本约定

- Base URL 通过 `REMINDER_API_BASE_URL` 配置。
- 所有接口使用 HTTPS。
- 请求和响应使用 `application/json`。
- 时间使用 UTC ISO 8601 字符串。
- API 版本放在路径中，当前为 `/api`。
- 不使用用户账号，使用设备级认证。

## 2. 认证

设备首次启用提醒时调用设备注册接口，获得：

```text
deviceId
deviceSecret
```

后续请求头：

```http
Authorization: Bearer <deviceSecret>
```

服务端只保存 `deviceSecret` 的哈希。设备 secret 丢失后不能恢复，需要重新注册并订阅。

## 3. 数据结构

### 3.1 PushSubscription

```json
{
  "endpoint": "https://push.example/subscription-id",
  "expirationTime": null,
  "keys": {
    "p256dh": "base64-public-key",
    "auth": "base64-auth-secret"
  }
}
```

### 3.2 ReminderSchedule

```json
{
  "id": "reminder-id",
  "taskId": "task-id",
  "title": "健身",
  "anchor": "dueAt",
  "fireAt": "2026-10-03T10:00:00.000Z",
  "timeZone": "Asia/Shanghai",
  "recurrence": {
    "mode": "weekly",
    "weekdays": [1, 3, 5]
  },
  "enabled": true
}
```

## 4. 接口

### 4.1 注册设备

```http
POST /api/devices
```

请求：

```json
{
  "deviceId": "locally-generated-id",
  "deviceSecret": "high-entropy-random-secret",
  "timeZone": "Asia/Shanghai"
}
```

响应：

```json
{
  "deviceId": "locally-generated-id",
  "createdAt": "2026-10-02T10:00:00.000Z"
}
```

约束：

- `deviceId` 必须是由前端生成的随机值。
- `deviceSecret` 只在注册请求中传输一次，服务端使用 pepper 哈希后保存。
- 服务端再次校验格式和请求频率。
- 不能用设备指纹替代。

### 4.2 幂等注册设备

```http
PUT /api/devices/{deviceId}
```

用于浏览器数据恢复或重新安装后同步设备信息。重复调用必须返回相同结果。

### 4.3 保存或替换 PushSubscription

```http
PUT /api/devices/{deviceId}/subscription
```

请求：

```json
{
  "subscription": {
    "endpoint": "https://push.example/subscription-id",
    "expirationTime": null,
    "keys": {
      "p256dh": "base64-public-key",
      "auth": "base64-auth-secret"
    }
  }
}
```

响应：

```json
{
  "subscriptionId": "subscription-id",
  "updatedAt": "2026-10-02T10:00:00.000Z"
}
```

### 4.4 删除 PushSubscription

```http
DELETE /api/devices/{deviceId}/subscription
```

响应：

```text
204 No Content
```

### 4.5 全量替换提醒计划

```http
PUT /api/devices/{deviceId}/reminders
```

请求：

```json
{
  "scheduleVersion": 12,
  "reminders": [
    {
      "id": "reminder-id",
      "taskId": "task-id",
      "title": "健身",
      "anchor": "dueAt",
      "fireAt": "2026-10-03T10:00:00.000Z",
      "timeZone": "Asia/Shanghai",
      "recurrence": {
        "mode": "weekly",
        "weekdays": [1, 3, 5]
      },
      "enabled": true
    }
  ]
}
```

响应：

```json
{
  "acceptedVersion": 12,
  "scheduledCount": 1
}
```

约束：

- `scheduleVersion` 必须单调递增。
- 旧版本请求不能覆盖新版本。
- 后端在一次事务中替换该设备的全部提醒。
- `reminders` 最多允许的数量必须在实现阶段固定。

### 4.6 查询同步状态

```http
GET /api/devices/{deviceId}/reminders/status
```

响应：

```json
{
  "acceptedVersion": 12,
  "scheduledCount": 1,
  "nextFireAt": "2026-10-03T10:00:00.000Z",
  "subscriptionStatus": "active"
}
```

用于页面恢复后确认后端计划是否和本地一致。

### 4.7 删除全部提醒

```http
DELETE /api/devices/{deviceId}/reminders
```

响应：

```text
204 No Content
```

只删除服务端提醒计划，不删除本地任务。

## 5. 错误格式

统一错误结构：

```json
{
  "error": {
    "code": "INVALID_SCHEDULE",
    "message": "提醒计划不合法",
    "requestId": "request-id"
  }
}
```

常见状态码：

| 状态码 | 含义 |
| --- | --- |
| `400` | 请求格式或字段不合法 |
| `401` | 设备认证失败 |
| `403` | 设备无权访问该资源 |
| `404` | 设备或订阅不存在 |
| `409` | `scheduleVersion` 冲突 |
| `413` | 提醒计划过大 |
| `429` | 请求过于频繁 |
| `503` | 调度或推送服务暂不可用 |

## 6. 安全和隐私

- 所有提醒接口必须启用设备认证。
- 服务端不保存任务主数据。
- 服务端不返回任务列表。
- 默认通知只发送最小必要内容。
- 不得将 `deviceSecret`、订阅密钥或完整推送 endpoint 写入日志。
- CORS 只允许应用的正式来源。
- 请求体限制大小，并校验所有字段。

## 7. 版本兼容

- API 变更必须评估旧客户端兼容性。
- 新增可选字段不能破坏旧客户端。
- 删除字段或改变语义必须提升 API 版本。
- 服务端返回未知字段时，前端应忽略而不是崩溃。
