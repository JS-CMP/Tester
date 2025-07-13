# Tester

A JavaScript test runner for ES5/ES6+ conformance, supporting both Node.js and a custom JS compiler (`js_cmp`). Designed to run and manage test suites, including [test262](https://github.com/tc39/test262).

## Features

- Runs tests using Node.js with [test262-harness](https://github.com/bterlson/test262-harness)
- Runs tests using a custom JS compiler (`js_cmp`)
- Parallel test execution based on CPU cores
- Command-line interface with flexible options

## Installation

1. Install dependencies:
   ```sh
   npm install
   ```
2. Ensure `test262-harness` is installed globally if you want to run Node.js tests:
   ```sh
   npm install -g test262-harness
   ```
3. Place your `js_cmp` executable in the project root.

## Usage

Run the test runner with:

```sh
npm run dev [options] [path]
```

Or directly:

```sh
node src/main.js [options] [path]
```

You can also put JS code in the harness file in the `src` directory, which will be compiled and run with each test.

### Options

- `-n, --node` &nbsp;&nbsp;&nbsp;&nbsp;Run only Node.js tests
- `-j, --jscmp` &nbsp;&nbsp;&nbsp;&nbsp;Run only JsCmp tests
- `--jscmp-path <path>` &nbsp;&nbsp;&nbsp;&nbsp;Path to JsCmp executable (default: `./js_cmp`)
- `-e` &nbsp;&nbsp;&nbsp;&nbsp;Recheck test edition even if `es5tests.js` exists
- `--stop-on-lexer-crash` &nbsp;&nbsp;&nbsp;&nbsp;If a crash occurs while testing, stop the runner and save the temp file to the failed_tests folder, only work for JSCMP
- `--stop-on-test-crash` &nbsp;&nbsp;&nbsp;&nbsp;If a test crash, stop the runner and save the temp file to the failed_tests folder, only work for JSCMP
- `--stop-on-test-fail` &nbsp;&nbsp;&nbsp;&nbsp;If a test fails, stop the runner and save the temp file to the failed_tests folder, only work for JSCMP

### Arguments

- `[path]` &nbsp;&nbsp;&nbsp;&nbsp;Path to directory or file to run tests on (default: `./test262`)

### Example

```sh
node src/main.js --jscmp-path ./js_cmp -j ../test262/test
```
### Test262 version

Currently the latest commit tested that work with this runner is `f0dc15c6c7ec095ba3caf3acc0f8665394665841`, the latest commit as July 2025.