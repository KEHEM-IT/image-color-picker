# Image Color Picker for VS Code

A VS Code extension that allows you to pick colors from images using your mouse and save the hex color codes.

## Features

- **Color Picking**: Click on any pixel in an image to get its color
- **Multiple Formats**: View colors in both HEX and RGB formats
- **Save Options**:
  - Copy hex code to clipboard
  - Save to a file (`picked-colors.txt`)
  - Insert hex code at cursor position
- **Supported Formats**: PNG, JPG, JPEG, GIF, BMP, SVG, WEBP
- **Visual Interface**: Clean, VS Code-themed interface with color preview

## Usage

1. Open an image file in VS Code
2. Right-click on the editor tab or in the editor area
3. Select "Pick Color from Image" from the context menu
4. A new panel will open showing your image
5. Click anywhere on the image to pick a color
6. Use the buttons to:
   - **Copy Hex**: Copies the hex code to your clipboard
   - **Save to File**: Appends the color with timestamp to `picked-colors.txt`
   - **Insert at Cursor**: Inserts the hex code at your current cursor position

## Installation

1. Create a new folder for your extension
2. Copy all the provided files into the folder:

   - `package.json`
   - `extension.ts` (put this in a `src` folder)
   - `tsconfig.json`
   - `README.md`

3. Install dependencies:

   ```bash
   npm install
   ```

4. Compile the TypeScript:

   ```bash
   npm run compile
   ```

5. Open the folder in VS Code and press `F5` to run the extension in development mode

## File Structure

```
image-color-picker/
├── src/
│   └── extension.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Development

To modify or extend this extension:

1. Edit `src/extension.ts` for the main extension logic
2. Modify `package.json` to add new commands or change configuration
3. Run `npm run compile` to build
4. Press `F5` in VS Code to test your changes

## Publishing

To publish this extension to the VS Code Marketplace:

1. Install `vsce`:

   ```bash
   npm install -g vsce
   ```

2. Package the extension:

   ```bash
   vsce package
   ```

3. Publish:
   ```bash
   vsce publish
   ```

## Color Output Format

When you save colors to file, they're saved with timestamps in this format:

```
2025-01-15T10:30:45.123Z: #ff0000
2025-01-15T10:31:12.456Z: #00ff00
```

## Requirements

- VS Code version 1.74.0 or higher
- Node.js for development

## License

MIT License - feel free to modify and distribute as needed.
