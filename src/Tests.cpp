//
// Created by Simon BANDIERA on 02/01/2025.
//

#include "../includes/Tests.hpp"

Tests::Tests(std::string pathToTest, std::string pathToJSCmp) {
    this->pathToTest = std::move(pathToTest);
    this->pathToJSCmp = std::move(pathToJSCmp);
    this->tests = new DirTree("root", false);
}

void Tests::getTestsTree() {
    for (const auto & entry :  std::filesystem::directory_iterator(pathToTest)) {
        auto child = DirTree(entry.path().string(), false);
        if (entry.is_directory()) {
            for (const auto & file : std::filesystem::directory_iterator(entry.path())) {
                if (file.is_directory()) {
                    child.addChild(DirTree(file.path().string(), false));
                }
            }
        }
        tests->addChild(child);
    }
}

void Tests::toggleSelection(const std::string &target, bool select) {
    tests->traverseAndToggle(target, select);
}

void Tests::printTestsTree() const {
    tests->print();
}

void Tests::runNodeTests() {
    recursiveRunTests(*tests, "test262-harness --hostType=node --hostPath=node");
}

void Tests::recursiveRunTests(DirTree node, const std::string& runner) {
    for (const auto & child : node.getChildren()) {
        if (child.isSelected()) {
            std::string command = runner + " " + child.getName() + "/**/*.js";
            std::cout << "Running: " << command << std::endl;
            system(command.c_str());
        }
        recursiveRunTests(child, runner);
    }
}