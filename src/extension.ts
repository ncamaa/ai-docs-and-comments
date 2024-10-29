import * as vscode from "vscode";

import OpenAI from "openai";


import * as interfaces from "./interfaces";

import { COST_PER_TOKEN, LOG_PROMO, popup } from "./constants";

import {
  generatePromptForAddingComments,
  generatePromptForGettingFunctionAndDoc,
} from "./prompts";

async function getConfiguration(): Promise<interfaces.Config | null> {
  const config = vscode.workspace.getConfiguration("aiDocsAndComments.openAI");

  const apiKey = config.get<string>("apiKey", "");
  const engine = config.get<string>("engine", "gpt-3.5-turbo");
  const maxTokens = config.get<number>("maxTokens", 60);
  let codeLanguage = config.get<string>("codeLanguage", "JavaScript");

  const customCodeLanguage = config.get<string>("customCodeLanguage", "");
  if (customCodeLanguage) {
    codeLanguage = customCodeLanguage;
  }

  console.log(LOG_PROMO, { apiKey, engine, maxTokens, codeLanguage });

  if (
    typeof apiKey !== "string" ||
    apiKey.length === 0 ||
    typeof engine !== "string" ||
    typeof codeLanguage !== "string" ||
    typeof maxTokens !== "number"
  ) {
    showError("Invalid AI Docs & Comments extension configuration. Please check your settings.");
    return null;
  }

  // Verify the engine with available models from OpenAI
  const openAiClient = new OpenAI({ apiKey });
  try {
    const models = await openAiClient.models.list();
    const modelIds = models.data.map(model => model.id);

    if (!modelIds.includes(engine)) {
      showError(`The engine "${engine}" is not available. Please select a valid engine in the settings. More info here: https://platform.openai.com/docs/models/model-endpoint-compatibility`);
      return null;
    }
  } catch (error) {
    showError("Failed to fetch available models. Please check your API key and connection.");
    console.error("Model fetch error:", error);
    return null;
  }

  popup(`Engine: ${engine}, with maximum ${maxTokens} tokens per request. Code language: ${codeLanguage}`);
  return { apiKey, engine, maxTokens, codeLanguage };
}

function showError(message: string) {
  vscode.window
    .showErrorMessage(message, { modal: true }, { title: "Open Settings" })
    .then(selection => {
      if (selection && selection.title === "Open Settings") {
        vscode.commands.executeCommand("workbench.action.openSettings", "AI Docs & Comments - OpenAI");
      }
    });
}

export function activate(context: vscode.ExtensionContext) {
  console.log(
    LOG_PROMO,
    'Congratulations, your extension "ai-docs-and-comments" is now active!'
  );

  // Registering the go to settings command
  let goToSettingsDisposable = vscode.commands.registerCommand(
    "ai-docs-and-comments.goToSettings",
    async () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "AI Docs & Comments - OpenAI"
      );
    }
  );

  // Registering the createDocumentation command
  let createDocumentationDisposable = vscode.commands.registerCommand(
    "ai-docs-and-comments.createDocumentation",
    async () => {
      popup("Generating documentation, hold tight...");

      const config = await getConfiguration();
      if (!config) {
        // show error message
        vscode.window.showErrorMessage(
          "Invalid configuration. Please check your settings."
        );

        return;
      }

      // Fetching the user's settings
      const { apiKey, engine, maxTokens, codeLanguage } = config;

      // Accessing the active text editor
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        popup("No editor is active");
        return;
      }

      // Fetching the selected text from the editor
      const selection = editor.selection;
      const functionText = editor.document.getText(selection).trim();

      console.log(LOG_PROMO, { functionText });
      // Calling the OpenAI API to generate the documentation
      const jsDoc = await generateJSDocFromOpenAI({
        apiKey,
        engine,
        maxTokens,
        codeLanguage,
        functionText,
      });

      // Inserting the generated documentation into the editor
      // editor.edit((editBuilder) => {
      //   editBuilder.insert(selection.start, jsDoc + "\n");
      // });

      // replace the text in the text editor with the new text
      editor.edit((editBuilder) => {
        editBuilder.replace(selection, jsDoc);
      });
    }
  );

  // Registering the addComments command
  let addCommentsDisposable = vscode.commands.registerCommand(
    "ai-docs-and-comments.addComments",
    async () => {
      popup("Generating comments (experimental), hold tight... ");
      const config = await getConfiguration();
      if (!config) {
        // show error message
        vscode.window.showErrorMessage(
          "Invalid configuration. Please check your settings."
        );
        return;
      }

      // Fetching the user's settings
      const { apiKey, engine, maxTokens, codeLanguage } = config;

      // Accessing the active text editor
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        popup("No editor is active");
        return;
      }

      // Fetching the selected text from the editor
      const selection = editor.selection;
      const functionText = editor.document.getText(selection).trim();

      let functionWithComments = await getSameFunctionWithCommentsFromOpenAI({
        apiKey,
        engine,
        maxTokens,
        codeLanguage,
        functionText,
      });

      // now replace the text in the text editor with the new text
      editor.edit((editBuilder) => {
        editBuilder.replace(selection, functionWithComments);
      });
    }
  );

  context.subscriptions.push(
    createDocumentationDisposable,
    addCommentsDisposable,
    goToSettingsDisposable
  );
}

