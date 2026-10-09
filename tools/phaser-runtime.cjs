// A Phaser custom entry, following https://github.com/phaserjs/custom-build.
// Game owns its simulation and Web Audio mixer, so neither physics engine nor
// Phaser's sound manager is needed. Keep both renderers and every used factory.
require('phaser/src/events/EventEmitter');
const runtime = {
  ...require('phaser/src/const'),
  Game: require('phaser/src/core/Game'),
  Scene: require('phaser/src/scene/Scene'),
  Scale: {
    ...require('phaser/src/scale/const/CENTER_CONST'),
    ...require('phaser/src/scale/const/SCALE_MODE_CONST'),
  },
  Scenes: {Events: require('phaser/src/scene/events')},
  Math: {
    Between: require('phaser/src/math/Between'),
    Clamp: require('phaser/src/math/Clamp'),
    Angle: {Wrap: require('phaser/src/math/angle/Wrap')},
  },
  GameObjects: {
    Sprite: require('phaser/src/gameobjects/sprite/Sprite'),
  },
};

require('phaser/src/cameras/2d/CameraManager');
require('phaser/src/gameobjects/DisplayList');
require('phaser/src/gameobjects/UpdateList');
require('phaser/src/gameobjects/GameObjectCreator');
require('phaser/src/gameobjects/GameObjectFactory');
require('phaser/src/scene/ScenePlugin');
require('phaser/src/data/DataManagerPlugin');
require('phaser/src/input/InputPlugin');
require('phaser/src/loader/LoaderPlugin');
require('phaser/src/loader/filetypes/ImageFile');
require('phaser/src/time/Clock');
require('phaser/src/tweens/TweenManager');
require('phaser/src/gameobjects/container/ContainerFactory');
require('phaser/src/gameobjects/graphics/GraphicsFactory');
require('phaser/src/gameobjects/graphics/GraphicsCreator');
require('phaser/src/gameobjects/image/ImageFactory');
require('phaser/src/gameobjects/nineslice/NineSliceFactory');
require('phaser/src/gameobjects/shape/rectangle/RectangleFactory');
require('phaser/src/gameobjects/sprite/SpriteFactory');
require('phaser/src/gameobjects/text/TextFactory');
require('phaser/src/gameobjects/tilesprite/TileSpriteFactory');
require('phaser/src/gameobjects/zone/ZoneFactory');

// LightsPlugin is the sole default plugin not used by this game's own lights.
const defaults = require('phaser/src/plugins/DefaultPlugins');
defaults.DefaultScene = defaults.DefaultScene.filter(name => name !== 'LightsPlugin');
module.exports = runtime;
