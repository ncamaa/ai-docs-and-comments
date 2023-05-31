// Define the structure of the configuration object
export interface Config {
  apiKey: string;
  engine: string;
  maxTokens: number;
  codeLanguage: string;
}

// declare an interface for the options of generatePromptForDocOnly
export interface PromptOptions {
  codeLanguage: string;
  functionText: string;
}

// declare an interface for the options of sanitizeAIResult
export interface sanitizeResultOptions {
  textResult: string;
  codeLanguage: string;
  functionText?: string;
}

// New interface for the options of generateJSDocFromOpenAI
export interface GenerateJSDocFromOpenAIOptions extends Config {
  apiKey: string;
  engine: string;
  maxTokens: number;
  codeLanguage: string;
  functionText: string;
}
