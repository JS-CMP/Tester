import fs from 'fs';
import { execSync } from 'child_process';
import { getTests } from './get.js';
import { execCmd, runCommand } from './helper.js';
import os from 'os';
import { program } from 'commander';

function runNodeTests(tests) {
    console.log("Node tests");
    const harness = "test262-harness --hostType=node --hostPath=node --hostArgs=\"--use-strict\" -t 11";
    const testPaths = tests.join(' ');
    const command = `${harness} ${testPaths}`;
    console.log("Running tests...");
    execSync(command, { stdio: 'inherit' });
}

async function runJsCmpTests(tests) {
    let totalTests = tests.length;
    let passedTests = 0;
    const harness = "./js_cmp";
    console.log("JsCmp tests");
    console.log("Running tests...");

    let cluster = []
    for (const test of tests) {
        cluster.push(test);
        if (cluster.length === os.cpus().length) {
            await Promise.all(cluster.map(async function(test) {
                try {
                    await runCommand(`${harness} ${test} -o ${test.replace('.js', '.out')}`, "compilation");
                    await runCommand(`./${test.replace('.js', '.out')}`, "run");
                    passedTests++;
                    console.log(`PASSED: ${test}`);
                } catch (error) {
                    if (!error.message) {
                        error.message = "lexing"
                    }
                    console.log(`FAILED: ${error.message} of ${test}`);
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
        await runJsCmpTests(es5tests);
    }
}
main();