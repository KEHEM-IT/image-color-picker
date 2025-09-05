import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    console.log('Image Color Picker extension is now active!');

    // Command for picking color from currently active image editor
    const disposable = vscode.commands.registerCommand('imageColorPicker.pickColor', () => {
        // Try to get the active text editor first
        const activeEditor = vscode.window.activeTextEditor;

        if (activeEditor) {
            const filePath = activeEditor.document.uri.fsPath;
            openColorPicker(context, filePath);
            return;
        }

        // If no active text editor, try to get the active tab
        const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;

        if (
            activeTab &&
            activeTab.input &&
            typeof activeTab.input === 'object' &&
            activeTab.input !== null &&
            'uri' in activeTab.input
        ) {
            const filePath = (activeTab.input as any).uri.fsPath;
            openColorPicker(context, filePath);
            return;
        }

        // If still no active file, show error
        vscode.window.showErrorMessage('No active image file found. Please open an image file first or use "Pick Color from Image File..." command.');
    });

    // Command for picking color from any image file (with file picker)
    const disposable2 = vscode.commands.registerCommand('imageColorPicker.pickColorFromFile', async () => {
        console.log('Pick color from file command triggered');

        const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: false,
            openLabel: 'Select Image File',
            filters: {
                'Images': ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp']
            }
        });

        if (fileUri && fileUri[0]) {
            const filePath = fileUri[0].fsPath;
            openColorPicker(context, filePath);
        }
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(disposable2);
}

function openColorPicker(context: vscode.ExtensionContext, filePath: string) {
    const fileExtension = path.extname(filePath).toLowerCase();
    const supportedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'];

    if (!supportedExtensions.includes(fileExtension)) {
        vscode.window.showErrorMessage('Please select a supported image file (PNG, JPG, GIF, BMP, SVG, WebP)');
        return;
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        vscode.window.showErrorMessage('Image file not found: ' + filePath);
        return;
    }

    // Create and show the color picker webview
    const panel = vscode.window.createWebviewPanel(
        'imageColorPicker',
        'Image Color Picker',
        vscode.ViewColumn.Two,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.file(path.dirname(filePath)),
                vscode.Uri.file(path.join(context.extensionPath, 'media'))
            ]
        }
    );

    // Convert file path to webview URI
    const imageUri = panel.webview.asWebviewUri(vscode.Uri.file(filePath));

    panel.webview.html = getWebviewContent(imageUri, path.basename(filePath));

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
        async (message: any) => {
            switch (message.command) {
                case 'colorPicked':
                    await handleColorPicked(message.hex, message.rgb);
                    break;
                case 'saveToFile':
                    await saveColorToFile(message.hex);
                    break;
            }
        },
        undefined,
        context.subscriptions
    );
}

async function handleColorPicked(hex: string, rgb: { r: number, g: number, b: number }) {
    const action = await vscode.window.showInformationMessage(
        `Color picked: ${hex}`,
        'Copy to Clipboard',
        'Save to File',
        'Insert at Cursor'
    );

    switch (action) {
        case 'Copy to Clipboard':
            await vscode.env.clipboard.writeText(hex);
            vscode.window.showInformationMessage('Color copied to clipboard!');
            break;
        case 'Save to File':
            await saveColorToFile(hex);
            break;
        case 'Insert at Cursor':
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                activeEditor.edit(editBuilder => {
                    editBuilder.insert(activeEditor.selection.active, hex);
                });
            } else {
                vscode.window.showInformationMessage(`Color ${hex} - No active editor to insert into`);
            }
            break;
    }
}

async function saveColorToFile(hex: string) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }

    const colorsFilePath = path.join(workspaceFolders[0].uri.fsPath, 'picked-colors.txt');
    const timestamp = new Date().toISOString();
    const colorEntry = `${timestamp}: ${hex}\n`;

    try {
        fs.appendFileSync(colorsFilePath, colorEntry);
        vscode.window.showInformationMessage(`Color saved to picked-colors.txt`);
    } catch (error) {
        vscode.window.showErrorMessage('Failed to save color to file');
    }
}

