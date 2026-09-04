# Unknown / Risky Files Final Handling Plan

- reportType: unknown_risky_final_handling_plan
- targetDate: 2026-07-03
- generatedAt: 2026-07-08T00:50:00+08:00

## Handling Groups

- admin_api_core_review_required: 7 files; dedicated_review_required_do_not_commit_now
- auth_permission_review_required: 10 files; explicit_user_confirmation_required_do_not_commit_now
- do_not_commit: 1 files; do_not_commit
- ebos_report_only_candidate: 62 files; candidate_for_safe_plan_only_do_not_commit_in_phase_a
- external_publishing_review_required: 15 files; dedicated_review_required_do_not_commit_now
- local_cache_or_temp: 25 files; exclude_from_git_keep_or_clean_later_with_user_approval
- package_dependency_quarantine: 2 files; quarantine_do_not_commit_or_revert_now
- payment_order_revenue_review_required: 3 files; explicit_user_confirmation_required_do_not_commit_now
- prisma_migration_quarantine: 3 files; quarantine_do_not_commit_run_delete_or_move_now
- product_tool_content_review_required: 94 files; dedicated_review_required_do_not_commit_now
- rejected_script_review_required: 1 files; rejected_script_requires_manual_review
- seed_quarantine: 2 files; quarantine_do_not_commit_run_or_revert_now
- unknown_risky_requires_user_confirmation: 28 files; manual_triage_required_do_not_commit_now

## Rules

- Do not delete local cache/temp files in this phase.
- Do not commit package, Prisma, seed, admin/API/core, auth, payment/order/revenue, rejected script, or unknown/risky files.
- Only EBOS reports/docs/script candidates may proceed to Phase B safe commit planning.
- Use exact-path staging only in Phase H if Phase G passes.
