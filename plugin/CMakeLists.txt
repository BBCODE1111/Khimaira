cmake_minimum_required(VERSION 3.22)

set(CMAKE_OSX_DEPLOYMENT_TARGET "10.15" CACHE STRING "Minimum macOS version")
project(KHIMAIRA_PLUGIN VERSION 1.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ---- JUCE ------------------------------------------------------------------
# Pass -DJUCE_DIR=/path/to/JUCE to use a local checkout; otherwise it is downloaded.
set(JUCE_DIR "" CACHE PATH "Local JUCE checkout (optional)")
if(JUCE_DIR)
    add_subdirectory("${JUCE_DIR}" "${CMAKE_BINARY_DIR}/JUCE")
else()
    include(FetchContent)
    FetchContent_Declare(JUCE
        GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
        GIT_TAG 8.0.15
        GIT_SHALLOW TRUE)
    FetchContent_MakeAvailable(JUCE)
endif()

# ---- Plugin ------------------------------------------------------------------
set(KHIMAIRA_FORMATS VST3 Standalone)
if(APPLE)
    list(APPEND KHIMAIRA_FORMATS AU)
endif()

juce_add_plugin(Khimaira
    COMPANY_NAME "KHIMAIRA"
    COMPANY_WEBSITE "https://bbcode1111.github.io/Khimaira/"
    PRODUCT_NAME "KHIMAIRA 1.1"
    PLUGIN_NAME "KHIMAIRA 1.1"
    BUNDLE_ID "com.khimaira.plugin"
    VERSION ${PROJECT_VERSION}
    DESCRIPTION "Morph your chords like the legendary monster"
    PLUGIN_MANUFACTURER_CODE Khmr
    PLUGIN_CODE Khm1
    FORMATS ${KHIMAIRA_FORMATS}
    IS_SYNTH TRUE
    NEEDS_MIDI_INPUT TRUE
    NEEDS_MIDI_OUTPUT TRUE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS TRUE
    VST3_CATEGORIES Instrument Generator
    AU_MAIN_TYPE kAudioUnitType_MusicDevice
    HARDENED_RUNTIME_ENABLED TRUE
    NEEDS_WEBVIEW2 TRUE
    COPY_PLUGIN_AFTER_BUILD FALSE)

juce_generate_juce_header(Khimaira)

target_sources(Khimaira PRIVATE
    Source/PluginProcessor.cpp
    Source/PluginEditor.cpp
    Source/PianoSampler.cpp)

# ---- Embedded website + piano samples ---------------------------------------
set(KHIMAIRA_DIST "${CMAKE_CURRENT_SOURCE_DIR}/../dist" CACHE PATH "Website folder")
set(KHIMAIRA_FONTS "${KHIMAIRA_DIST}/fonts" CACHE PATH "Optional folder with Cinzel.ttf / DMSans.ttf")
set(WEB_STAGE "${CMAKE_BINARY_DIR}/webstage")
set(WEB_ZIP "${CMAKE_BINARY_DIR}/web.zip")

file(GLOB_RECURSE KHIMAIRA_WEB_INPUTS CONFIGURE_DEPENDS
    "${KHIMAIRA_DIST}/*.html" "${KHIMAIRA_DIST}/*.js" "${KHIMAIRA_DIST}/*.css"
    "${KHIMAIRA_DIST}/*.webp" "${KHIMAIRA_DIST}/*.ttf" "${KHIMAIRA_DIST}/*.txt" "${KHIMAIRA_DIST}/*.png" "${KHIMAIRA_DIST}/*.svg" "${CMAKE_CURRENT_SOURCE_DIR}/web/*")
file(GLOB KHIMAIRA_SAMPLES CONFIGURE_DEPENDS "${KHIMAIRA_DIST}/audio/*.mp3")

if(NOT KHIMAIRA_SAMPLES)
    message(FATAL_ERROR "Piano samples not found in ${KHIMAIRA_DIST}/audio")
endif()

add_custom_command(OUTPUT "${WEB_ZIP}"
    COMMAND "${CMAKE_COMMAND}"
        -DDIST=${KHIMAIRA_DIST}
        -DBRIDGE=${CMAKE_CURRENT_SOURCE_DIR}/web
        -DFONTS=${KHIMAIRA_FONTS}
        -DSTAGE=${WEB_STAGE}
        -DOUT=${WEB_ZIP}
        -P "${CMAKE_CURRENT_SOURCE_DIR}/cmake/StageWeb.cmake"
    DEPENDS ${KHIMAIRA_WEB_INPUTS} "${CMAKE_CURRENT_SOURCE_DIR}/cmake/StageWeb.cmake"
    COMMENT "Packing KHIMAIRA web UI")

juce_add_binary_data(KhimairaData SOURCES "${WEB_ZIP}" ${KHIMAIRA_SAMPLES})

target_compile_definitions(Khimaira PUBLIC
    JUCE_WEB_BROWSER=1
    JUCE_USE_CURL=0
    JUCE_USE_MP3AUDIOFORMAT=1
    JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1
    JUCE_VST3_CAN_REPLACE_VST2=0
    JUCE_DISPLAY_SPLASH_SCREEN=0
    JUCE_REPORT_APP_USAGE=0)

target_link_libraries(Khimaira
    PRIVATE
        KhimairaData
        juce::juce_audio_utils
        juce::juce_audio_formats
        juce::juce_gui_extra
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags)

# ---- Tests (pure C++ scheduler, no JUCE) --------------------------------------
option(KHIMAIRA_BUILD_TESTS "Build scheduler unit tests" ON)
if(KHIMAIRA_BUILD_TESTS)
    add_executable(khimaira_tests tests/pattern_player_test.cpp)
    target_include_directories(khimaira_tests PRIVATE Source)
    enable_testing()
    add_test(NAME scheduler COMMAND khimaira_tests)
endif()

if(KHIMAIRA_BUILD_TESTS)
    add_executable(khimaira_pedal_tests tests/pedal_player_test.cpp)
    add_test(NAME pedal COMMAND khimaira_pedal_tests)
endif()

if(KHIMAIRA_BUILD_TESTS)
    juce_add_console_app(khimaira_processor_tests PRODUCT_NAME "KHIMAIRA Processor Tests")
    target_sources(khimaira_processor_tests PRIVATE tests/processor_test.cpp)
    target_include_directories(khimaira_processor_tests PRIVATE Source "${CMAKE_BINARY_DIR}/Khimaira_artefacts/JuceLibraryCode")
    target_compile_definitions(khimaira_processor_tests PRIVATE JUCE_MODAL_LOOPS_PERMITTED=1 JUCE_WEB_BROWSER=1 JUCE_USE_CURL=0)
    target_link_libraries(khimaira_processor_tests PRIVATE Khimaira KhimairaData juce::juce_audio_utils juce::juce_gui_extra)
    add_test(NAME processor COMMAND khimaira_processor_tests)
endif()
