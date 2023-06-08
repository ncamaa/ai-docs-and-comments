import * as vscode from "vscode";

import * as interfaces from "./interfaces";

import { LOG_PROMO } from "./constants";

/**
 * Generates a prompt for getting a function and its documentation.
 *
 * Fetches the custom prompt from the extension settings and replaces placeholders with actual values.
 * If the custom prompt is not defined, it falls back to the default prompt.
 *
 * @param {interfaces.PromptOptions} options - The options for the prompt.
 * @param {string} options.codeLanguage - The programming language of the code.
 * @param {string} options.functionText - The text of the function for which the documentation should be generated.
 *
 * @return {string} The generated prompt.
 */
export function generatePromptForGettingFunctionAndDoc(
  options: interfaces.PromptOptions
): string {
  const { codeLanguage, functionText } = options;
  const docTypeNote = addRelatedNotesAboutTheDocumentationType(codeLanguage);

  // Get the prompt from the settings
  let promptTemplate = vscode.workspace
    .getConfiguration("aiDocsAndComments.prompts")
    .get("docPrompt") as string;

  // Replace placeholders with actual values
  let prompt = promptTemplate
    .replace("{0}", codeLanguage)
    .replace("{1}", functionText)
    .replace("{2}", docTypeNote);

  return prompt;
}

/**
 * Generates a prompt for adding comments to a function.
 *
 * Fetches the custom prompt from the extension settings and replaces placeholders with actual values.
 * If the custom prompt is not defined, it falls back to the default prompt.
 *
 * @param {interfaces.PromptOptions} options - The options for the prompt.
 * @param {string} options.codeLanguage - The programming language of the code.
 * @param {string} options.functionText - The text of the function to which comments should be added.
 *
 * @return {string} The generated prompt.
 */
export function generatePromptForAddingComments(
  options: interfaces.PromptOptions
): string {
  const { codeLanguage, functionText } = options;

  // Get the prompt from the settings
  let promptTemplate = vscode.workspace
    .getConfiguration("aiDocsAndComments.prompts")
    .get("commentPrompt") as string;

  // Replace placeholders with actual values
  let prompt = promptTemplate
    .replace("{0}", codeLanguage)
    .replace("{1}", functionText);

  console.log(LOG_PROMO, { prompt });

  return prompt;
}

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
