//
// Created by Simon BANDIERA on 02/01/2025.
//

#ifndef TESTER_TESTS_HPP
#define TESTER_TESTS_HPP

#include <filesystem>
#include "DirTree.hpp"

class Tests {
public:
    Tests(std::string pathToTest = "./test262/test", std::string pathToJSCmp = "./js_cmp");
    ~Tests() = default;

    void getTestsTree();
    void toggleSelection(const std::string& target, bool select);
    void printTestsTree() const;
    void runNodeTests();
    void recursiveRunTests(DirTree node, const std::string& runner);
private:
    DirTree* tests;
    std::string pathToTest;
    std::string pathToJSCmp;
};


#endif //TESTER_TESTS_HPP
