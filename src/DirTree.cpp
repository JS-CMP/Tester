#include "../includes/DirTree.hpp"

void DirTree::toggleSelection(bool select) {
    selected = select;
    for (auto& child : children) {
        child.toggleSelection(select);
    }
}

void DirTree::print(const std::string &prefix) const  {
    std::cout << prefix << (selected ? "[X] " : "[ ] ") << name.substr(name.find_last_of("/") + 1) << "\n";
    for (const auto& child : children) {
        child.print(prefix + "    ");
    }
}

void DirTree::traverseAndToggle(const std::string &target, bool select) {
    auto dirName = name.substr(name.find_last_of("/") + 1);
    if (dirName == target) {
        toggleSelection(select);
        return;
    }
    for (auto& child : children) {
        child.traverseAndToggle(target, select);
    }
}

void DirTree::addChild(const DirTree &child) {
    children.push_back(child);
}

