import fs from 'fs';
import { execSync } from 'child_process';
import {getJsFiles, getMetadata, getTests} from './get.js';
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
    jscmpPath,
    errorType,
    shouldStop,
    error,
    tests_infos,
    failedTestPath,
    stopMessage
}) {
    if (shouldStop && error.message === errorType) {
        fs.copyFileSync(tests_infos[0], failedTestPath);
        const filepath = path.resolve(failedTestPath);
        console.error("  >", `cd ${jscmpPath} && ./js_cmp ${filepath} -o ${filepath.replace('.js', '.out')} || cd -`);
        if (errorType !== "lexing") {
            console.error("  >", `${failedTestPath.replace('.js', '.out')}`);
        }
        console.error(stopMessage);
        process.exit(1);
    }
}

function add_result(resultsCsv, description, category, objective, prerequisites, steps, expectedResults, devStatus, conformity) {
    resultsCsv += `"${description.replace(/"/g, '""')}","${category.replace(/"/g, '""')}","${objective ? objective.replace(/"/g, '""') : "N/A"}","${prerequisites.replace(/"/g, '""')}","${steps.replace(/"/g, '""')}","${expectedResults.replace(/"/g, '""')}","${devStatus}","${conformity}"\n`;
    return resultsCsv;
}

function export_all(exportAll, tests_infos, directory_export, destPath, error, resultsCsv) {
    if (exportAll) {
        const meta = getMetadata(tests_infos[1]);
        let description = meta.info ?? meta.description;
        const es5id =  meta.es5id ?  String(meta.es5id).split('_')[0].split('-')[0]: "Miscellaneous";
        let category = "ES5 ID: " + es5id + ` (url: https://www.ecma-international.org/ecma-262/5.1/#sec-${es5id})`;
        let objective = meta.description;
        let prerequisites = meta.includes?.length ? "JSCMP installed and " + meta.includes.join(', ') + " include to the file" : "JSCMP installed";
        let steps = `1. Make sure you have JSCMP installed using the README instructions.\n2. ${directory_export}.zip should be extracted in the same directory as JSCMP.\n3. Run the test with the command: ` + `\`./js_cmp ${destPath} -o ${destPath.replace('.js', '.out')}\ && ${destPath.replace('.js', '.out')}\`` + "\n4. Check the expectedResults column to see if the failure matches the expectation.";
        let expectedResults = meta.negative !== undefined ? "The test is expected to fail during " + (meta.negative.type === "SyntaxError" ? "compilation" : "run") + " with error: " + JSON.stringify(meta.negative) : "The file is expected to run without errors";
        let devStatus = error && meta.negative === undefined ? "In Progress" : "Done";
        let conformity = error && meta.negative === undefined ? "Non-compliant (Reason: " + error.message + " error)" : "Compliant";
        resultsCsv = add_result(resultsCsv, description, category, objective, prerequisites, steps, expectedResults, devStatus, conformity);
    }
    return resultsCsv;
}

