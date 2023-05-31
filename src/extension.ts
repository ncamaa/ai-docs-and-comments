import * as vscode from "vscode";
import {
  Configuration,
  CreateCompletionResponse,
  OpenAIApi,
  CreateCompletionRequest,
} from "openai";

import * as interfaces from "./interfaces";

const COST_PER_TOKEN = 0.06 / 1000; // Assuming $0.06 per 1000 tokens for Davinci engine

const LOG_PROMO = `AI Docs & Comments: `;

const popup = vscode.window.showInformationMessage;

// Function to get configuration details from the user's settings
function getConfiguration(): interfaces.Config | null {
  // Fetch the settings using the id you defined in your package.json
  const config = vscode.workspace.getConfiguration("aiDocsAndComments.openAI");

  // Get each setting using the .get method and the configuration's property key
  const apiKey = config.get<string>("apiKey", "");
  const engine = config.get<string>("engine", "text-davinci-002");
  const maxTokens = config.get<number>("maxTokens", 60);
  let codeLanguage = config.get<string>("codeLanguage", "JavaScript");

  // if aiDocsAndComments.openAI.customCodeLanguage override codeLanguage
  const customCodeLanguage = config.get<string>("customCodeLanguage", "");
  if (customCodeLanguage) {
    codeLanguage = customCodeLanguage;
  }

  // log the selected settings
  console.log(LOG_PROMO, { apiKey, engine, maxTokens, codeLanguage });

  // Check the validity of the settings and show an error message if invalid
  if (
    typeof apiKey !== "string" ||
    apiKey.length === 0 ||
    typeof engine !== "string" ||
    typeof codeLanguage !== "string" ||
    typeof maxTokens !== "number"
  ) {
    vscode.window
      .showErrorMessage(
        "Invalid AI Docs & Comments extension configuration. Please check your settings.",
        { modal: true },
        { title: "Open Settings" }
      )
      .then((selection) => {
        if (selection && selection.title === "Open Settings") {
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "AI Docs & Comments - OpenAI"
          );
        }
      });
    return null;
  }

  // show a message with the config:
  popup(
    `Engine: ${engine}, with maximum ${maxTokens} tokens per request. Code language: ${codeLanguage}`
  );

  // Return the settings as an object
  return { apiKey, engine, maxTokens, codeLanguage };
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

      const config = getConfiguration();
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
      const config = getConfiguration();
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
  // Create a configuration for OpenAI with the user's API key
  const conf = new Configuration({
    apiKey: options.apiKey,
  });
  const openAiClient = new OpenAIApi(conf);

  const prompt = generatePromptForGettingFunctionAndDoc({
    codeLanguage: options.codeLanguage,
    functionText: options.functionText,
  });

  console.log(LOG_PROMO, { prompt });

  try {
    const createCompletionRequest: CreateCompletionRequest = {
      model: options.engine,
      prompt,
      max_tokens: options.maxTokens,
      temperature: 0.1,
    };

    console.log(LOG_PROMO, { createCompletionRequest });

    // Call the OpenAI API
    const result = await openAiClient.createCompletion(createCompletionRequest);

    showEstimatedCost(result);

    const textResult = result.data.choices[0].text || "";

    const sanitizedTextResult = sanitizeAIResult({
      textResult,
      codeLanguage: options.codeLanguage,
    });

    return sanitizedTextResult;
  } catch (error) {
    vscode.window.showErrorMessage('error: "' + error);
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

// generate prompt for getting the function and the documentation
function generatePromptForGettingFunctionAndDoc(
  options: interfaces.PromptOptions
): string {
  const { codeLanguage, functionText } = options;

  const docTypeNote = addRelatedNotesAboutTheDocumentationType(codeLanguage);

  let prompt = `Generate documentation for the following ${codeLanguage} function """${functionText}""", return the function together with its documentation. Do not add any other strings beside the function and its documentation. Include data about the params and the return, and also a description about the function, do not include examples. Note I will use your response to replace the selected function in my code editor so return it clean. ${docTypeNote}`;

  return prompt;
}

function generatePromptForAddingComments(
  options: interfaces.PromptOptions
): string {
  const { codeLanguage, functionText } = options;

  const prompt = `Given the following ${codeLanguage} function:\n\`\`\`\n${functionText}\n\`\`\`\nPlease rewrite it by adding clear and informative inline comments above each significant line of code. For example, given this JS function:\n\`\`\`
function isOdd(number) {
    return number % 2 !== 0;
}\`\`\`\nYou should return:\n\`\`\`
function isOdd(number) {
  // Check if the number is odd. If it is, return true; otherwise, return false.
  return number % 2 !== 0;
}\`\`\`\nPlease follow the same pattern to comment the provided function.`;

  console.log(LOG_PROMO, { prompt });

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
  // Create a configuration for OpenAI with the user's API key
  const conf = new Configuration({
    apiKey: options.apiKey,
  });
  const openAiClient = new OpenAIApi(conf);

  const prompt = generatePromptForAddingComments({
    codeLanguage: options.codeLanguage,
    functionText: options.functionText,
  });

  console.log(LOG_PROMO, { prompt });

  try {
    // Call the OpenAI API
    const result = await openAiClient.createCompletion({
      model: options.engine,
      prompt,
      max_tokens: options.maxTokens,
      temperature: 0.1,
    });

    showEstimatedCost(result);

    // Extract the generated documentation from the API response, typescript syntax
    const textResult = result.data.choices[0].text || "";

    // get only the part that starts with /** and ends with */, including.
    const functionWithComments = textResult;

    return functionWithComments;
  } catch (error) {
    vscode.window.showErrorMessage('error: "' + error);
    return "// problem generating documentation";
  }
}

const showEstimatedCost = (result: { data: CreateCompletionResponse }) => {
  const totalTokens = result.data.usage?.total_tokens || 0;
  const estimatedCost = totalTokens * COST_PER_TOKEN;

  console.log(LOG_PROMO, `Total tokens used: ${totalTokens}`);
  console.log(LOG_PROMO, `Cost per token: $${COST_PER_TOKEN}`);
  console.log(LOG_PROMO, `Estimated cost: $${estimatedCost.toFixed(6)}`);

  // show information message
  popup(`Estimated cost: $${estimatedCost.toFixed(5)}`);
};

const addRelatedNotesAboutTheDocumentationType = (
  codeLanguage: string
): string => {
  // lower case
  codeLanguage = codeLanguage.toLocaleLowerCase();

  switch (codeLanguage) {
    case "javascript":
      return "use JSDoc syntax";

    case "python":
      return "use Python docstring syntax";

    case "java":
      return "use Javadoc syntax";

    case "c#":
      return "use XML Documentation syntax";

    case "ruby":
      return "use RDoc or YARD syntax";

    case "go":
      return "use GoDoc syntax";

    case "rust":
      return "use Rustdoc syntax";

    case "php":
      return "use PHPDoc syntax";

    case "type script":
      return "use TSDoc syntax";

    default:
      return "";
  }
};

export function deactivate() {}
