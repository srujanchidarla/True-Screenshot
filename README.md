# TrueScreenshot for VS Code

TrueScreenshot captures exact visual replicas of your code as you see it in the editor, including all syntax highlighting, error indicators, and editor decorations.

## Description

Unlike standard code screenshot tools that only capture plain text with basic styling, TrueScreenshot takes actual screenshots that preserve the complete visual state of your code editor. This extension is perfect for:

- Capturing error underlines and diagnostics for troubleshooting help
- Creating accurate documentation that shows warnings and errors
- Sharing code snippets with colleagues exactly as you see them
- Preserving the precise visual appearance of your code with all VS Code's visual enhancements

## Features

- Captures true visual representation including error underlines, warnings, and decorations
- Supports long screenshots for extensive code selections
- High-resolution output for clear documentation
- Easy capture of selected code or entire files
- Preserves your theme colors and styling
- Convenient right-click access in the editor

## Usage

1. Open a file in VS Code
2. Select the code you want to capture (or don't select anything to capture the entire file)
3. Right-click in the editor and select "Capture True Screenshot" from the context menu
4. Alternatively, use the Command Palette (Ctrl+Shift+P) and type "Capture True Screenshot"
5. Choose where to save the screenshot

## Extension Settings

This extension contributes the following settings:

- `truescreenshot.quality`: Quality of the screenshot (1-100)
- `truescreenshot.format`: Format of the screenshot (png or jpeg)

## Known Issues

- The extension currently works best with light themes
- Very large files may cause performance issues

## Release Notes

### 0.1.0

Initial release of TrueScreenshot
