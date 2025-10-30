import fs from 'fs';
import { exec } from 'child_process';

export function parseMetadata(metadata) {
    const lines = metadata.trim().split('\n');
    const jsonObject = {};

    for (var i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        const [key, ...valueParts] = line.split(':');
        let value = valueParts.join(':').trim();
        if (key && value !== undefined) {
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
            if (value.startsWith('>') || value.startsWith('|')) {
                let multiLineValue = "";
                while (i + 1 < lines.length && lines[i + 1].startsWith(' ')) {
                    multiLineValue += lines[i + 1].trim() + ' ';
                    i++;
                }
                jsonObject[key.trim()] = multiLineValue;
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

export async function execCmd(cmd, msTimeout = 0) {
    return new Promise((resolve, reject) => {
        const options = {};
        if (msTimeout > 0) {
            options.timeout = msTimeout;
            options.killSignal = 'SIGKILL';
        }
        options.maxBuffer = 10 * 1024 * 1024;

        exec(cmd, options, (error, stdout, stderr) => {
            if (error) {
                const timedOut = !!error.killed || (error.signal && (error.signal === 'SIGTERM' || error.signal === 'SIGKILL'));
                if (timedOut) {
                    reject({ error: new Error('Command timed out'), stdout, stderr, timedOut: true });
                    return;
                }
                reject({ error, stdout, stderr, timedOut: false });
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}


export async function runCommand(command, err) {
    try {
        const commandResult = await execCmd(command, 10000); // 10s timeout
        if (commandResult && commandResult.stderr) {
            throw new Error(err);
        }
        return commandResult;
    } catch (e) {
        if (e && e.timedOut) {
            throw new Error('Timeout');
        }
        if (e && e.error) {
            throw e.error;
        }
        throw e;
    }
}