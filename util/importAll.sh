#!/bin/sh
# Re-import all the schemas.
# This presumes the glTF repo is at the same level as the gltf-vscode repo.
echo "~~~ glTF 1.0 ~~~"
./importSchema.js -i ../../glTF/specification/1.0/schema -o ../schemas/gltf-1.0
echo "~~~ glTF 2.0 ~~~"
./importSchema.js -i ../../glTF/specification/2.0/schema -o ../schemas/gltf-2.0 --extensions
echo "~~~ KHR_draco_mesh_compression ~~~"
./importSchema.js -i ../../glTF/extensions/2.0/Khronos/KHR_draco_mesh_compression/schema  /schema -o ../schemas/gltf-2.0/extensions/KHR_draco_mesh_compression
echo "~~~ KHR_materials_pbrSpecularGlossiness ~~~"
./importSchema.js -i ../../glTF/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness/schema  /schema -o ../schemas/gltf-2.0/extensions/KHR_materials_pbrSpecularGlossiness
echo "~~~ KHR_materials_unlit ~~~"
./importSchema.js -i ../../glTF/extensions/2.0/Khronos/KHR_materials_unlit/schema  /schema -o ../schemas/gltf-2.0/extensions/KHR_materials_unlit
echo "~~~ KHR_techniques_webgl ~~~"
./importSchema.js -i ../../glTF/extensions/2.0/Khronos/KHR_techniques_webgl/schema  /schema -o ../schemas/gltf-2.0/extensions/KHR_techniques_webgl
echo "~~~ KHR_texture_transform ~~~"
./importSchema.js -i ../../glTF/extensions/2.0/Khronos/KHR_texture_transform/schema  /schema -o ../schemas/gltf-2.0/extensions/KHR_texture_transform