function base_export(resultsCsv, directory_export) {
    resultsCsv = add_result(resultsCsv, "Basic Transpilation and Execution", "Basic Functionality", "Ensure the transpiler works end-to-end for a simple script.", "JS-CMP installed, valid JavaScript file ( hello.js ).", `1. Make sure you have JSCMP installed using the README instructions.\n2. ${directory_export}.zip should be extracted in the same directory as JSCMP.\n3. Run the test with the command: ` + `\`./js_cmp ${directory_export}/hello.js -o ${directory_export}/hello.out\ && ${directory_export}/hello.out\`` + "\n4. Check the expectedResults column to see if the failure matches the expectation.", "The file is expected to run without errors", "Done", "Compliant");
    resultsCsv = add_result(resultsCsv, "Help Message", "Basic Functionality", "Ensure the -h / --help option works and provides accurate usage information.", "JS-CMP installed.", "1. Make sure you have JSCMP installed using the README instructions.\n2. Run the command: `./js_cmp --help`", "Help message is displayed, listing all allowed options and their descriptions.", "Done", "Compliant");
    resultsCsv = add_result(resultsCsv, "Version Information", "Basic Functionality", "Ensure the -v / --version option works.", "JS-CMP installed.", "1. Make sure you have JSCMP installed using the README instructions.\n2. Run the command: `./js_cmp --version`", "Version information is printed JS_CMP version 0.0.1 .", "Done", "Compliant");
    resultsCsv = add_result(resultsCsv, "Preprocess Only", "Intermediate Functionality", "Ensure the -E / --preprocess option generates the expected C++ output.", "JS-CMP installed, valid JavaScript file ( hello.js ).", `1. Make sure you have JSCMP installed using the README instructions.\n2. ${directory_export}.zip should be extracted in the same directory as JSCMP.\n3. Run the test with the command: ` + `\`./js_cmp ${directory_export}/hello.js -E\`` , "C++ code is printed to stdout", "Done", "Compliant");
    resultsCsv = add_result(resultsCsv, "Specify Custom Compiler", "Advanced Functionality", "Ensure the -c / --CXX option works and the specified compiler is used.", "JS-CMP installed, clang++ (version >= 14.2.0) available, valid JavaScript file ( test.js ).", `1. Make sure you have JSCMP installed using the README instructions.\n2. ${directory_export}.zip should be extracted in the same directory as JSCMP.\n3. Run the test with the command: ` + `\`./js_cmp ${directory_export}/hello.js -c clang++ -o ${directory_export}/hello_clang.out\ && ${directory_export}/hello_clang.out\`` , "Binary is generated using clang++ and executes correctly.", "Done", "Compliant");
    resultsCsv = add_result(resultsCsv, "Custom Output File", "Basic Functionality", "Ensure the -o / --output option saves the binary to the specified file.", "JS-CMP installed, valid JavaScript file ( hello.js ).", `1. Make sure you have JSCMP installed using the README instructions.\n2. ${directory_export}.zip should be extracted in the same directory as JSCMP.\n3. Run the test with the command: ` + `\`./js_cmp ${directory_export}/hello.js -o ${directory_export}/my_binary\ && ${directory_export}/my_binary\`` , "Binary is saved as my_binary and executes correctly.", "Done", "Compliant");
    resultsCsv = add_result(resultsCsv, "Pass Compiler Options", "Advanced Functionality", "Ensure the -DMY_MACRO=\"'JS::Any(42)'\" flag is correctly passed and affects the generated binary.", "JS-CMP installed, valid JavaScript file ( macro_test.js ).", `1. Make sure you have JSCMP installed using the README instructions.\n2. ${directory_export}.zip should be extracted in the same directory as JSCMP.\n3. Run the test with the command: ` + `\`./js_cmp ${directory_export}/macro_test.js -- -DMY_MACRO="'JS::Any(42)'" -o ${directory_export}/macro_test.out\ && ${directory_export}/macro_test.out\`` , "Binary executes and prints 42 (or uses the macro value as expected).", "Done", "Compliant");
    resultsCsv = add_result(resultsCsv, "Invalid JavaScript File", "Error Handling", "Ensure meaningful error messages are displayed.", "JS-CMP installed, invalid JavaScript file ( invalid.js ).", `1. Make sure you have JSCMP installed using the README instructions.\n2. ${directory_export}.zip should be extracted in the same directory as JSCMP.\n3. Run the test with the command: ` + `\`./js_cmp ${directory_export}/invalid.js\`` , "Error message is displayed, indicating the syntax error and its location.", "Done", "Compliant");
    resultsCsv = add_result(resultsCsv, "Non-Existent Input File", "Error Handling", "Ensure a clear error message is shown.", "JS-CMP installed.", `1. Make sure you have JSCMP installed using the README instructions.\n2. Run the command: ` + `\`./js_cmp nonexistent.js\`` , "Error message: JS_CMP: File does not exist.", "Done", "Compliant");
    return resultsCsv
}

