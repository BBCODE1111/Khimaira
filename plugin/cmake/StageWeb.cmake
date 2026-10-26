# Copies the website (../dist) plus the plugin bridge into a folder and zips it.
# Invoked at build time:  cmake -DDIST=... -DBRIDGE=... -DFONTS=... -DSTAGE=... -DOUT=... -P StageWeb.cmake
file(REMOVE_RECURSE "${STAGE}")
file(MAKE_DIRECTORY "${STAGE}/plugin/fonts")

# The website's own piano samples are not needed in the web view: the plugin plays them natively.
file(GLOB_RECURSE site RELATIVE "${DIST}" "${DIST}/*")
foreach(f IN LISTS site)
    if(f MATCHES "^audio/" OR f MATCHES "(^|/)\\.DS_Store$")
        continue()
    endif()
    get_filename_component(dir "${STAGE}/${f}" DIRECTORY)
    file(COPY "${DIST}/${f}" DESTINATION "${dir}")
endforeach()

file(GLOB bridge "${BRIDGE}/*")
file(COPY ${bridge} DESTINATION "${STAGE}/plugin")

foreach(font Cinzel.ttf DMSans.ttf)
    if(FONTS AND EXISTS "${FONTS}/${font}")
        file(COPY "${FONTS}/${font}" DESTINATION "${STAGE}/plugin/fonts")
    endif()
endforeach()

file(GLOB_RECURSE staged RELATIVE "${STAGE}" "${STAGE}/*")
list(SORT staged)
file(REMOVE "${OUT}")
execute_process(COMMAND "${CMAKE_COMMAND}" -E tar cf "${OUT}" --format=zip ${staged}
                WORKING_DIRECTORY "${STAGE}" RESULT_VARIABLE rc)
if(NOT rc EQUAL 0)
    message(FATAL_ERROR "Could not create ${OUT}")
endif()
