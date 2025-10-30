import { parseMetadata, saveTests, checkEval } from "./helper.js";
import path from 'path';
import fs from 'fs';
import { featuresEdition, SpecEdition } from './edition.js';

export function getJsFiles(dirPath) {
    const files = [];
    const stack = [dirPath];

    while (stack.length > 0) {
        const currentDir = stack.pop();
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                stack.push(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.js')) {
                files.push(fullPath);
            }
        }
    }
    return files;
}

export function getMetadata(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    if (checkEval(fileContent)) {
        return {};
    }
    const metadataMatch = fileContent.match(/^\/\*---([\s\S]*?)---\*\//m);
    if (!metadataMatch) {
        return {};
    }
    return parseMetadata(metadataMatch[1]);
}

export function getES5tests(path) {
    let num = 0;
    const tests = getJsFiles(path);
    const testES5 = [];

    console.log("Total tests: ", tests.length);
    for (const testPath of tests) {
        const metadata = getMetadata(testPath);
        if (Object.keys(metadata).length === 0) {
            continue;
        }
        if ("flags" in metadata) {
            if (metadata.flags?.includes?.("noStrict")) {
                continue;
            }
        }
        if ("es5id" in metadata) {
            num++;
            testES5.push(testPath);
            continue;
        }
        if (JSON.stringify(metadata).match(/es.*id/)) {
            continue;
        }
        if ("features" in metadata) {
            const editionList = metadata.features.map(feature => featuresEdition[feature]);
            const hasOtherThan5 = editionList.some(num => num !== 5);
            if (hasOtherThan5) {
                continue;
            }
        }
        if ("esid" in metadata) {
            const edition = SpecEdition[metadata.esid];
            if (!edition || edition !== 5) {
                continue;
            }
        }
        num++;
        testES5.push(testPath);
    }
    return testES5;
}

export async function getTests(prog, options) {
    // if (!fs.existsSync("./es5tests.js") || options.e) {
    let es5Tests = getES5tests(prog.args[0]);
    saveTests(es5Tests, "./es5tests.js");
    console.log("Total ES5 tests: ", es5Tests.length);
    return es5Tests;
    // }

    // let f = await import("./es5tests.js");
    // console.log("Total ES5 tests: ", f.tests.length);
    // return f.tests;
}