import fs from 'fs';
import { execSync } from 'child_process';
import { getTests } from './get.js';
import { execCmd, runCommand } from './helper.js';
import os from 'os';
import path from 'path';
import { program } from 'commander';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runNodeTests(tests) {
    console.log("Node tests");
    const harness = "test262-harness --hostType=node --hostPath=node --hostArgs=\"--use-strict\" -t 11";
    const testPaths = tests.join(' ');
    const command = `${harness} ${testPaths}`;
    console.log("Running tests...");
    execSync(command, { stdio: 'inherit' });
}

async function createMergedTempTest(testPath) {
    const harnessContent = fs.readFileSync(path.resolve(__dirname, 'harness.js'), 'utf8');
    const testContent = fs.readFileSync(testPath, 'utf8');
    const mergedContent = `${harnessContent}\n${testContent}`;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
    const tempFilePath = path.join(tempDir, path.basename(testPath));
    fs.writeFileSync(tempFilePath, mergedContent, 'utf8');
    return tempFilePath;
}

function handleTestFailure({ 
    errorType, 
    shouldStop, 
    error, 
    tests_infos, 
    failedTestPath, 
    stopMessage 
}) {
    if (shouldStop && error.message === errorType) {
        fs.copyFileSync(tests_infos[0], failedTestPath);
        console.error("  >", `./js_cmp ${failedTestPath} -o ${failedTestPath.replace('.js', '.out')}`);
        if (errorType !== "lexing") {
            console.error("  >", `${failedTestPath.replace('.js', '.out')}`);
        }
        console.error(stopMessage);
        process.exit(1);
    }
}

async function runJsCmpTests(tests, stopOnLexerCrash, stopOnTestCrash, stopOnTestFail) {
    let totalTests = tests.length;
    let passedTests = 0;
    const harness = "./js_cmp";
    console.log("JsCmp tests");
    console.log("Running tests...");

    let cluster = []
    for (const test of tests) {
        const mergedTestPath = await createMergedTempTest(test);
        cluster.push([mergedTestPath, test]);
        if (cluster.length === os.cpus().length) {
            await Promise.all(cluster.map(async function(tests_infos) {
                try {
                    await runCommand(`${harness} ${tests_infos[0]} -o ${tests_infos[0].replace('.js', '.out')}`, "compilation");
                    await runCommand(`./${tests_infos[0].replace('.js', '.out')}`, "run");
                    passedTests++;
                    console.log(`PASSED: ${tests_infos[1]}`);
                } catch (error) {
                    if (!error.message) {
                        error.message = "lexing";
                        console.error(`FAILED: ${error.message} of ${tests_infos[1]} with signal ${error["error"]["signal"]}`);
                    } else {
                        console.error(`FAILED: ${error.message} of ${tests_infos[1]}`);
                    }

                    let failedTestPath = `./failed_tests/failed_${path.basename(tests_infos[1])}`
                    handleTestFailure({
                        errorType: "compilation",
                        shouldStop: stopOnTestCrash,
                        error,
                        tests_infos,
                        failedTestPath,
                        stopMessage: "Stopping due to test crash"
                    });
                    handleTestFailure({
                        errorType: "run",
                        shouldStop: stopOnTestFail,
                        error,
                        tests_infos,
                        failedTestPath,
                        stopMessage: "Stopping due to test failure"
                    });
                    handleTestFailure({
                        errorType: "lexing",
                        shouldStop: stopOnLexerCrash,
                        error,
                        tests_infos,
                        failedTestPath,
                        stopMessage: "Stopping due to lexer crash"
                    });
                }
            }));
            cluster = []
        }
    }
}

function parseArgs() {
    program
        .option('-n, --node', 'Only run Node tests')
        .option('-j, --jscmp', 'Only run JsCmp tests')
        .option('--jscmp-path <path>', 'Path to JsCmp executable', "./js_cmp")
        .option('-e', 'Recheck on the edition of tests even if es5tests.js exists', false)
        .option('--stop-on-lexer-crash', 'If a crash occurs while testing, stop the runner, only work for JSCMP', false)
        .option('--stop-on-test-crash', 'If a test crash, stop the runner, only work for JSCMP', false)
        .option('--stop-on-test-fail', 'If a test fails, stop the runner, only work for JSCMP', false)
        .argument('[path]', 'Path to directory or file to run tests on', "./test262");

    program.parse(process.argv);
    return program;
}

function checkPaths(options, prog) {
    if (options.node && options.jscmp) {
        throw new Error("--node and --jscmp can't be used together");
    }
    if (!fs.existsSync(prog.args[0])) {
        throw new Error("Path does not exist");
    }

    if (options.jscmp && !fs.existsSync(options.jscmpPath)) {
        throw new Error("JsCmp path does not exist");
    }

    let test262harness;
    try {
        execSync("test262-harness --help", { stdio: 'ignore' });
        test262harness = true;
    } catch (error) {
        test262harness = false;
    }
    if (options.node && !test262harness) {
        throw new Error("test262-harness does not exist");
    }

    if (!options.node && !options.jscmp && (!test262harness || !fs.existsSync(options.jscmpPath))) {
        throw new Error("test262-harness or JsCmp does not exist");
    }
}

async function main() {
    const prog = parseArgs();
    const options = prog.opts();
    checkPaths(options, prog);
    const es5tests = await getTests(prog, options);
    if (!options.jscmp) {
        runNodeTests(es5tests);
    }
    if (!options.node) {
        await runJsCmpTests(es5tests, options.stopOnLexerCrash, options.stopOnTestCrash, options.stopOnTestFail);
    }
}
main();