/**
 * llms-generator.js
 * 
 * Parses JavaScript files in workflow_pilot/static/src and generates
 * a structured llms.txt with component signatures, methods, and props.
 * 
 * Usage: node llms-generator.js
 */

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const { glob } = require('glob');

const SRC_DIR = path.join(__dirname, 'workflow_pilot', 'static', 'src');
const OUTPUT_FILE = path.join(__dirname, 'llms.txt');

async function main() {
    const jsFiles = await glob('**/*.js', { cwd: SRC_DIR });

    let output = `# Workflow Pilot - LLM Context Document\n`;
    output += `Generated: ${new Date().toISOString()}\n\n`;

    // Project Overview
    output += `## Project Overview\n`;
    output += `A visual workflow builder as an Odoo 18 module using OWL framework.\n\n`;
    output += `### Tech Stack\n`;
    output += `- Odoo 18, OWL (Odoo Web Library)\n`;
    output += `- JavaScript ES6+, XML (QWeb), Vanilla CSS\n\n`;
    output += `### Key Features\n`;
    output += `- Pan/Zoom canvas with BFS-based auto-layout (Tidy Up)\n`;
    output += `- Smart connection snapping (50px radius)\n`;
    output += `- Bezier curve connections with arrowheads\n\n`;
    output += `---\n\n`;
    output += `## Component API Reference\n\n`;

    for (const file of jsFiles.sort()) {
        const filePath = path.join(SRC_DIR, file);
        const code = fs.readFileSync(filePath, 'utf-8');

        output += `## File: workflow_pilot/static/src/${file}\n\n`;

        try {
            const ast = parser.parse(code, {
                sourceType: 'module',
                plugins: ['classProperties', 'classPrivateProperties'],
            });

            const classes = extractClasses(ast);
            const functions = extractFunctions(ast);

            if (classes.length > 0) {
                for (const cls of classes) {
                    output += `### Class: \`${cls.name}\`\n`;
                    if (cls.superClass) {
                        output += `- Extends: \`${cls.superClass}\`\n`;
                    }
                    if (cls.props.length > 0) {
                        output += `- **Props**: ${cls.props.join(', ')}\n`;
                    }
                    if (cls.methods.length > 0) {
                        output += `- **Methods**:\n`;
                        for (const m of cls.methods) {
                            output += `  - \`${m}\`\n`;
                        }
                    }
                    output += `\n`;
                }
            }

            if (functions.length > 0) {
                output += `### Standalone Functions\n`;
                for (const fn of functions) {
                    output += `- \`${fn}\`\n`;
                }
                output += `\n`;
            }

            if (classes.length === 0 && functions.length === 0) {
                output += `*(No classes or functions detected)*\n\n`;
            }

        } catch (e) {
            output += `*Parse error: ${e.message}*\n\n`;
        }

        output += `---\n\n`;
    }

    fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
    console.log(`Generated: ${OUTPUT_FILE}`);
}

function extractClasses(ast) {
    const classes = [];

    for (const node of ast.program.body) {
        if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'ClassDeclaration') {
            classes.push(parseClass(node.declaration));
        } else if (node.type === 'ClassDeclaration') {
            classes.push(parseClass(node));
        }
    }

    return classes;
}

function parseClass(node) {
    const name = node.id?.name || 'AnonymousClass';
    const superClass = node.superClass?.name || null;
    const methods = [];
    const props = [];

    for (const member of node.body.body) {
        // Babel uses ClassMethod for class methods
        if (member.type === 'ClassMethod') {
            const methodName = member.key?.name || member.key?.value || 'anonymous';
            const params = (member.params || []).map(p => p.name || p.left?.name || '...').join(', ');
            const prefix = member.kind === 'get' ? 'get ' : member.kind === 'set' ? 'set ' : '';
            methods.push(`${prefix}${methodName}(${params})`);
        } else if (member.type === 'ClassProperty') {
            const propName = member.key?.name;
            if (propName === 'props' && member.value?.type === 'ObjectExpression') {
                for (const prop of member.value.properties) {
                    if (prop.key?.name) {
                        props.push(prop.key.name);
                    }
                }
            } else if (member.value?.type === 'ArrowFunctionExpression') {
                // Arrow function class properties (e.g., onSocketMouseDown = (data) => {...})
                const params = (member.value.params || []).map(p => p.name || '...').join(', ');
                methods.push(`${propName}(${params}) [arrow]`);
            }
        }
    }

    return { name, superClass, methods, props };
}

function extractFunctions(ast) {
    const functions = [];

    for (const node of ast.program.body) {
        if (node.type === 'FunctionDeclaration') {
            const name = node.id?.name || 'anonymous';
            const params = (node.params || []).map(p => p.name || '...').join(', ');
            functions.push(`${name}(${params})`);
        } else if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'FunctionDeclaration') {
            const name = node.declaration.id?.name || 'anonymous';
            const params = (node.declaration.params || []).map(p => p.name || '...').join(', ');
            functions.push(`${name}(${params})`);
        }
    }

    return functions;
}

main().catch(console.error);
