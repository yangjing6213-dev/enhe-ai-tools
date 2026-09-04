# EBOS Deployment Approval Response Parser

## 1. Why Approval Parsing Exists

Production deployment must not start from vague approval language. EBOS needs a deterministic parser so `ready_to_deploy` cannot accidentally become an executed deployment.

## 2. Exact Match Requirement

The only accepted phrase is:

```text
确认部署验证页
```

Leading and trailing whitespace are allowed. Extra words, partial phrases, or translated phrases are rejected.

## 3. Rejected Phrases

These do not approve deployment:

- 确认
- 开始部署
- 部署吧
- 好的
- 可以
- yes
- ok

## 4. Blocked Dangerous Instructions

If the response includes dangerous instructions, the parser returns `blocked`. Examples:

- 顺便 migrate
- 删除数据库
- 重启服务器
- 打印环境变量
- SSH / Docker / Nginx production commands

## 5. Dry-Run vs --apply

`parse-ebos-deployment-approval-response.ts` only parses and writes an audit report.

`approve-ebos-deployment-execution.ts` defaults to dry-run and does not write status. Only `--apply` plus an exact approval phrase can update the status file.

## 6. approved_not_executed vs deployed

`approved_not_executed` means the user approved entering the deployment execution stage. It does not mean deployment happened.

Deployment can be considered verified only after execution records and post-launch checks support that status.

## 7. Next Step

After an exact phrase is parsed, run the approval script in dry-run first. Use `--apply` only when the intent is to update local EBOS execution status from `awaiting_approval` to `approved_not_executed`.
