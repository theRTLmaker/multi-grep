# Multi-Grep

Multi-Grep is a Visual Studio Code extension that allows you to perform complex, multi-pattern searches within your active text editor.

## Features

- Search for multiple patterns simultaneously
- Combine patterns using AND logic
- Match case sensitivity
- Match whole words
- Easy-to-use interface in the sidebar
- Results displayed in a new editor window

## How to Use

1. Open the Multi-Grep sidebar by clicking on the Multi-Grep icon in the Activity Bar or by running the "Start Multi-Grep" command.

2. In the sidebar:
   - Enter your search patterns in the input fields
   - Use the "Aa" button to toggle case sensitivity for each pattern
   - Use the "ab" button to toggle whole word matching for each pattern
   - Click the "&" button to add an AND condition to a pattern
   - Click the "+" button to add a new pattern group (OR logic between groups)

3. Click the "Apply" button to run the search on the currently active text editor.

4. View the results in a new editor window that opens beside your current one.

## Examples

- Search for "foo" OR "bar": Enter "foo" in the first input, click "+", enter "bar" in the new input.
- Search for "foo" AND "bar": Enter "foo" in the first input, click "&", enter "bar" in the new input.
- Case-sensitive search: Enter your pattern and click the "Aa" button to activate case sensitivity.
- Whole word search: Enter your pattern and click the "ab" button to match whole words only.

## Notes

- The extension searches within the currently active text editor.
- If no matches are found, you'll see an information message.
- You need to have an active text editor open to use the extension.

## Feedback and Contributions

If you encounter any issues or have suggestions for improvements, please open an issue on the GitHub repository. Contributions are welcome!

## License

[MIT License](LICENSE)