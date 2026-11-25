/** View models produced by the support API adapters. */
export interface GuideTopic {
  value: string;
  label: string;
  icon: string;
  slug: string | null;
}

export interface GuideSummary {
  id: string;
  title: string;
  summary: string;
  topic: string | null;
  topicInfo: GuideTopic;
  readMinutes: number | null;
}

export interface GuideSection {
  heading: string;
  body?: string;
  steps?: string[];
  tip?: string;
}

export interface RelatedGuide { id: string; title: string; }

export interface GuideView extends GuideSummary {
  updated: string;
  sections: GuideSection[];
  related: RelatedGuide[] | null;
  allowFeedback: boolean | null;
  vote: 'yes' | 'no' | null;
}