async function generateJSDocFromOpenAI(
  options: interfaces.GenerateJSDocFromOpenAIOptions
): Promise<string> {
  const openAiClient = new OpenAI({
    apiKey: options.apiKey,
  });

  const prompt = generatePromptForGettingFunctionAndDoc({
    codeLanguage: options.codeLanguage,
    functionText: options.functionText,
  });

  console.log(LOG_PROMO, { prompt });

  try {
    // Using chat completion for chat models like gpt-3.5-turbo
    const result = await openAiClient.chat.completions.create({
      model: options.engine,
      messages: [{ role: "user", content: prompt }],
      max_tokens: options.maxTokens,
      temperature: 0.1,
    });

    showEstimatedCost(result);

    const textResult = result.choices[0].message?.content || "";

    const sanitizedTextResult = sanitizeAIResult({
      textResult,
      codeLanguage: options.codeLanguage,
    });

    return sanitizedTextResult;
  } catch (error) {
    console.error("Error generating JSDoc:", error);
    vscode.window.showErrorMessage(`error: "${error}`);
    return "// problem generating documentation";
  }
}


// generate prompt for documentation only
function generatePromptForDocOnly(options: interfaces.PromptOptions): string {
  const { codeLanguage, functionText } = options;

  const prompt = `Provide function documentation including a short function description, vars description, and return description, and if needed also other info, in the style typically used for ${codeLanguage} (as "JS Doc" is for Javascript ${
    codeLanguage === "Javascript" ? "" : "just for " + codeLanguage
  }), excluding function code, only documentation to be placed above the function. Function is:\n${functionText}`;

  return prompt;
}

const sanitizeAIResult = (
  options: interfaces.sanitizeResultOptions
): string => {
  let { textResult, codeLanguage } = options;

  codeLanguage = codeLanguage.toLocaleLowerCase();

  switch (codeLanguage) {
    case "javascript":
      return sanitizeJSDoc(textResult);

    case "python":
      return sanitizePythonDoc(textResult);

    default:
      console.log(
        LOG_PROMO,
        "No sanitization for this language. Returning the text as is."
      );
      return textResult;
  }
};

const sanitizeJSDoc = (
  textResult: string,
  onlyDoc: boolean = false
): string => {
  if (onlyDoc) {
    // get only the part that starts with /** and ends with */, including.
    const functionDoc = textResult.match(/\/\*\*[\s\S]*?\*\//g)?.[0] || "";
    return functionDoc;
  }
  // else return the whole function with the doc. remove all chars before "/**" and after the closing bracket of the function "}".
  // first find first index of "/**":
  const docStartIndex = textResult.indexOf("/**");
  // then find the last index of "}":
  const functionEndIndex = textResult.lastIndexOf("}");
  // then return the substring from the docStartIndex to the functionEndIndex:
  textResult = textResult.substring(docStartIndex, functionEndIndex + 1);

  return textResult;
};

const sanitizePythonDoc = (textResult: string) => {
  // find the first index of "def" in the string:
  const defIndex = textResult.indexOf("def");

  // substring from the first index of "def" to the end of the string:
  textResult = textResult.substring(defIndex);

  return textResult;
};

async function getSameFunctionWithCommentsFromOpenAI(
  options: interfaces.GenerateJSDocFromOpenAIOptions
): Promise<string> {
  const openAiClient = new OpenAI({
    apiKey: options.apiKey,
  });

  const prompt = generatePromptForAddingComments({
    codeLanguage: options.codeLanguage,
    functionText: options.functionText,
  });

  console.log(LOG_PROMO, { prompt });

  try {
    // Using chat completion for chat models like gpt-3.5-turbo
    const result = await openAiClient.chat.completions.create({
      model: options.engine,
      messages: [{ role: "user", content: prompt }],
      max_tokens: options.maxTokens,
      temperature: 0.1,
    });

    showEstimatedCost(result);

    const textResult = result.choices[0].message?.content || "";
    return textResult;
  } catch (error) {
    vscode.window.showErrorMessage(`error: "${error}`);
    return "// problem generating documentation";
  }
}


const showEstimatedCost = (
  result: OpenAI.Chat.ChatCompletion | OpenAI.Completions.Completion & {
    _request_id?: string | null;
  }
) => {
  const totalTokens = result.usage?.total_tokens || 0;
  const estimatedCost = totalTokens * COST_PER_TOKEN;

  console.log(LOG_PROMO, `Total tokens used: ${totalTokens}`);
  console.log(LOG_PROMO, `Cost per token: $${COST_PER_TOKEN}`);
  console.log(LOG_PROMO, `Estimated cost: $${estimatedCost.toFixed(6)}`);

  popup(`Estimated cost: $${estimatedCost.toFixed(5)}`);
};



export function deactivate() {}