async function runJsCmpTests(tests, stopOnLexerCrash, stopOnTestCrash, stopOnTestFail, jscmpPath, exportAll = false) {
    let totalTests = tests.length;
    let passedTests = 0;
    const harness = "./js_cmp"
    console.log("JsCmp tests");
    console.log("Running tests...");
    let resultsCsv = "Functionality,Category,Objective,Prerequisites,Steps,Expected Results,Development Status,Conformity\n";
    let directory_export = "exported_tests";
    resultsCsv = base_export(resultsCsv, directory_export);

    if (exportAll) {
        if (!fs.existsSync(`./${directory_export}`)) {
            fs.mkdirSync(`./${directory_export}`);
        }
    }

    let cluster = []
    for (const test of tests) {
        const mergedTestPath = await createMergedTempTest(test);
        cluster.push([mergedTestPath, test]);
        if (cluster.length === os.cpus().length || test === tests[tests.length - 1]) {
            await Promise.all(cluster.map(async function(tests_infos) {
                const filepath = path.resolve(tests_infos[0]);
                let destPath;
                if (exportAll) {
                    destPath = `./${directory_export}/${path.basename(tests_infos[1])}`;
                    if (!fs.existsSync(destPath)) {
                        fs.copyFileSync(filepath, destPath);
                    }
                }
                try {
                    await runCommand(`cd ${jscmpPath} && ${harness} ${filepath} -o ${filepath.replace('.js', '.out')}`, "compilation");
                    await runCommand(`${filepath.replace('.js', '.out')}`, "run");
                    passedTests++;
                    resultsCsv = export_all(exportAll, tests_infos, directory_export, destPath, undefined, resultsCsv);
                    console.log(`PASSED: ${tests_infos[1]}`);
                } catch (error) {
                    const meta = getMetadata(tests_infos[1]);
                    if (meta.negative === 0 && !error?.error?.signal) {
                        passedTests++;
                        console.log(`PASSED (negative test [${meta.phase} (${meta.type})]): ${tests_infos[1]}`);
                        return;
                    }
                    if (!error.message) {
                        if (error["error"]["signal"] === "SIGABRT") {
                            error.message = "run";
                            console.error(`FAILED: ${tests_infos[1]}`);
                        } else if (error["error"]["signal"] === "SIGSEGV") {
                            error.message = "run";
                            console.error(`FAILED: crash of ${tests_infos[1]} with signal ${error["error"]["signal"]}`);
                        } else {
                            error.message = "lexing";
                            console.error(`FAILED: ${error.message} of ${tests_infos[1]} with signal ${error["error"]["signal"]}`);
                        }
                    } else {
                        console.error(`FAILED: ${error.message} of ${tests_infos[1]}`);
                    }

                    resultsCsv = export_all(exportAll, tests_infos, directory_export, destPath, error, resultsCsv);

                    let failedTestPath = `./failed_tests/failed_${path.basename(tests_infos[1])}`
                    handleTestFailure({
                        jscmpPath,
                        errorType: "crash",
                        shouldStop: stopOnTestCrash,
                        error,
                        tests_infos,
                        failedTestPath,
                        stopMessage: "Stopping due to test crash"
                    });
                    handleTestFailure({
                        jscmpPath,
                        errorType: "run",
                        shouldStop: stopOnTestFail,
                        error,
                        tests_infos,
                        failedTestPath,
                        stopMessage: "Stopping due to test failure"
                    });
                    handleTestFailure({
                        jscmpPath,
                        errorType: "lexing",
                        shouldStop: stopOnLexerCrash,
                        error,
                        tests_infos,
                        failedTestPath,
                        stopMessage: "Stopping due to lexer crash"
                    });
                    handleTestFailure({
                        jscmpPath,
                        errorType: "compilation",
                        shouldStop: stopOnLexerCrash,
                        error,
                        tests_infos,
                        failedTestPath,
                        stopMessage: "Stopping due to lexer crash"
                    });
                }
                await fs.promises.rm(path.dirname(tests_infos[0]), { recursive: true, force: true });
            }));
            cluster = []
        }
    }
    if (exportAll) {
        fs.writeFileSync(`./results.csv`, resultsCsv, 'utf8');
        const zipCommand = `zip -r ./${directory_export}.zip ./${directory_export}`;
        execSync(zipCommand, { stdio: 'inherit' });
        console.log(`Exported tests and results to ${directory_export}.zip and ./results.csv`);
    }
    console.log(`\nTotal tests: ${totalTests}`);
    console.log(`Passed tests: ${passedTests}`);
    if (passedTests !== totalTests) {
        console.error(`Failed tests: ${totalTests - passedTests}`);
        process.exit(1);
    } else {
        console.log("All tests passed!");
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
        .option('--export-all', 'Export all tests ES5 tests to zip file + csv file for results', false)
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
        await runJsCmpTests(es5tests, options.stopOnLexerCrash, options.stopOnTestCrash, options.stopOnTestFail, options.jscmpPath, options.exportAll);
    }
}
main();