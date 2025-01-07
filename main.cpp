#include "includes/Tests.hpp"

int main() {
    Tests dirs;

    dirs.getTestsTree();
    dirs.toggleSelection("built-ins", true);
    dirs.printTestsTree();
    dirs.runNodeTests();
    return 0;
}
