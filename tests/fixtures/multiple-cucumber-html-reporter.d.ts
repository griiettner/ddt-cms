declare module 'multiple-cucumber-html-reporter' {
  interface BrowserInfo {
    name: string;
    version: string;
  }

  interface PlatformInfo {
    name: string;
    version: string;
  }

  interface Metadata {
    browser?: BrowserInfo;
    device?: string;
    platform?: PlatformInfo;
  }

  interface CustomDataItem {
    label: string;
    value: string;
  }

  interface CustomData {
    title: string;
    data: CustomDataItem[];
  }

  interface GenerateOptions {
    jsonDir: string;
    reportPath: string;
    reportName?: string;
    pageTitle?: string;
    pageFooter?: string;
    displayDuration?: boolean;
    displayReportTime?: boolean;
    hideMetadata?: boolean;
    metadata?: Metadata;
    customData?: CustomData;
  }

  export function generate(options: GenerateOptions): void;
}
