export declare const FORUM_TOPIC_TIME_ZONE: "Asia/Shanghai";

export declare function getShanghaiForumClock(date?: Date): {
  date: string;
  minute: number;
};

export declare function getDailyAiForumTopicMinute(localDate: string): number;

export declare function isDailyAiForumTopicDue(date?: Date): {
  date: string;
  minute: number;
  scheduledMinute: number;
  due: boolean;
};