function getWebviewContent(imageUri: vscode.Uri, fileName: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image Color Picker</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            margin: 0;
            padding: 20px;
            overflow: auto;
        }
        
        .container {
            max-width: 100%;
            margin: 0 auto;
        }
        
        .header {
            margin-bottom: 20px;
            text-align: center;
        }
        
        .image-container {
            position: relative;
            display: inline-block;
            max-width: 100%;
            border: 2px solid var(--vscode-panel-border);
            border-radius: 4px;
            overflow: hidden;
        }
        
        #imageCanvas {
            display: block;
            cursor: crosshair;
            max-width: 100%;
            height: auto;
        }
        
        .controls {
            margin-top: 20px;
            padding: 15px;
            background-color: var(--vscode-sidebar-background);
            border-radius: 4px;
        }
        
        .color-info {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        
        .color-preview {
            width: 50px;
            height: 50px;
            border: 2px solid var(--vscode-panel-border);
            border-radius: 4px;
            background-color: #ffffff;
        }
        
        .color-values {
            flex: 1;
            min-width: 200px;
        }
        
        .color-value {
            margin: 5px 0;
            font-family: var(--vscode-editor-font-family);
            font-size: 14px;
        }
        
        .buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .instructions {
            margin-top: 15px;
            padding: 10px;
            background-color: var(--vscode-textCodeBlock-background);
            border-radius: 4px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Image Color Picker</h2>
            <p>File: ${fileName}</p>
        </div>
        
        <div class="image-container">
            <canvas id="imageCanvas"></canvas>
        </div>
        
        <div class="controls">
            <div class="color-info">
                <div class="color-preview" id="colorPreview"></div>
                <div class="color-values">
                    <div class="color-value">Hex: <span id="hexValue">#000000</span></div>
                    <div class="color-value">RGB: <span id="rgbValue">rgb(0, 0, 0)</span></div>
                    <div class="color-value">Position: <span id="positionValue">-</span></div>
                </div>
            </div>
            
            <div class="buttons">
                <button id="copyBtn" disabled>Copy Hex</button>
                <button id="saveBtn" disabled>Save to File</button>
                <button id="insertBtn" disabled>Insert at Cursor</button>
            </div>
            
            <div class="instructions">
                Click anywhere on the image to pick a color. The color information will be displayed above.
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const canvas = document.getElementById('imageCanvas');
        const ctx = canvas.getContext('2d');
        const colorPreview = document.getElementById('colorPreview');
        const hexValue = document.getElementById('hexValue');
        const rgbValue = document.getElementById('rgbValue');
        const positionValue = document.getElementById('positionValue');
        const copyBtn = document.getElementById('copyBtn');
        const saveBtn = document.getElementById('saveBtn');
        const insertBtn = document.getElementById('insertBtn');
        
        let currentColor = null;
        let imageData = null;
        
        // Load and display the image
        const img = new Image();
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        };
        img.src = '${imageUri}';
        
        // Handle mouse clicks on canvas
        canvas.addEventListener('click', function(event) {
            if (!imageData) return;
            
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            const x = Math.floor((event.clientX - rect.left) * scaleX);
            const y = Math.floor((event.clientY - rect.top) * scaleY);
            
            if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
                const pixel = getPixelColor(x, y);
                if (pixel) {
                    updateColorDisplay(pixel, x, y);
                    enableButtons();
                }
            }
        });
        
        function getPixelColor(x, y) {
            const index = (y * canvas.width + x) * 4;
            const r = imageData.data[index];
            const g = imageData.data[index + 1];
            const b = imageData.data[index + 2];
            const a = imageData.data[index + 3];
            
            if (a === 0) return null; // Transparent pixel
            
            return { r, g, b };
        }
        
        function updateColorDisplay(color, x, y) {
            currentColor = color;
            const hex = rgbToHex(color.r, color.g, color.b);
            
            colorPreview.style.backgroundColor = \`rgb(\${color.r}, \${color.g}, \${color.b})\`;
            hexValue.textContent = hex;
            rgbValue.textContent = \`rgb(\${color.r}, \${color.g}, \${color.b})\`;
            positionValue.textContent = \`(\${x}, \${y})\`;
        }
        
        function rgbToHex(r, g, b) {
            return "#" + [r, g, b].map(x => {
                const hex = x.toString(16);
                return hex.length === 1 ? "0" + hex : hex;
            }).join("");
        }
        
        function enableButtons() {
            copyBtn.disabled = false;
            saveBtn.disabled = false;
            insertBtn.disabled = false;
        }
        
        // Button event handlers
        copyBtn.addEventListener('click', function() {
            if (currentColor) {
                const hex = rgbToHex(currentColor.r, currentColor.g, currentColor.b);
                vscode.postMessage({
                    command: 'colorPicked',
                    hex: hex,
                    rgb: currentColor
                });
            }
        });
        
        saveBtn.addEventListener('click', function() {
            if (currentColor) {
                const hex = rgbToHex(currentColor.r, currentColor.g, currentColor.b);
                vscode.postMessage({
                    command: 'saveToFile',
                    hex: hex
                });
            }
        });
        
        insertBtn.addEventListener('click', function() {
            if (currentColor) {
                const hex = rgbToHex(currentColor.r, currentColor.g, currentColor.b);
                vscode.postMessage({
                    command: 'colorPicked',
                    hex: hex,
                    rgb: currentColor
                });
            }
        });
    </script>
</body>
</html>`;
}

export function deactivate() { }