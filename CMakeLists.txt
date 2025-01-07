cmake_minimum_required(VERSION 3.22)
project(Tester)

set(CMAKE_CXX_STANDARD 23)

file(GLOB_RECURSE SOURCES
        "src/*.cpp"
        "src/**/*.cpp"
        "src/*.hpp"
        "src/**/*.hpp"
)

add_executable(${PROJECT_NAME} main.cpp ${SOURCES})