//
// Created by Simon BANDIERA on 02/01/2025.
//

#ifndef TESTER_DIRTREE_HPP
#define TESTER_DIRTREE_HPP

#include <iostream>

class DirTree {
public:
    DirTree(std::string name, bool selected) : name(std::move(name)), selected(selected) {}
    ~DirTree() = default;

    void addChild(const DirTree& child);

    void toggleSelection(bool select);
    void print(const std::string& prefix = "") const;
    void traverseAndToggle(const std::string& target, bool select);

    [[nodiscard]] std::vector<DirTree> & getChildren() { return children; }
    [[nodiscard]] const std::string& getName() const { return name; }
    [[nodiscard]] bool isSelected() const { return selected; }
private:
    std::string name;
    bool selected = false;
    std::vector<DirTree> children;
};

#endif //TESTER_DIRTREE_HPP
