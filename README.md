# AI Docs & Comments

AI Docs & Comments is a Visual Studio Code extension that creates documentation and adds comments to your functions using Artificial Intelligence.

![Animated gif demonstrating AI Docs & Comments](https://raw.githubusercontent.com/codama-dev/ai-docs-and-comments/main/ai-docs-and-comments-trimmed-gif.gif)

## Getting Started

1. Install AI Docs & Comments from the [Visual Studio Code marketplace](https://marketplace.visualstudio.com/items?itemName=CodamaSoftware.ai-docs-and-comments&ssr=false#overview).
2. Obtain an API Key from the [OpenAI Platform](https://platform.openai.com/account/api-keys).
3. Input your API Key in the AI Docs & Comments configuration settings in Visual Studio Code. You can adjust the settings using the `AI Docs & Comments: Go to Settings` command (<kbd>⌘</kbd>+<kbd>⇧</kbd>+<kbd>P</kbd> on Mac, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> on Windows).

Please note that the OpenAI API charges approximately $1 for generating over 60 documentations.

## How to Use

Before starting, ensure you've correctly adjusted your settings. You can do this by executing <kbd>⌘</kbd>+<kbd>⇧</kbd>+<kbd>P</kbd> on Mac or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> on Windows and selecting `AI Docs & Comments: Go to Settings`.

To generate documentation, follow these steps:

1. Select the whole function in the code editor.
2. Execute <kbd>⌘</kbd>+<kbd>⇧</kbd>+<kbd>P</kbd> on Mac or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> on Windows and select `AI Docs & Comments: Create Documentation`.

For adding comments, follow these steps:

1. Select the function without the documentation.
2. Execute <kbd>⌘</kbd>+<kbd>⇧</kbd>+<kbd>P</kbd> on Mac or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> on Windows and select `AI Docs & Comments: Add Comments`.

## Features

- Generate documentation for your functions.
- Add insightful comments to your functions.
- Easy-to-access commands from the command palette (<kbd>⌘</kbd>+<kbd>⇧</kbd>+<kbd>P</kbd> on Mac, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> on Windows).
- Configurable AI settings and language models.
- Though only JavaScript and Python have been extensively tested, the extension is designed to support a variety of programming languages.

## Available Commands

- `AI Docs & Comments: Create Documentation`
- `AI Docs & Comments: Add Comments`
- `AI Docs & Comments: Go to Settings`

## Extension Settings

This extension contributes the following settings:

- `aiDocsAndComments.openAI.apiKey`: Your OpenAI API Key.
- `aiDocsAndComments.openAI.engine`: The AI model to use.
- `aiDocsAndComments.openAI.maxTokens`: The maximum number of tokens for a single request.
- `aiDocsAndComments.openAI.codeLanguage`: The programming language of your code snippets.
- `aiDocsAndComments.openAI.customCodeLanguage`: Enter a custom code language if your desired language is not listed above.

## Support

The extension was tested mainly with JavaScript and Python. However, it is designed to work with other programming languages as well. If you encounter any issues while using a different programming language, feel free to raise an issue on our GitHub page.

## Contribution

Everyone is welcome to contribute to this project! If you have improvement suggestions, feature requests, or want to improve our code or documentation, we appreciate your help.

Here's how you can contribute:

1. Fork this repository.
2. Make your changes.
3. Open a pull request to incorporate your changes into our main branch.

We're looking forward to seeing your pull requests!

## License

This extension is licensed under the [MIT License](https://raw.githubusercontent.com/codama-dev/ai-docs-and-comments/main/LICENSE.txt).
