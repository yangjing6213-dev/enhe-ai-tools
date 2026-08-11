# 支付网关正式契约：易支付 / ZPAY

本契约采用 `docs/enhe-redesign/14-PAYMENT-AND-PHASE0-DECISION-ADDENDUM.md:20-137` 的已确认决策。

## 网关与方式

- 支付宝和微信共用一个易支付 / ZPAY 网关、同一组 API 配置、同一签名算法和同一回调入口。
- `type=alipay` 表示支付宝；`type=wxpay` 表示微信。
- 前台默认支付宝，用户可切换微信。
- 首选服务器生成签名后的 POST 表单提交到 `https://zpayz.cn/submit.php`。密钥只在服务器；签名参数可以提交给网关，不得把密钥发到浏览器。

## 参数与金额

核心参数：`name`、`money`、`type`、`out_trade_no`、`notify_url`、`pid`、`return_url`、`sign`、`sign_type=MD5`；`cid`/`param` 仅在确有需要时使用。

- `out_trade_no` 是每次支付尝试唯一、最多 32 位的 provider 订单号，与 ENHE 内部订单主键分离。
- 服务端依据价格快照和有效优惠券计算 Decimal 实付金额；不信任前端金额；最多两位小数。
- 回调 `money` 必须与服务器订单实际应付金额完全相等。

## 回调与返回页

- `notify_url` 是支付成功的唯一主要入口，按当前网关协议使用 GET。
- `return_url` 只显示查询状态，不能直接更新订单为已支付。
- 两者均不依赖查询参数识别订单；用 `out_trade_no` 查询服务器订单。
- 回调按顺序校验：`sign_type`、MD5 签名、`pid`、`out_trade_no`、`trade_no`、`type` 与支付尝试一致、`trade_status=TRADE_SUCCESS`、金额。
- 事务和唯一约束成功后返回纯文本 `success`。
- 已处理或重复通知必须安全返回 `success`，不得重复开通权限、发券、核券或通知。

## 查单、退款、补偿

- 查单：服务器调用 `api.php?act=order`，按 `out_trade_no` 或 `trade_no` 查询。
- 退款：服务器调用 `api.php?act=refund`，记录请求与结果。
- 必须具备支付确认中定时补偿、回调失败/权限失败重试、定期对账和异常告警。
- 普通日志、分析事件、错误页面不得输出 `pid`、`key`、签名、支付账号或含密钥完整 URL。

## 配置名称

优先复用当前名称：`ZPAY_API_BASE`、`ZPAY_PID`、`ZPAY_KEY`、`ZPAY_DEFAULT_TYPE`、`ZPAY_CHANNEL_ID`、站点 URL配置。目标抽象可映射为 `ZPAY_BASE_URL`、`ZPAY_NOTIFY_URL`、`ZPAY_RETURN_URL`、可选 `ZPAY_CID`；不得建立两套支付宝/微信密钥。

## 历史链路

`PaymentProof` 历史记录只读保留；新版停止新订单付款凭证上传和人工审核。未结旧订单迁移策略另行评审，不物理删除旧表、旧文件或旧记录。
