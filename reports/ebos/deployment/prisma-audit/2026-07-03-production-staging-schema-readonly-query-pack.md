# Production/Staging Schema Readonly Query Pack

Run this SQL only in explicitly labeled readonly production and staging sessions. Do not paste credentials into reports.

- sqlContainsOnlySelect: `true`
- expectedObjectsCount: `12`

## Expected Objects

- 20260624013000_add_tool_video_fields: tools.video_url
- 20260624013000_add_tool_video_fields: tools.video_title
- 20260624013000_add_tool_video_fields: tools.video_description
- 20260624141000_add_baidu_push_queue: BaiduPushQueueStatus
- 20260624141000_add_baidu_push_queue: baidu_push_queue_items
- 20260624141000_add_baidu_push_queue: baidu_push_queue_items_url_key
- 20260624141000_add_baidu_push_queue: baidu_push_queue_items_status_next_attempt_at_idx
- 20260630120000_add_ai_trend_briefing_video_fields: ai_trend_briefings.video_url
- 20260630120000_add_ai_trend_briefing_video_fields: ai_trend_briefings.video_title
- 20260630120000_add_ai_trend_briefing_video_fields: ai_trend_briefings.video_description
- 20260630120000_add_ai_trend_briefing_video_fields: ai_trend_briefings.video_poster_url
- 20260630120000_add_ai_trend_briefing_video_fields: ai_trend_briefings.video_duration_seconds
