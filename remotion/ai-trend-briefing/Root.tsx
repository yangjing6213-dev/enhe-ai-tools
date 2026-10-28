import React from "react";
import { Composition } from "remotion";
import { AiTrendBriefingVideo } from "./AiTrendBriefingVideo";
import type { AiTrendVideoProps } from "./types";

const defaultProps: AiTrendVideoProps = {
  date: "2026-06-30",
  title: "AI 需求趋势分析",
  coreConclusion: "用户更愿意为节省时间、提升交付质量的 AI 工作流买单。",
  summary: "本期聚焦工作效率、视频生成、内容创作和搜索研究四个方向。",
  sourceCount: 6,
  directions: ["工作效率", "视频生成", "内容创作", "搜索研究"],
  scenes: [
    {
      title: "工作效率",
      body: "会议纪要、邮件草拟、表格清洗和流程同步，可从一项任务开始验证实际节省的时间。"
    },
    {
      title: "视频生成",
      body: "检查批量生产、版权合规和可复用模板是否满足具体交付需求。"
    },
    {
      title: "搜索研究进入任务化阶段",
      body: "核对引用来源、证据链和可交付的研究包，判断结果能否用于实际任务。"
    }
  ]
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AiTrendBriefing"
      component={AiTrendBriefingVideo}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={270}
      defaultProps={defaultProps}
    />
  );
};
