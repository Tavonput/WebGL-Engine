# WebGL-Engine
WebGL Rendering Engine. Renders using deferred shading into a ping-pong based post-processing pipeline.

## Get Started
Clone the repository, then open a terminal in the root directory of the repository (the directory that has main.html). Run `python -m http.server`.

## Project Structure
`Assets/` is where the assets are.

`Src/` is the source directory.

`Src/Core/` contains the fundamental types and structures used to create the renderer.

`Src/Math/` contains all of the math stuff.

`Src/Shaders` contains all of the shader source code. Shaders are grouped into classes for organization. Some shaders will have defines, so the defines will be in the shader source code and copied as static class fields for access on the javascript side.
