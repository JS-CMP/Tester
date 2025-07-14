import fs from 'fs';
import { exec } from 'child_process';

export function parseMetadata(metadata) {
    const lines = metadata.trim().split('\n');
    const jsonObject = {};

    for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        if (key && value) {
            if (!value) {
                value = "";
            }
            if (!isNaN(value)) {
                jsonObject[key.trim()] = Number(value);
                continue;
            }
            if (value === "true" || value === "false") {
                jsonObject[key.trim()] = value === "true";
                continue;
            }
            if (value.startsWith('[') && value.endsWith(']')) {
                jsonObject[key.trim()] = value.slice(1, -1).split(',').map(v => v.trim());
                continue;
            }
            jsonObject[key.trim()] = value;
        }
    }

    return jsonObject;
}

export function saveTests(tests, fileName) {
    let content = "export const tests = [\n";
    content += tests.map(test => `    "${test}",\n`).join('');
    content += "];\n";

    fs.writeFileSync(fileName, content);

    console.log("Tests saved in ", fileName);
}

export function checkEval(content) {
    return content.includes('eval(');
}

export async function execCmd(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

function timeout(ms) {
    return new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), ms)
    );
}

async function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        timeout(ms)
    ]);
}

export async function runCommand(command, err) {
    let commandResult = await  withTimeout(execCmd(command), 10000);
    if (commandResult["stderr"]) {
        throw new Error(err);
    }
}