export type Workspace = {
  domains: string[]; // allowed origins (https://example.com)
  defaults?: {
    ai?: { decision?: boolean; discovery?: "suggest" | "off"; copy?: "approve" | "auto" };
    log_sample_rate?: number;
  };
};

export type Site = {
  workspaceId: string;
  domains: string[];
  publicKey?: string;
  defaults?: Workspace["defaults"]; // optional overrides
};

export type ActionDoc = {
  workspaceId: string;
  type: "modal" | "banner" | "toast";
  selector?: string;
  creative: {
    title?: string;
    body?: string;
    cta_text?: string;
    cta_url?: string;
    image_url?: string; // optional for future
  };
};

export type Scenario = {
  workspaceId: string;
  siteId: string;
  name: string;
  status: "active" | "paused";
  priority?: number;
  entry_rules?: any;
  actionRefs?: Array<{
    actionId: string;
    enabled?: boolean;
    order?: number;
    overrideCreative?: Partial<ActionDoc["creative"]>;
    selector?: string;
    type?: ActionDoc["type"]; // override
  }>;
};
